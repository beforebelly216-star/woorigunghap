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

- [ ] 최신 hotfix Production 반영 후 사용자 보고 5개 증상 실제 E2E 재검증
  - 1:1 테스트 결제 → 800초 이상 무한 대기 재발 여부
  - 결과 생성 중 다른 화면/보관함 이동 → 자동 복구 → `완료` 전환 여부
  - `완료 알림 받기` → `알림 사용 중` 상태 유지 여부
  - 결과 완료 시 Kakao ‘나에게 보내기’ 실제 수신 여부
  - 알림 활성화가 `failed`이면 Vercel `KAKAO_TOKEN_ENCRYPTION_KEY` 및 Kakao `talk_message` 앱 권한/동의 설정 확인
  - 현재 Vercel status는 Hobby `build-rate-limit`; Production 미반영을 코드 실패로 판정하지 않는다.

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
- Task: 1:1 생성 무한대기/이탈 후 정체 + Kakao 완료 알림 UI·활성화 hotfix
- Status: partial
- Validation: contract assertions updated; push workflow includes test:pending-library-notify + lint + build, but connector cannot read push-run result; Vercel status=build-rate-limit
- Commit: code through 44a6f7f; PROJECT_STATE a20b307; this handoff update
- Remaining: build limit 해제 후 latest main Production 반영 확인 → 1:1 결제/이탈복구/알림 활성화/실제 Kakao 수신 E2E
- Risk: production Kakao env/talk_message state unverified; old stalled order recovery requires same-browser access token
```
