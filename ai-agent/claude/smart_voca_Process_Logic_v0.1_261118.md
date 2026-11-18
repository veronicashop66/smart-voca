# smart-voca 프로세스 설계서

**파일 위치**: `docs/smart_voca_Process_Logic_v1.0_261118.md` (승인 후 복제)
**작성일**: 2026-11-18
**버전**: v0.1 (검토용 초안)
**설명**: 퀴즈 출제·재출제·정오 판정·저장·복원의 단계별 처리 흐름과 알고리즘을 정의한다.

---

## 1. 용어

| 용어 | 뜻 |
| :--- | :--- |
| 신규 문제 | 처음 출제되는 단어의 문제 |
| 재출제 문제 | 틀린 적이 있는 단어가 다시 나온 문제 |
| `issued` | 지금까지 출제한 문제 수 (번호로 쓴다) |
| `dueAfter` | 재출제 대기 항목이 출제 가능해지는 `issued` 값 |

## 2. 앱 시작 (FR-24, FR-27)

```
시작
 ├─ 1. 단어 데이터 검증 (실패하면 오류 화면)
 ├─ 2. smartVoca.stats 읽기
 │      └─ 손상 → 누적 기록 비우기, 알림 표시 예약
 ├─ 3. smartVoca.session 읽기
 │      ├─ 없음 → 새 세션 시작
 │      ├─ 손상 → 세션 키 삭제, 새 세션 시작, 알림 표시
 │      └─ 정상 → 세션 복원 (4번)
 ├─ 4. 복원
 │      ├─ 세션이 이미 완료 상태(큐 비고 pending 없음) → 세션 키 삭제, 새 세션 시작
 │      └─ 정상 → pending이 있으면 같은 문제 표시, 없으면 다음 문제 출제
 └─ 5. 화면 갱신
```

## 3. 문제 출제 (FR-04 ~ FR-08, FR-14, FR-17)

### 3.1 다음 문제 선택 (우선순위: 재출제 → 신규 → 예정된 재출제)

```
next():
  due = retryQueue 중 dueAfter ≤ issued 인 항목
  if due 가 있음:
      picked = due 중 무작위 1개
      retryQueue 에서 제거
      isRetry = true
  else if newQueue 가 있음:
      word = newQueue 의 첫 항목 (섞인 순서)
      isRetry = false
  else if retryQueue 가 있음:
      picked = dueAfter 가 가장 작은 항목      ← 간격을 못 채우는 예외 (FR-17)
      retryQueue 에서 제거
      isRetry = true
      shortGapRetries += 1
  else:
      return 완료 (세션 종료)

  issued += 1
  문제 구성 (3절)
  pending 저장
```

### 3.2 문제 구성

1. **예문 선택**: 단어의 예문 중 `shownExamples`에 없는 것을 무작위로 고른다. 모두 보여줬다면 직전에 보여준 예문만 뺀 나머지에서 고른다. (FR-08)
2. **오답 후보**: 다른 단어들의 뜻 중, 정답 뜻과 쉼표 뜻 조각을 하나라도 공유하지 않는 것만 남긴다. (FR-07, ADR-005)
3. **보기 구성**: 오답 후보를 섞어 3개를 고르고, 정답 뜻과 합쳐 4개를 만든다. 4개를 다시 섞는다.
4. **번호와 유형**: 번호는 `issued`, 유형은 신규(`새 단어`) 또는 재출제(`다시 풀기`)이다. (FR-15, FR-18)

## 4. 답변 처리 (FR-09 ~ FR-12, FR-16, FR-20, FR-22)

```
answer(choiceIndex):
  correct = (choiceIndex === pending.correctIndex)
  answered += 1
  if 이 단어가 firstAsked 에 없음:
      firstAsked 추가
      if correct: firstTryCorrect += 1
  if not correct:
      jitter = 무작위 정수 0~4
      retryQueue 에 { word, dueAfter: issued + 8 + jitter } 추가   ← FR-12, FR-13
  누적 기록 갱신 (correct 또는 wrong 1 증가)                       ← FR-22
  pending = null
  저장 (4절)
  화면: 정답 버튼 초록, 선택한 오답 빨강, 정답 뜻 전체 표시      ← FR-09, FR-10
  버튼: 세션이 끝나는 문제면 "결과 보기", 아니면 "다음"          ← FR-11
```

> 맞힌 재출제 항목은 `retryQueue`에 다시 넣지 않는다. 틀릴 때마다 새로 등록하므로 맞힐 때까지 반복된다. (FR-16)

## 5. 세션 완료 (FR-19, FR-20, FR-25)

```
완료 판정: newQueue 가 비고, retryQueue 가 비고, pending 이 null
  → 결과 화면 표시 (총 단어 수, answered, firstTryCorrect)
  → smartVoca.session 삭제                                          ← FR-25
  → smartVoca.stats 는 유지
```

## 6. 저장 시점 (FR-23)

| 시점 | 저장 대상 |
| :--- | :--- |
| 문제를 낼 때 | `smartVoca.session` (pending 포함) |
| 답변할 때 | `smartVoca.stats`, `smartVoca.session` (pending 은 null) |
| 완료할 때 | `smartVoca.session` 삭제 |
| 다시 시작할 때 | `smartVoca.session` 덮어씀 (새 세션) (FR-26) |

저장은 동기 방식(`localStorage.setItem`)으로 한다. 문제가 작아서 비동기가 필요 없다.

## 7. 다시 시작 (FR-21, FR-26)

```
다시 시작 클릭:
  새 세션 생성 (신규 큐 섞기, 나머지 상태 0)
  smartVoca.session 을 새 상태로 덮어씀
  smartVoca.stats 는 유지
  첫 문제 표시
```

## 8. 예외 처리 요약

| 상황 | 처리 |
| :--- | :--- |
| 단어 데이터 검증 실패 | 오류 화면에 메시지 표시, 퀴즈 시작하지 않음 |
| 세션 상태 손상 | 세션 키 삭제, 새 세션, 알림 (FR-27) |
| 누적 기록 손상 | 누적 기록 비우고 새로 쌓음, 알림 |
| 저장 용량 초과 (`QuotaExceededError`) | 저장 실패를 콘솔에 기록하고 퀴즈는 계속 진행. 알림 표시. |
| 세션 상태에 pending 있음 + 같은 단어가 대기열에도 있음 | 손상 판정 규칙 5번으로 막는다. |
| 답변이 없는 상태에서 "다음" 클릭 | 무시한다. (버튼은 답변 후에만 보인다.) |

## 9. 검증 방법 (테스트 정의서와 연결)

- 재출제 간격 8~12, 맞힐 때까지 반복, 예문 중복 없음은 기존 테스트를 유지한다.
- 저장·복원은 `storage.test.js`에서 다음을 확인한다.
  - 상태를 저장한 뒤 복원하면 같은 문제(`pending`)가 나온다.
  - 손상된 JSON, 잘못된 단어, 잘못된 보기 수는 새 세션으로 처리된다.
  - 세션 완료 후 세션 키가 없다.
