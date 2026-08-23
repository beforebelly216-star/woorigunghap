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

- [ ] 현재 확인된 blocker 없음

## 베타 전 제품 완성도 개선

결제/권한/개인정보/결과 유실/AI 중복비용 수준의 blocker 또는 hotfix가 새로 확인되면 즉시 우선한다.

- [ ] **UI/UX 추가 개선**
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

- [x] **P1 — 공개 Share DTO / privacy·권한 계약**
  - 1:1·1:N 공통 whitelist 공개 DTO와 이름 opt-in 원칙 확정
  - 생년월일시·원본 입력·유료 본문·내부 계산 상세·유료 결과 접근정보 공개 금지
- [x] **P2 — 관계×패턴×tone 카피 라이브러리**
  - raw 240개 검토 후 160개 Production 후보 확정
  - deterministic selector와 curiosity mask 적용
- [x] **P3 — P0 9:16 공유 카드**
  - Relationship Label / Two Sides / Send This
  - 1:1·1:N Web Share / 이미지 저장 / clipboard fallback
- [x] **P4 — public Shared View**
  - 유료 결과와 분리된 opaque public token 기반 `/share/[token]`
  - 비로그인 제한 결과 열람 + 신규 궁합 CTA
  - public share 삭제 수명을 결과/계정 삭제 정책과 연동
- [x] **P5 — 공유 수신자 반응 UX + analytics 퍼널**
  - Shared View에 `꽤 맞음 / 반반 / 아닌데` 반응을 추가하고 첫 반응 뒤 신규 1:1/1:N CTA 노출
  - 최소 이벤트 9개 연결: `share_card_open`, `share_style_selected`, `share_image_download`, `share_native_open`, `share_link_copy`, `shared_view_open`, `shared_view_reaction`, `shared_view_cta_click`, `shared_view_new_report_start`
  - analytics는 제한된 enum 필드만 저장하며 이름·생년월일시·구매 식별자·유료 본문을 저장하지 않음
  - public share 연계 이벤트는 raw token이 아닌 hash로만 연결하고 public share 삭제 시 함께 정리
  - client/server analytics 실패는 공유·Shared View·반응·CTA를 차단하지 않는 best-effort 처리
  - PR #38 Core Validation #609 PASS
- [x] **P6 — Receipt / Recap 카드 + A/B 테스트 기반 확장**
  - 1:1·1:N에 Receipt / Recap 9:16 카드 추가, 기존 P0 카드 유지
  - 기존 P2 카피 재사용: Receipt는 `two_sides`, Recap은 `relationship_label` 기반 clean tone
  - 결과 기반 deterministic seed로 `p6_receipt_first / p6_recap_first`를 안정 배정하고 기본 카드·탭 순서 실험
  - 기존 9-event 이름을 유지하면서 owner-side 이벤트에 enum 제한 `sharePurpose`와 `experimentArm`을 기록
  - public Shared View DTO와 개인정보 공개 범위는 확장하지 않음
  - PR #39 Core Validation #613: 기존 전체 contracts + P6 contract + lint + production build PASS

### P6 성공지표

- Primary: arm/card별 `share_native_open + share_link_copy` ÷ `share_card_open`
- Secondary: arm/card별 `share_image_download`, `share_style_selected`
- Downstream: token hash로 share 이벤트와 `shared_view_open`, `shared_view_new_report_start`를 연결해 공유→유입→신규 궁합 시작 전환 비교
- 결과 해석은 Production 표본이 쌓인 뒤 수행하며 코드 단계에서 승자를 미리 정하지 않는다.

핵심 목표: `결과 확인 → 공유 → 상대 반응 → Shared View → 신규 궁합 시작`

## 배포 / 실사용 QA

- [ ] **Production 최신 배포 여부 확인**
  - GitHub 최신 `main`과 Vercel Production 배포 상태 일치 확인
  - Hobby build rate limit 등 외부 제한은 코드 실패와 분리 기록
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
- Task: Growth P6 — Receipt / Recap 1:1·1:N 카드 + deterministic A/B
- Status: complete
- Validation: PR #39 Core Validation #613 PASS — 기존 전체 contracts + P6 contract + lint + production build
- Commit: PR #39 validated code head 2ba38f33d4709944f73345bd37041e8259719c4a; 상태 문서는 같은 PR에서 후속 갱신
- Remaining: Production 최신 배포 + Shared View/Growth 실사용 QA; P6 arm/card별 공유→Shared View→신규 궁합 시작 기록 확인
- Risk: Production analytics row, Receipt/Recap 실제 이미지 품질·모바일 표시, A/B 결과는 아직 실사용 검증 전
- Resume: `다음`이면 최신 main/HANDOFF 재확인 후 Production Growth QA부터 진행
```
