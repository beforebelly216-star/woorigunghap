# 우리궁합 NEXT TASK

> GPT와 Claude가 공유하는 실행 큐. 위에서부터 처리하며, 한 모델이 한 번에 가능한 범위만 맡는다.

## 작업 선택 규칙

1. blocker
2. hotfix
3. post-beta 운영 QA
4. improvement
5. 최신 사용자 요청이 더 구체적이면 사용자 요청을 우선한다.
6. 관련 코드/테스트/상태 문서는 한 작업 배치로 묶고 원격 `main`은 작업 종료 시 한 번만 갱신한다.

## Blocker

- [ ] 현재 확인된 blocker 없음

## Hotfix

- [x] 1:1 장시간 생성 정체 / 보관함 영구 `생성중` / segment 저장 race / Kakao 활성화 UI 수정
  - 주요 코드: `6deedaf`, `919a008`, `5053492`, `7b43e88`, `d63ac4a`, `44a6f7f`

- [x] 1:1 AI 분량 latency hotfix
  - `paid-report-v7-editorial-v10-latency-balanced`
  - 5,000~8,000자 목표, 약 10,000자까지 허용
  - 관련 코드/QA: `de693e3`, `8d06113`, `61f5b82`

- [x] Kakao 완료 알림 재동의 + 실제 시험 전송 검증
  - `talk_message` 재동의
  - 시험 메시지 성공 후에만 활성화
  - 완료 전송 실패 시 stale enabled 상태 제거
  - 관련 코드 묶음: `a51adf8`

- [x] 반복되는 Kakao `setup` 오류 원인 분리 + URL fallback hotfix
  - 연결 시험 URL은 현재 OAuth callback request origin 사용
  - `encryption_key / storage / unknown / scope / send_failed` 진단 표시
  - 결과 완료 알림 URL은 Vercel URL fallback 지원
  - 코드: `89d1dbf`

- [x] Kakao token 저장 SQL nullable parameter type hotfix
  - 사용자 화면에서 `notifyDetail=storage` 재현.
  - Kakao 로그인/보관함 DB가 정상이라 `DATABASE_URL` 단순 누락과 맞지 않아 token 저장 SQL 재검토.
  - `CASE WHEN ${refreshToken ?? null} IS NULL`의 nullable parameter가 PostgreSQL에서 타입 추론에 실패할 수 있는 구조 확인.
  - `saveKakaoTokenBundle`, `updateKakaoAccessToken` 두 쿼리의 해당 parameter에 `::text` cast 추가.
  - 계약 테스트에 typed nullable parameter 회귀 조건 추가.
  - 코드 commit: `7dc07fd4456495d1e26b0f2d968951754b3f82d3`

- [ ] 사용자 QA 리포트 서술/표시 신뢰도 개선 — 다음 개발 작업
  - 공통: **일상 언어 결론/관계 장면 → 사주 용어와 계산 근거** 순서.
  - 1:1 해시태그 모바일 잘림 수정.
  - 1:1 계산된 일주가 있는데 `일주 미확인`이 출력되는 data-shape 문제 수정.
  - `서버가 제공한`, `서버 계산상`, `strongest`, `weakest` 등 내부 표현 제거.
  - 개인정보 원문을 늘리지 않고 이미 계산된 일주/일간, 오행 균형, 합충·상호작용 등 근거를 AI payload에 더 제공.
  - 1:N `첫 번째/두 번째/세 번째`, `강점 1/2/3` 제거 → 후보 이름/의미형 제목.
  - 1:N `운의 실현도`, `기본 호흡의 안정성` 등 추상 표현 → 연락·갈등·신뢰·생활·장기관계 등 직관적 언어.

## 사용자 실사용으로 확인할 항목

- [ ] 최신 Kakao SQL hotfix 배포 후 `완료 알림 다시 연결` 1회 확인.
  - 성공: 연결 시험 메시지 수신.
  - 실패 시 새 화면 분류를 기준으로 바로 후속 조치.

- [ ] 새 1:1 실제 사용에서 생성시간 확인.
  - 5분 이상 반복 정체 시 `report-engine-v6-request.ts` long-segment timeout/token floor 및 `result-v2.tsx` 무기한 transient retry 조정.

## Post-beta 운영 QA

- [ ] 360 / 390 / 430px 모바일 핵심 플로우 확인
- [ ] 1:1 실제 결제 반복 사용
- [ ] 1:N 실제 결제 반복 사용
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴/데이터 삭제/Kakao unlink
- [ ] Production runtime error와 AI 비용 관찰
- [ ] 공개 운영정보/환경값 최종 확인

## Improvement backlog

- [ ] 실제 사용자 반응 기반 AI 문체·재미·분량 개선
- [ ] 1:N 콘텐츠/UI 세부 고도화
- [ ] 베타 전 프로모션/바이럴 UX backlog는 기존 blocker/hotfix가 해소된 뒤 단계적으로 수행
- [ ] 월운 기반 월 단위 타이밍 등 후속 기능

## 기본 검증

가능한 환경에서는 변경 후 최소:

```bash
npm run lint
npm run build
```

관련 계약 테스트가 있으면 함께 실행한다. connector 세션에서 실행할 수 없으면 HANDOFF에 명시한다.

## Current HANDOFF

```text
HANDOFF
- Worker: GPT
- Task: Kakao 완료 알림 storage 오류 원인 수정 — refresh-token nullable SQL parameter에 PostgreSQL text cast 추가
- Status: partial
- Validation: latest main/docs/code 재확인; SQL 원인 코드 확인; contract test에 typed nullable parameter 조건 추가; connector 환경이라 lint/build 직접 실행 불가
- Commit: code 7dc07fd4456495d1e26b0f2d968951754b3f82d3; docs handoff commit이 main tip
- Remaining: main Production 배포 성공 확인 → 사용자가 `완료 알림 다시 연결` 1회 확인 → 성공 시 리포트 서술/표시 신뢰도 개선 작업 진행
- Risk: Vercel runtime log connector 권한이 403이라 실제 Neon error code는 직접 열람 못했으나, 로그인/보관함 DB 정상 + token SQL의 untyped nullable parameter 결함이 코드상 확인됨
```
