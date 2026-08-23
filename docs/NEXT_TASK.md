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

- [ ] 현재 확인된 미해결 코드 blocker 없음

## Hotfix

- [x] **2026-08-24 사용자 제보 hotfix — 테마 / 1:1 장시간 생성 / 불필요 홈 문구 / 공유 발견성**
  - 홈·입력·결제·생성중·결과·보관함 핵심 surface를 라벤더 기반 공통 파스텔 토큰으로 통일
  - 개정 전 크림/베이지/연노랑 및 순백 혼합 테마를 핵심 surface 기본값에서 제거
  - 홈의 `계산은 서버가`, `무료는 계산만`, `AI는 서술만`, `결제 후 생성` 등 구현 설명/범용 면책 문구 제거
  - 1:1 `intro / dynamics / action` 누락 segment를 per-segment single-flight claim 아래 함께 계획하고 가능한 segment를 병렬 생성해 순차 대기 누적 제거
  - stale segment lock은 5분 유지해 살아 있는 장문 생성의 중복 재획득/AI 비용 중복 방지
  - 보관함 same-browser 생성 복구 재기동 120초 → 60초
  - 기존 1:1·1:N Web Share / 1080×1920 이미지 저장 / public Shared View / clipboard fallback 구현을 회귀 계약으로 고정
  - 보관함 완료 결과 CTA `결과 열기 · 공유하기`
  - Vercel Git 자동 배포 비활성화, Preview/Production 배포는 사용자 명시 승인 후 별도 실행
  - **PR #41 Core Validation #630 PASS — 전체 기존 contracts + hotfix contract + lint + production build**
- [ ] **PR #41 병합 후 Production 반영 및 실제 hotfix QA**
  - 사용자 명시 배포 승인 전에는 Vercel Preview/Production 실행 금지
  - 승인 후 정확한 최신 `main` SHA를 1회 Production 배포하고 배포 SHA 일치 확인
  - 실제 새 1:1 결제에서 생성시간·저장·재열람 확인
  - 실제 1:1·1:N 결과에서 공유 UI, 이미지 저장, Web Share, Shared View 링크 확인
  - 360 / 390 / 430px에서 라벤더 테마 일관성 육안 확인

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

- [ ] **Production 최신 배포 여부 확인**
  - GitHub 최신 `main`과 Vercel Production 배포 상태 일치 확인
  - Hobby build rate limit 등 외부 제한은 코드 실패와 분리 기록
  - 사용자 승인 전 Vercel 배포 금지
- [ ] **무료 유입 / Aha 실제 QA**
  - 홈 first CTA가 무료 자기 분석인지 확인
  - `/free` 입력 → 4-insight 결과 → 유료 CTA 실제 동작
  - `/one-to-one?from=free`에서 본인 정보 prefill 확인, raw birth input이 URL에 없는지 확인
  - 360 / 390 / 430px 모바일 입력·결과 카드 육안 확인
- [ ] **Shared View / Growth 실제 QA**
  - Receipt / Recap 이미지 저장·공유 → public link → 비로그인 Shared View → 반응 → CTA 동작 확인
  - P5/P6 analytics row, 9-event 퍼널, experiment arm 기록 확인
  - 결과/계정 삭제 뒤 기존 Shared View와 token 연계 analytics 정리 확인
- [ ] **새 1:1 실제 결제/생성 QA**
  - 실제 결제 → 생성 → 결과 저장 → 보관함 재열람
  - 실제 생성시간·답변 품질·공개 점수 분포·삭제 기능 관찰

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
- Task: 사용자 제보 hotfix — 테마 통일 / 1:1 장시간 생성 / 홈 문구 제거 / 공유 발견성 / 수동 배포 정책
- Status: complete
- Validation: PR #41 Core Validation #630 PASS — 전체 contracts + hotfix contract + lint + production build
- Commit: PR #41 validated code head bd57658c81eefbd7198cfe33eb2ff3adcb7f1d72; 상태 문서는 같은 PR에서 후속 갱신
- Remaining: 사용자 승인 후 최신 main SHA를 Vercel Production에 1회 배포 → 1:1 생성시간·테마·1:1/1:N 공유 실사용 QA
- Risk: Production은 아직 hotfix 미반영; 실제 유료 1:1 생성시간과 모바일 Web Share/이미지 품질은 배포 후 검증 필요
- Resume: 배포 승인이 오면 최신 main 재확인 후 승인된 SHA만 Production 배포하고 runtime QA 진행
```
