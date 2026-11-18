# smart-voca 아키텍처 설계서

**파일 위치**: `docs/smart_voca_Architecture_Design_v1.0_261118.md` (승인 후 복제)
**작성일**: 2026-11-18
**버전**: v0.1 (검토용 초안)
**설명**: smart-voca의 구성 요소, 파일 배치, 의존 방향, 실행·배포 구조를 정의한다.

---

## 1. 구조 요약

- 서버가 없는 **단일 페이지 정적 웹앱**이다. (ADR-001, ADR-003)
- 실행 환경은 사용자의 브라우저 하나이다.
- 저장은 브라우저 localStorage만 사용한다. (ADR-002)
- 퀴즈 로직은 화면과 분리해서, 브라우저 없이 Node에서 테스트할 수 있게 한다.

## 2. 구성 요소 (컴포넌트)

```
┌──────────────────────────── 브라우저 ────────────────────────────┐
│                                                                  │
│  index.html (화면 마크업, 스타일)                                  │
│      │                                                           │
│      ▼                                                           │
│  app.js (화면 제어: 이벤트, DOM 갱신, 저장 호출)                    │
│      │                  │                       │                │
│      ▼                  ▼                       ▼                │
│  quiz.js           storage.js              words.js              │
│  (세션·출제 로직)   (localStorage 접근)      (단어 데이터)          │
│      │                  │                                        │
│      │                  ▼                                        │
│      │          localStorage                                     │
│      │          ├ smartVoca.stats                                 │
│      │          └ smartVoca.session                               │
└──────┴───────────────────────────────────────────────────────────┘
```

| 컴포넌트 | 파일 | 책임 | 외부 의존 |
| :--- | :--- | :--- | :--- |
| 화면 마크업 | `vocab-quiz/index.html` | 레이아웃, 스타일, 스크립트 로드 순서 | 없음 |
| 화면 제어 | `vocab-quiz/js/app.js` | 이벤트 처리, DOM 갱신, 저장 시점 결정 | quiz.js, storage.js, DOM |
| 퀴즈 로직 | `vocab-quiz/js/quiz.js` | 출제, 재출제, 선택지, 정오 판정, 상태 내보내기·복원 | 없음 (순수 로직) |
| 저장소 어댑터 | `vocab-quiz/js/storage.js` (신규) | localStorage 읽기·쓰기, 손상 판정 | localStorage |
| 단어 데이터 | `vocab-quiz/js/words.js` | 단어·뜻·예문 상수 | 없음 |

## 3. 의존 방향 규칙

1. `quiz.js`는 `app.js`, `storage.js`, DOM을 참조하지 않는다. (NFR-09)
2. `words.js`는 다른 모듈을 참조하지 않는다.
3. `app.js`만 DOM과 저장소를 호출한다.
4. `storage.js`는 저장 형식(키 이름, JSON 구조)만 알고, 퀴즈 규칙은 모른다.

## 4. 스크립트 로드 방식

- 빌드 도구 없이 `<script>` 태그로 순서대로 불러온다.
- 로드 순서: `words.js` → `quiz.js` → `storage.js` → `app.js`
- 각 모듈은 전역 객체(`VOCAB_WORDS`, `VocabQuiz`, `VocabStorage`)를 하나씩 만든다.
- Node 테스트를 위해 각 모듈은 `module.exports`가 있을 때 내보내기도 한다. (기존 방식 유지)

## 5. 실행 및 배포 구조

| 항목 | 내용 |
| :--- | :--- |
| 개발 실행 | `vocab-quiz/index.html`을 브라우저로 연다. 별도 서버는 필요 없다. |
| 테스트 실행 | `node --test vocab-quiz/test/` (Node 18 이상) |
| 배포 | GitHub Pages. 배포 대상 폴더는 `vocab-quiz/`이다. (ADR-003) |
| 배포 주소 | 미정. 저장소 설정 후 확정하여 기록한다. |
| 빌드 | 없음 |

## 6. 파일 구조 (목표)

```
smart-voca/
├── docs/                              승인된 산출물
├── ai-agent/claude/                   작업 문서, 진행 일지
└── vocab-quiz/
    ├── index.html                     화면
    ├── js/
    │   ├── words.js                   단어 데이터 (변경 없음)
    │   ├── quiz.js                    퀴즈 로직 (상태 내보내기·복원 추가)
    │   ├── storage.js                 저장소 어댑터 (신규)
    │   └── app.js                     화면 제어 (저장·복원 호출 추가)
    └── test/
        ├── quiz.test.js               퀴즈 로직 테스트
        └── storage.test.js            저장소 테스트 (신규)
```

## 7. 품질 속성

| 속성 | 목표 | 근거 |
| :--- | :--- | :--- |
| 테스트 가능성 | 퀴즈 로직을 DOM 없이 테스트 | NFR-08, NFR-09 |
| 이식성 | 파일을 복사하면 어디서나 열림 | NFR-01 |
| 안전성 | 저장 데이터 손상 시 앱이 멈추지 않음 | FR-27 |
| 보안 | 예문과 뜻을 HTML로 해석하지 않음 | NFR-06 |

## 8. 제한과 위험

- localStorage 용량(보통 5MB 이상)은 64개 단어 규모에서 문제가 되지 않는다.
- 같은 브라우저 프로필에서만 기록이 공유된다. (기기 간 동기화 없음)
- 브라우저 저장소를 지우면 기록이 사라진다. (기획 12장에 기재됨)
