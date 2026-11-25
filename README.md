# smart-voca (스마트 보카)

수능 영단어를 등록하고, 날마다 외우고, 시험을 보고, 학습 통계를 확인하는 단어장 웹 앱입니다.

## 실행 방법

요구 환경: Node.js 22.13 이상 (권장 24). 외부 패키지 설치는 필요 없습니다.

```bash
cd app
npm start            # http://localhost:8080
npm test             # 단위 테스트 + API 통합 테스트
```

환경변수 (모두 선택)

| 이름 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `PORT` | `8080` | 서버 포트 |
| `HOST` | `0.0.0.0` | 바인딩 주소 |
| `DB_PATH` | `app/data/voca.db` | SQLite 파일 경로 |

### Docker

```bash
docker build -t smart-voca .
docker run -p 8080:8080 -v voca-data:/data smart-voca
```

## 처음 사용하기

1. 단어 탭에서 `단어사전_샘플.csv` 같은 `영단어,뜻` 파일을 가져옵니다. 같은 영단어는 한 번만 저장되고 뜻은 `;`로 합칩니다.
2. 암기 탭에서 오늘 단어를 외우고 완료를 누릅니다.
3. 시험 탭에서 문제를 풀고 통계 탭에서 진척을 확인합니다.
4. 게스트로 쓰면 기록은 브라우저별 게스트 계정에 쌓입니다. 계정 탭에서 가입하면 기록이 계정별로 나뉩니다.

CSV 샘플 파일은 리포에 포함하지 않았습니다 (수업 자료 `ai-agent/uploads/`).

## 구현한 요구사항

요구사항 명세서: `docs/smart_voca_Requirement_Spec_v2.0_261125.md`

| 구분 | ID | 내용 |
| :--- | :--- | :--- |
| 기본 | VOCA-FR-001~004 | 단어 등록, 목록·수정·삭제, CSV 가져오기, 검색 |
| 기본 | VOCA-FR-011~014 | 일차별 암기, 복습 섞기, 암기 이력 저장 |
| 기본 | VOCA-FR-021~026 | 문제 수 지정, 가중치 출제, 영→한·한→영·섞기, 단답형·4지선다, 채점, 시험 이력 |
| 기본 | VOCA-FR-031~034 | 진도, 정답률 추이, 자주 틀리는 단어, DB 기반 통계 |
| 도전 | VOCA-FR-041~043 | 회원 가입·로그인·로그아웃, scrypt 해시, 계정별 이력 |
| 도전 | VOCA-FR-051~053 | 공개 설정한 사용자의 통계 조회 (읽기 전용) |
| 도전 | VOCA-FR-061~062 | 설정 화면, DB 저장 |
| 기본 | VOCA-NFR-001~004 | 브라우저 실행, SQLite, 자동 테이블 생성, 비밀값 환경변수 |

## 구조

```
app/
├── server.js            서버 진입점
├── src/
│   ├── app.js           라우팅 (API와 정적 파일)
│   ├── db.js            SQLite 연결과 테이블 생성
│   ├── http.js          JSON 응답, 본문 읽기, 쿠키, 정적 파일
│   ├── logic/           순수 로직 (CSV, 뜻 정규화, 출제·채점, 복습 선택)
│   ├── services/        계정·세션, 설정
│   └── api/             API 모듈 (auth, words, study, quiz, stats)
├── public/              화면 (HTML, CSS, ES 모듈)
└── test/                node:test 테스트
```

## 설계 문서

- 요구사항 명세서: `docs/smart_voca_Requirement_Spec_v2.0_261125.md`
- 아키텍처 결정 기록: `docs/smart_voca_ADR_v2.0_261125.md`
- 작업 기록: `ai-agent/claude/진행일지.md`
