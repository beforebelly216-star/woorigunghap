# 우리사주 NEXT TASK

> GPT와 Claude가 공유하는 실행 큐. 최신 `main`과 실제 코드 상태를 우선한다.

## 작업 선택 규칙

1. blocker
2. hotfix
3. 최신 사용자 요청으로 지정된 베타 전 제품 완성도 개선
4. growth / promotion / viral UX
5. post-beta 운영 QA
6. 기타 improvement
7. 최신 사용자 요청이 더 구체적이면 사용자 요청을 우선한다.
8. 관련 코드·테스트·상태 문서는 한 작업 배치로 묶고 원격 `main`은 작업 종료 시 한 번만 갱신한다.

## Blocker

- [x] **1:1 결제 후 생성이 600초 이상 `생성중`에 머무는 응답 차단 원인 수정**
  - PR #41 Production 코드에서 첫 `intro` 요청이 `intro / dynamics / action` 세 장문을 모두 시작한 뒤 `Promise.all`로 세 개 전부 완료될 때까지 응답을 막는 구조를 확인
  - long segment는 최대 약 220초 budget이고 route `maxDuration=240`이므로, 요청 segment가 완료돼도 다른 segment 때문에 invocation 전체가 timeout 될 수 있었음
  - 클라이언트는 transient/network 실패를 무기한 재시도하므로 timeout 뒤 `생성중` 화면이 장시간 지속됨
  - PR #43에서 요청한 segment만 HTTP 응답 완료 조건으로 기다리고, 다른 누락 segment는 Next.js `after()` / Vercel `waitUntil`로 응답 후 지속
  - 기존 per-segment single-flight, 결제 검증, 서버 저장, 5분 stale lock은 유지해 중복 AI 비용 방지
  - 잘못된 `Promise.all` 요구 테스트를 수정해 요청 segment가 다른 두 segment를 기다리는 회귀를 명시적으로 금지
  - **PR #43 Core Validation #636 PASS — 전체 기존 contracts + non-blocking fan-out contract + lint + production build**
- [ ] **배포된 PR #43 실제 생성 복구 QA**
  - [x] PR #43 main merge: `d20de6ad4f4a7e2cc5615ad9b1b132fc178f599e`
  - [x] 사용자 승인 Production 1회 배포: `222341c8e8b84112e01036afb1b474744097072f` → Vercel `success`
  - [x] 배포 직후 Git 자동배포 재비활성화: `3c3c151edd33003b612ebc5bbdfc7271f6b42f35`; Vercel deployment status 없음
  - [ ] 기존 `생성중` 주문이 stale lock 회복 뒤 재개되는지 확인
  - [ ] 새 1:1 결제 → intro 응답 → 전체 생성 → 저장 → 보관함 재열람 시간 측정
  - Vercel runtime-log connector는 현재 프로젝트 조회가 불가하므로 실제 사용자 흐름과 가능한 다른 관측 경로로 우선 확인

## Hotfix

- [x] **2026-08-24 사용자 제보 hotfix — 테마 / 불필요 홈 문구 / 공유 발견성**
  - 홈·입력·결제·생성중·결과·보관함 핵심 surface를 라벤더 기반 공통 파스텔 토큰으로 통일
  - 개정 전 크림/베이지/연노랑 및 순백 혼합 테마를 핵심 surface 기본값에서 제거
  - 홈의 `계산은 서버가`, `무료는 계산만`, `AI는 서술만`, `결제 후 생성` 등 구현 설명/범용 면책 문구 제거
  - 보관함 same-browser 생성 복구 재기동 120초 → 60초
  - 기존 1:1·1:N Web Share / 1080×1920 이미지 저장 / public Shared View / clipboard fallback 구현을 회귀 계약으로 고정
  - 보관함 완료 결과 CTA `결과 열기 · 공유하기`
  - Vercel Git 자동 배포 비활성화, Preview/Production 배포는 사용자 명시 승인 후 별도 실행
  - PR #41 Core Validation #630 PASS
- [ ] **배포된 UI/공유 hotfix 실제 QA**
  - [x] 사용자 승인 후 Production 1회 배포 완료: `1289a39972976bc05447fc14c86219c3cdaac983` → Vercel `success`
  - [x] 배포 직후 자동 Git 배포 재비활성화: `f4cc4f1c5b9f75ddd3414813760ae7b9f443224b`
  - [ ] 실제 1:1·1:N 결과에서 공유 UI, 이미지 저장, Web Share, Shared View 링크 확인
  - [ ] 360 / 390 / 430px에서 라벤더 테마 일관성 육안 확인

## 베타 전 제품 완성도 개선

결제/권한/개인정보/결과 유실/AI 중복비용 수준의 blocker 또는 hotfix가 새로 확인되면 즉시 우선한다.

- [ ] **UI/UX 추가 개선**
  - [x] 홈 paid-first 구조 제거 → `무료로 내 관계 성향 보기` free-first CTA → `/free` Aha → 결과 뒤 1:1/1:N 유료 CTA
  - [x] 무료 결과 → 1:1 이동 시 같은 세션의 본인 입력을 첫 번째 사람으로 prefill하고 raw birth input을 URL에 넣지 않음
  - 홈 → 입력 → 결제 전 → 생성중 → 결과 → 보관함 정보 위계·CTA·모바일 사용성 재검토
  - 1:1·1:N 결과 첫 1~2스크린의 점수/관계유형/핵심결론/다음 행동 명확화
  - 긴 리포트 스캔 가능성, 챕터 전환, 요약 카드, 공유/보관함 동선 개선
  - 360 / 390 / 430px 실제 뷰포트 QA 병행

- [ ] **AI 답변 스타일/화자 품질 개선**
  - 사주소년 페르소나는 유지하되 정보 전달 우선
  - 결론형 문장·관계 장면·실용 조언을 앞에 두고 명리 근거는 뒤에서 설명
  - 반복 유보형 종결·범용 조언·과도한 판타지 비유 축소
  - 짝사랑/썸/연인/친구/직장동료별 감정 온도 분리

- [ ] **리포트 항목/정보구조 개선**
  - CH0~CH9 기본 구조를 유지하면서 중복·약한 항목 정리
  - 관계 흐름·상대 반응·갈등/회복·행동 가이드·장기관계/협업 비중 재조정
  - 1:N 후보별 역할/차이/선택 이유 비교성 강화
  - 새 계산값을 만들지 않고 기존 deterministic snapshot 범위에서만 재구성

## 그로스 해킹 / 프로모션·바이럴 UX

상세 지침은 `docs/PROMOTION_VIRAL_UX.md`를 사용한다. 카카오 전용 메시지/공유 API는 사용하지 않고 Web Share API·이미지 저장·일반 공유 URL 등 플랫폼 중립 방식만 사용한다.

- [x] **A0 — 무료 유입 / Aha → 유료 전환**
  - 홈 첫 CTA를 무료 자기 관계 성향 분석으로 전환하고 유료 상품/가격은 무료 설명 뒤에 배치
  - `/free`에서 기존 만세력 + 60일주 캐릭터만 사용해 4개 insight 제공
  - 무료 경로에서 주문·결제·유료 AI 생성을 만들지 않음
  - 무료 결과 뒤 1:1 1,000원 / 1:N 3,000원 CTA 제공, 1:1은 same-session 본인 입력 prefill
  - PR #40 Core Validation #618 PASS
- [x] **P1 — 공개 Share DTO / privacy·권한 계약**
- [x] **P2 — 관계×패턴×tone 카피 라이브러리**
- [x] **P3 — Relationship Label / Two Sides / Send This 9:16 공유 카드**
- [x] **P4 — public Shared View**
- [x] **P5 — 공유 수신자 반응 UX + 9-event analytics 퍼널**
- [x] **P6 — Receipt / Recap 카드 + deterministic A/B**

### A0 / P6 성공지표

- A0 Primary: 무료 자기 분석 완료 → 1:1/1:N 시작 전환율
- A0 Secondary: 홈 → 무료 분석 시작률, 무료 분석 시작 → 결과 완료율
- P6 Primary: arm/card별 `share_native_open + share_link_copy` ÷ `share_card_open`
- P6 Secondary: arm/card별 `share_image_download`, `share_style_selected`
- P6 Downstream: token hash로 share 이벤트와 `shared_view_open`, `shared_view_new_report_start`를 연결해 공유→유입→신규 궁합 시작 전환 비교
- 결과 해석은 Production 표본이 쌓인 뒤 수행하며 코드 단계에서 승자를 미리 정하지 않는다.

핵심 목표: `무료 자기 분석 → Aha → 유료 궁합 시작 → 결과 확인 → 공유 → 상대 반응 → Shared View → 신규 궁합 시작`

## 배포 / 실사용 QA

- [x] **PR #41 UI/Growth hotfix Production 배포**
  - Production deploy commit `1289a39972976bc05447fc14c86219c3cdaac983` Vercel status `success`
  - 자동배포는 즉시 다시 비활성화됨
- [x] **PR #43 1:1 생성 blocker Production 배포**
  - 기능 기준 main `d20de6ad4f4a7e2cc5615ad9b1b132fc178f599e`
  - Production deploy commit `222341c8e8b84112e01036afb1b474744097072f` Vercel `success`
  - 자동배포 재비활성화 commit `3c3c151edd33003b612ebc5bbdfc7271f6b42f35`
  - 실제 기존 stuck 주문 및 신규 1:1 생성 runtime QA는 계속 최우선
- [ ] **무료 유입 / Aha 실제 QA**
  - 홈 first CTA가 무료 자기 분석인지 확인
  - `/free` 입력 → 4-insight 결과 → 유료 CTA 실제 동작
  - `/one-to-one?from=free`에서 본인 정보 prefill 확인, raw birth input이 URL에 없는지 확인
  - 360 / 390 / 430px 모바일 입력·결과 카드 육안 확인
- [ ] **Shared View / Growth 실제 QA**
  - Receipt / Recap 이미지 저장·공유 → public link → 비로그인 Shared View → 반응 → CTA 동작 확인
  - P5/P6 analytics row, 9-event 퍼널, experiment arm 기록 확인
  - 결과/계정 삭제 뒤 기존 Shared View와 token 연계 analytics 정리 확인

## Post-beta 운영 QA

- [ ] 360 / 390 / 430px 모바일 핵심 플로우 육안 확인
- [ ] 1:1 실제 결제 반복 사용
- [ ] 1:N 실제 결제 반복 사용
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴/데이터 삭제/Kakao unlink
- [ ] Production runtime error와 AI 비용 관찰
- [ ] 공개 운영정보/환경값 최종 확인

## Improvement backlog

- [ ] 무료 유입 acquisition analytics 계약 및 실제 전환율 측정
- [ ] 무료 자기 분석 결과 공유/바이럴 확장 여부를 실제 A0 전환 데이터 기반으로 결정
- [ ] 실제 사용자 반응 기반 AI 문체·재미·분량 개선
- [ ] 1:N 콘텐츠/UI 세부 고도화
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
- Task: PR #43 1:1 생성 응답 blocker 승인 Production 배포
- Status: complete (deploy); runtime QA pending
- Validation: PR #43 Core Validation #636 PASS; deploy commit 222341c8e8b84112e01036afb1b474744097072f Vercel success; 3c3c151edd33003b612ebc5bbdfc7271f6b42f35 이후 Git auto-deploy OFF
- Commit: 기능 main d20de6ad4f4a7e2cc5615ad9b1b132fc178f599e; Production deploy 222341c8e8b84112e01036afb1b474744097072f
- Remaining: 기존 stuck 1:1 주문 회복 확인 + 새 1:1 결제/생성/저장/보관함 재열람 실제 시간 측정
- Risk: 배포 status는 success지만 실제 유료 주문 runtime은 아직 확인 전; Vercel runtime-log connector는 프로젝트 조회 불가
- Resume: 최신 main/HANDOFF 재확인 후 1:1 runtime QA를 최우선 진행
```
