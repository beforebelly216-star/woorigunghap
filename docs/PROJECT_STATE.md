# 우리궁합 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. 작업 시작 시 반드시 읽고, 의미 있는 작업 완료 후 갱신한다.

## 기준선

- 기준 브랜치: `main`
- 기준 상태: Day 24 MVP 완료, 베타 운영 전환
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 배포: Vercel Production, `main` 자동 배포
- 배포 원칙: 관련 코드/테스트/상태 문서를 한 작업 단위로 묶고 원격 `main` 갱신은 한 번만 수행한다.

## 현재 구현 상태

- 1:1 상품 1,000원
- 1:N 상품 3,000원, 기준자 1명 + 후보 2~5명
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 서버 만세력 계산 및 9개 궁합 지표
- PortOne 결제 검증 및 webhook 멱등 처리
- 결제 검증 후 AI 리포트 생성, segment single-flight/idempotency
- 1:1 CH0~CH9 장문 리포트, 1:N 순위/비교 리포트
- Neon 서버 저장, 복구 링크, 계정 보관함
- 선택형 Kakao 로그인 및 구매 결과 귀속
- 생성중 결과 보관함 표시 및 같은 브라우저 복구 재기동
- 이용약관/개인정보/환불 정책, 회원탈퇴/데이터 삭제

## 최근 1:1 생성 지연 hotfix

- `prepare` 후 `intro` / `dynamics` / `action`을 병렬 fan-out한다.
- 병렬 segment 저장은 PostgreSQL `jsonb_set` 원자 업데이트를 사용한다.
- 1:1 AI 분량 계약은 `paid-report-v7-editorial-v10-latency-balanced`로 조정했다.
- 전체 목표는 약 5,000~8,000자, 필요 시 약 10,000자까지다.
- 기존 13,000자 이상 강제 QA는 제거했다.
- Production 실제 생성시간은 사용자 실사용 결과로 확인한다. 과도한 QA 때문에 다음 개발을 지연시키지 않는다.

## Kakao 완료 알림 현재 상태

2026-08-19 운영 화면에서 `완료 알림 다시 연결`을 반복 확인한 결과, 최신 진단 UI가 `notifyDetail=storage`를 표시했다.

확인 결과:

- Kakao 로그인/보관함/세션이 정상 작동하므로 Production의 `DATABASE_URL` 자체가 단순 누락된 상황과는 맞지 않았다.
- `KAKAO_TOKEN_ENCRYPTION_KEY`도 최신 진단 precheck를 통과했다.
- 실제 원인은 Kakao token 저장 SQL의 nullable refresh-token 파라미터가 `CASE WHEN ${...} IS NULL` 형태로 사용되면서 PostgreSQL/Neon이 파라미터 타입을 추론하지 못할 수 있는 코드 결함이었다.
- `saveKakaoTokenBundle`와 `updateKakaoAccessToken` 두 쿼리 모두 nullable refresh-token 조건 파라미터에 `::text` cast를 추가했다.
- 계약 테스트에 두 쿼리의 typed nullable parameter 조건을 추가해 같은 형태로 회귀하지 않게 했다.
- 코드 커밋: `7dc07fd4456495d1e26b0f2d968951754b3f82d3`.

기존 Kakao 정책은 유지한다.

- `talk_message` 미동의 시 추가 동의 재요청
- token 저장 후 실제 Kakao `나에게 보내기` 시험 메시지가 성공해야 활성화
- 실제 발송 실패 시 stale enabled 상태 제거
- 연결 시험 URL은 현재 request origin 사용
- 완료 알림 URL은 `NEXT_PUBLIC_APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` fallback

## 아직 미완료인 사용자 요청

### 리포트 서술/표시 신뢰도 개선 — 다음 개발 작업

- 공통: 일상 언어로 결론/관계 장면을 먼저 설명하고 뒤에 사주 용어와 계산 근거를 붙인다.
- 1:1: 모바일 해시태그 잘림 수정.
- 1:1: 계산된 일주가 있는데 `서버 계산상 일주 미확인`이 나오는 data-shape 문제 수정.
- 1:1: `서버가 제공한`, `서버 계산상`, `strongest`, `weakest` 같은 내부 구현 표현을 사용자 문장에서 제거.
- 1:1: 원본 개인정보를 늘리지 않는 범위에서 이미 계산된 일주/일간, 오행 균형, 합충·상호작용 등 근거를 AI에 더 풍부하게 제공.
- 1:N: `첫 번째/두 번째/세 번째`, `강점 1/2/3` 같은 순번형 명명을 후보 이름/의미형 제목으로 변경.
- 1:N: `운의 실현도`, `기본 호흡의 안정성` 같은 추상 표현을 연락·갈등·신뢰·생활·장기관계 등 직관적인 언어로 변경.

## 운영 확인이 남은 항목

- nullable refresh-token SQL cast hotfix가 Production에 배포된 뒤 `완료 알림 다시 연결` 재확인.
- 성공 시 연결 시험 메시지 수신 확인.
- 새 1:1 실제 사용에서 생성시간 확인. 5분 이상 반복 정체 시 long-segment timeout/token floor와 foreground 무기한 retry를 다음 hotfix 대상으로 한다.

## 출시 blocker 정의

1. 결제 성공 후 결과 유실
2. 동일 결제의 AI 중복 생성/비용 중복
3. 타 계정 유료 결과 열람
4. 정책 동의 없는 결제
5. 개인정보·비밀값·내부 지표의 부적절한 노출
6. 탈퇴 후 삭제 대상 데이터 잔존
7. 친구/직장동료 결과에 구조적으로 잘못된 연애·성적 프레임 혼입
8. JSON/API/저장 실패로 유료 결과 생성 불가

문체 취향, 재미, 일부 반복/분량 편차는 blocker로 취급하지 않는다.

## 운영 원칙

- GitHub 최신 `main`을 단일 진실 공급원으로 사용한다.
- 작업 시작 시 `AGENTS.md` → `docs/PROJECT_STATE.md` → `docs/NEXT_TASK.md` → `docs/DECISIONS.md` 순서로 읽는다.
- 사용자 요청이 `NEXT_TASK`보다 구체적이면 사용자 요청을 우선한다.
- 기존 완료 기능을 이유 없이 재작성하지 않는다.
- Vercel Hobby build rate limit은 코드 실패가 아니다.
- 의미 있는 작업 후 `PROJECT_STATE`, `NEXT_TASK/HANDOFF`를 갱신한다.
