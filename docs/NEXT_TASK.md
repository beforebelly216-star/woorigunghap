# 우리궁합 NEXT TASK

> GPT와 Claude가 공유하는 실행 큐. 위에서부터 처리하며, 한 모델이 한 번에 가능한 범위만 맡는다.

## 작업 선택 규칙

1. `blocker`가 있으면 무조건 최우선.
2. 그다음 `hotfix`.
3. 그다음 아래 운영 QA / improvement 순서.
4. 작업을 시작하면 해당 항목에 `IN PROGRESS - GPT` 또는 `IN PROGRESS - CLAUDE`를 임시 표기할 수 있다.
5. 완료 시 체크하고, 검증 명령/결과와 관련 커밋 SHA를 같은 항목 아래에 한 줄로 기록한다.
6. 완료하지 못했으면 체크하지 말고 정확한 중단 지점과 다음 행동을 남긴다.
7. 사용자 요청이 이 큐보다 구체적이고 우선순위가 높으면 사용자 요청을 수행한 뒤 큐를 갱신한다.

## Blocker

- [ ] 현재 확인된 blocker 없음

## Hotfix

- [x] 1:1 장시간 생성 정체 / 이탈 후 보관함 영구 `생성중` / Kakao 완료 알림 활성화 UI 회귀 코드 수정
  - `prepare` 후 3개 AI segment 병렬 fan-out, segment DB atomic merge, 같은 브라우저 보관함 재기동, 최종 완료 알림 재확인, Kakao 활성화 성공/실패 표시, 알림 패널 spacing 반영
  - 관련 커밋: `6deedaf`, `919a008`, `da71cc1`, `5053492`, `7b43e88`, `d63ac4a`, `44a6f7f`
  - 계약 테스트 `test:pending-library-notify` 회귀 조건 갱신 완료
  - 위 제품 코드가 포함된 `a20b307` Vercel Production 성공 상태 확인

- [x] Production 1:1 테스트에서 `1/3 · 421초` 장기 대기 재현 후 AI 분량 계약 latency hotfix
  - 원인: 제품 결정은 5,000~8,000자 목표인데 runtime 최소 segment density 합계가 8,900 compact chars, 실제 Anthropic QA가 13,000자 이상을 강제
  - `paid-report-v7-editorial-v10-latency-balanced`: CH0~CH9 구조는 유지하고 intro 1,200 / dynamics 2,200 / action 2,200 품질 목표와 필드별 문장 요구를 축소
  - 실제 Anthropic QA를 5,000자 이상 / 10,000자 이하로 정렬하고 `test:pending-library-notify`에 13,000자 회귀 방지 조건 추가
  - 관련 커밋: `de693e3`, `8d06113`, `61f5b82`

- [x] Kakao 완료 알림 재동의 + 실제 전송 검증 hotfix
  - 최초 미동의/추가 동의 취소 시 `scope=talk_message` 재동의 경로를 보관함에서 다시 제공
  - 동의 저장만으로 성공 처리하지 않고 실제 Kakao ‘나에게 보내기’ 시험 메시지가 성공해야 새 연결을 활성화
  - scope 부족 / 서버 설정 / 실제 전송 실패를 `scope` / `setup` / `send_failed`로 분리해 안내
  - 완료 메시지 발송 실패 시 `kakao_message_enabled=false`로 내려 stale `알림 사용 중` 상태 제거
  - 기존 활성 계정도 `연결 다시 확인`으로 시험 발송을 다시 실행 가능
  - 계약 테스트 `test:pending-library-notify`에 재동의/시험발송/실패 비활성화 회귀 조건 추가

- [ ] 사용자 QA 리포트 서술/표시 신뢰도 개선 — 다음 작업 최우선
  - 공통 서술: **일상 언어 결론/관계 장면 → 사주 용어와 계산 근거** 순서로 재작성
  - 1:1 해시태그가 모바일에서 잘리는 문제 수정: 임의 글자수 slice/ellipsis 제거 또는 wrap 보장
  - 1:1 계산된 일주가 있는데 `서버 계산상 일주 미확인`이 출력되는 데이터 shape 오류 확인 및 수정
  - 사용자 문장에 `서버가 제공한`, `서버 계산상`, `strongest`, `weakest` 같은 구현/필드명을 노출하지 않도록 금지
  - 개인정보 원문을 늘리지 않는 범위에서 day master, 오행 균형, 합충/상호작용, useful signal 등 이미 계산된 안전한 근거를 AI payload/후처리에 더 풍부하게 제공
  - 1:N `첫 번째/두 번째/세 번째`, `강점 1/2/3` 같은 순번형 설명을 후보 이름/의미형 제목으로 교체
  - 1:N `운의 실현도`, `기본 호흡의 안정성` 같은 추상 용어를 연락·갈등·신뢰·장기생활 등 직관적인 관계 언어로 교체
  - 관련 테스트: `test:one-to-one:quality-gate`, `test:day15:one-to-many-narrative`, `test:day15:one-to-many-result-ui`, 필요 시 신규 계약 테스트

- [ ] latency + Kakao hotfix Production 반영 후 사용자 보고 증상 실제 E2E 재검증
  - 새 1:1 테스트 결제 → 전체 생성시간 측정; 5분 이상 정체 여부 확인
  - 결과 생성 중 다른 화면/보관함 이동 → 자동 복구 → `완료` 전환 여부
  - `완료 알림 받기` 또는 기존 계정 `연결 다시 확인` → 연결 시험 메시지 실제 수신 여부
  - 결과 완료 시 Kakao ‘나에게 보내기’ 실제 수신 여부
  - `scope`면 Kakao `talk_message` 추가 동의/앱 권한 확인, `setup`이면 Vercel `KAKAO_TOKEN_ENCRYPTION_KEY` / `NEXT_PUBLIC_APP_URL` 확인
  - Vercel Hobby `build-rate-limit`은 Production 미반영 사유일 수 있으며 코드 실패로 판정하지 않는다.
  - 분량 축소 후에도 5분 이상 걸리면 다음 hotfix는 `report-engine-v6-request.ts` long-segment 205초 timeout/token floor와 `result-v2.tsx` 무기한 transient retry 조정

## Post-beta 운영 QA

- [ ] 360px / 390px / 430px 모바일 실기기 핵심 플로우 재검증
  - 범위: 홈 → 입력 → 결제 전 확인 → 결과 → 보관함
  - 이상이 있으면 blocker/hotfix/improvement로 분류

- [ ] 1:1 운영 테스트 결제 반복 E2E
  - 결제 성공 → 서버 검증 → 생성중 → 완료 → 새로고침/재접속 복구 확인

- [ ] 1:N 운영 테스트 결제 반복 E2E
  - 후보 2~5명, 순위 불변, 단일 AI 생성, 저장/복구 확인

- [ ] 비회원 결과 → Kakao 로그인 → 계정 귀속 → 보관함 재열람 반복 검증

- [ ] 결제 직후 보관함 `생성중` → `완료` 카드 전환 반복 검증

- [ ] Kakao 완료 알림 실제 수신 반복 검증

- [ ] 회원탈퇴 → 데이터 삭제 → Kakao unlink 운영 반복 검증

- [ ] Production runtime error 및 AI 사용량/원가 관찰 기준 정리

- [ ] 정식 판매 전 공개 운영정보/환경값 최종 체크
  - `NEXT_PUBLIC_OPERATOR_NAME`
  - `NEXT_PUBLIC_OPERATOR_EMAIL`
  - `NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER`
  - `NEXT_PUBLIC_ECOMMERCE_REGISTRATION_NUMBER`
  - `KAKAO_ADMIN_KEY`
  - `KAKAO_TOKEN_ENCRYPTION_KEY`
  - `NEXT_PUBLIC_APP_URL`

## Improvement backlog

- [ ] 실제 사용자 반응 기반 1:1 AI 문체·재미·단정 강도·반복·분량 튜닝
- [ ] 1:N 콘텐츠/UI 세부 고도화
- [ ] 월운 기반 월 단위 타이밍 등 베타 이후 기능 확장

## 기본 검증 명령

변경 범위에 맞는 테스트를 먼저 실행하고, 병합/배포 전 최소 아래를 확인한다.

```bash
npm run lint
npm run build
```

핵심 회귀가 필요한 변경이면 관련 Day 테스트를 추가한다. 전체 목록은 `package.json`과 `README.md`를 기준으로 한다.

## 다음 모델에게 남기는 HANDOFF 형식

작업 종료 시 이 파일 맨 아래에 장문의 일지를 누적하지 말고, 필요한 경우 아래 형식으로 최대 8줄만 남긴다.

```text
HANDOFF
- Worker: GPT | Claude
- Task: 수행한 작업
- Status: complete | partial | blocked
- Validation: 실행한 테스트와 결과
- Commit: SHA
- Remaining: 남은 정확한 작업
- Risk: 있으면 1줄
```

새 작업자가 인수하면 오래된 HANDOFF는 삭제하거나 현재 상태로 교체한다.

## Current HANDOFF

```text
HANDOFF
- Worker: GPT
- Task: 사용자 beta QA stage 1 — Kakao 완료 알림 재동의 + 실제 전송 검증 hotfix
- Status: partial
- Validation: Kakao 공식 문서로 talk_message 추가 동의/-402/나에게 보내기 계약 확인; test:pending-library-notify 계약 갱신; connector 환경이라 lint/build 직접 실행 불가
- Commit: BUNDLED_MAIN_COMMIT
- Remaining: 최신 main Production 배포 후 연결 시험 메시지/완료 메시지 E2E → 이어서 위 `사용자 QA 리포트 서술/표시 신뢰도 개선` 항목 수행
- Risk: Production Kakao 앱 talk_message 권한과 Vercel env는 런타임 검증 전 미확정; 1:1/1:N 서술/UI 요청은 stage 2로 명시적 미완료
```
