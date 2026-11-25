# smart-voca 데이터 설계서

**파일 위치**: `docs/smart_voca_Data_Design_v1.0_261118.md` (승인 후 복제)
**작성일**: 2026-11-18
**버전**: v0.1 (검토용 초안)
**설명**: 단어 데이터, 학습 기록, 진행 세션 상태의 구조와 저장 키, 검증 규칙을 정의한다.

---

## 1. 데이터 저장소 개요

| 저장소 | 종류 | 수명 | 내용 |
| :--- | :--- | :--- | :--- |
| `VOCAB_WORDS` | JavaScript 상수 (`words.js`) | 코드와 함께 | 단어 64개와 뜻·예문 |
| `smartVoca.stats` | localStorage | 사용자가 지울 때까지 | 단어별 누적 정오 횟수 |
| `smartVoca.session` | localStorage | 세션 완료 시 삭제 | 진행 중 세션 상태 |

## 2. 단어 데이터 (`VOCAB_WORDS`)

### 2.1 구조

| 필드 | 타입 | 필수 | 제약 |
| :--- | :--- | :---: | :--- |
| `word` | string | ○ | 영어 단어. 전체에서 유일해야 한다. 저장 키로 쓴다. |
| `meaning` | string | ○ | 쉼표(`,`)로 구분된 뜻. 예: `'분명한, 명백한'`. 전체에서 문자열이 유일해야 한다. |
| `examples` | string[] | ○ | 2개 이상. 각 예문에 `word`(굴절형 포함)가 들어 있어야 한다. |

### 2.2 뜻 분리 규칙 (`senseList`)

- 쉼표로 나눈 뒤 앞뒤 공백을 지우고, 빈 값은 버린다.
- 예: `'분명한, 명백한'` → `['분명한', '명백한']`
- 이 목록은 오답 후보 제외 판정에만 쓴다. 데이터 자체는 문자열로 둔다. (ADR-005)

### 2.3 검증 규칙 (시작 시)

| 규칙 | 실패 시 |
| :--- | :--- |
| 단어 수 ≥ 선택지 수(4) | 오류 "단어는 최소 4개 필요합니다." |
| 각 단어에 `word`, `meaning`이 있음 | 오류 |
| 각 단어의 예문 ≥ 2개 | 오류 "예문은 최소 2개 필요합니다." |
| `meaning` 문자열 중복 없음 | 오류 "뜻이 중복됩니다" |
| 각 단어의 오답 후보 ≥ 선택지 수 − 1 (뜻 겹침 제외 후) | 오류 "오답 후보가 부족합니다" |

> 검증 실패는 개발자가 `words.js`를 고쳐야 하는 상황이다. 사용자 화면에서는 오류 메시지를 보여준다.

## 3. 학습 기록 (`smartVoca.stats`)

### 3.1 구조

```json
{
  "version": 1,
  "words": {
    "abandon": { "correct": 3, "wrong": 1 },
    "achieve": { "correct": 2, "wrong": 0 }
  }
}
```

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `version` | number | 저장 형식 버전. 현재 1. |
| `words` | object | 키는 단어 문자열, 값은 `{ correct, wrong }` |
| `correct` | integer ≥ 0 | 정답 누적 횟수 |
| `wrong` | integer ≥ 0 | 오답 누적 횟수 |

### 3.2 갱신 규칙

- 답변할 때마다 해당 단어의 `correct` 또는 `wrong`을 1 올린다. (재출제 답변도 포함)
- 단어가 `words`에 없으면 `{ correct: 0, wrong: 0 }`으로 만든 뒤 올린다.

## 4. 진행 세션 상태 (`smartVoca.session`)

### 4.1 구조

```json
{
  "version": 1,
  "issued": 14,
  "answered": 13,
  "firstTryCorrect": 9,
  "shortGapRetries": 0,
  "newQueue": ["acquire", "adequate"],
  "retryQueue": [{ "word": "alter", "dueAfter": 17 }],
  "firstAsked": ["abandon", "achieve"],
  "shownExamples": { "abandon": [0], "alter": [1] },
  "pending": {
    "word": "ambiguous",
    "example": 0,
    "options": ["모호한, 애매한", "분석하다", "바꾸다, 변경하다", "성취하다, 달성하다"],
    "correctIndex": 0,
    "isRetry": false,
    "number": 14
  },
  "savedAt": "2026-11-18T10:00:00+09:00"
}
```

| 필드 | 타입 | 설명 |
| :--- | :--- | :--- |
| `version` | number | 현재 1 |
| `issued` | integer ≥ 0 | 지금까지 출제한 문제 수 |
| `answered` | integer ≥ 0 | 답한 문제 수 |
| `firstTryCorrect` | integer ≥ 0 | 단어별 첫 출제에서 맞힌 수 |
| `shortGapRetries` | integer ≥ 0 | 8문제 간격을 못 채우고 나온 재출제 수 |
| `newQueue` | string[] | 아직 처음 내지 않은 단어 (출제 순서대로) |
| `retryQueue` | object[] | 재출제 대기. `dueAfter`는 `issued`가 이 값 이상이 되면 출제 가능 |
| `firstAsked` | string[] | 첫 출제를 마친 단어 |
| `shownExamples` | object | 단어별로 이미 보여준 예문 번호 |
| `pending` | object \| null | 답을 기다리는 문제. 없으면 `null` |
| `savedAt` | string | 저장 시각 (ISO 8601). 진단용 |

### 4.2 `pending` 규칙

- 문제를 낼 때마다 `pending`을 저장한다. 새로고침 후에도 같은 문제를 같은 보기로 다시 보여준다.
- 답하면 `pending`을 `null`로 바꾸고, 답 결과를 반영한 상태를 저장한다.
- 이렇게 하면 문제를 보고 새로고침해도 그 단어가 사라지지 않는다.

### 4.3 손상 판정 (FR-27)

세션 상태는 아래를 모두 만족해야 유효하다. 하나라도 어기면 손상으로 본다.

1. JSON 파싱이 된다.
2. `version === 1`
3. 숫자 필드(`issued`, `answered`, `firstTryCorrect`, `shortGapRetries`)가 0 이상의 정수이다.
4. `newQueue`, `retryQueue`, `firstAsked`의 모든 단어가 현재 `VOCAB_WORDS`에 있다.
5. `newQueue`와 `retryQueue`의 단어가 겹치지 않는다. (단, 재출제 대기 단어는 신규 큐에 없어야 한다)
6. `pending`이 `null`이면 `retryQueue`와 `newQueue`가 모두 빈 상태일 수 있다. `pending`이 있으면 `word`가 현재 단어 목록에 있고, `options` 길이가 4이고, `correctIndex`가 0~3이다.

손상 판정 시 동작:
- `smartVoca.session`을 지운다.
- 새 세션을 시작한다.
- 화면 상단에 "이전 진행 상태를 읽을 수 없어 새로 시작했습니다."를 표시한다.
- 누적 기록(`smartVoca.stats`)은 건드리지 않는다.

`smartVoca.stats`가 손상된 경우도 같은 방식으로 처리한다. 이 경우 누적 기록은 비운 뒤 새로 쌓는다.

## 5. 개인정보 (FR-28)

- 저장하는 값은 영어 단어 문자열, 숫자, 예문 번호, 보기 문자열뿐이다.
- 이름, 연락처, 식별자, 쿠키 기반 ID는 저장하지 않는다.
- 외부 전송은 하지 않는다. (NFR-07)

## 6. 키 이름 규칙

| 키 | 용도 |
| :--- | :--- |
| `smartVoca.stats` | 누적 기록 |
| `smartVoca.session` | 진행 세션 |

키 이름의 버전은 값 안의 `version` 필드로 관리한다. 키 이름은 바꾸지 않는다.

## 7. 용량 추정

- 단어 64개 × 누적 기록 한 항목 약 40바이트 → 약 3KB
- 세션 상태 최대 크기는 64개 단어 기준 수 KB 이내
- localStorage 한도(보통 5MB) 대비 충분하다.
