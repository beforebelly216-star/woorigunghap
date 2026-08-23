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
8. 관련 코드/테스트/상태 문서는 한 작업 배치로 묶고 원격 `main`은 작업 종료 시 한 번만 갱신한다.

## Blocker

- [ ] 현재 확인된 blocker 없음

## 최근 사용자 요청 / 완료 작업

- [x] **카카오톡 보내기·완료 알림 기능 전면 제거**
  - Kakao Developers `talk_message` / `나에게 보내기` 권한 요청과 메시지 전송 코드 제거.
  - Kakao access/refresh token 장기 저장용 알림 모듈 제거.
  - 카카오톡 채널/플러스친구 알림톡 및 SOLAPI adapter 제거.
  - 보관함 휴대전화 번호 입력·동의·알림 설정/해제 UI와 API 제거.
  - 완료 시 자동 발송 훅, notification 전용 테스트·환경변수·운영 문서 제거.
  - 개인정보처리방침에서 알림용 휴대전화 번호와 SOLAPI 처리 내용 제거.
  - **카카오 로그인/보관함 귀속/회원탈퇴 시 Kakao unlink는 유지.**
  - 기존 DB에 과거 알림 실험용 컬럼/테이블이 존재할 수 있으나 새 코드는 읽기·쓰기·발송에 사용하지 않는다. 물리적 DB schema 정리는 별도 안전 마이그레이션으로만 수행한다.

## 베타 전 제품 완성도 개선 — 현재 최우선 개선 트랙

결제/권한/개인정보/결과 유실/AI 중복비용 수준의 blocker 또는 hotfix가 새로 확인되면 즉시 그 작업을 우선한다.

- [ ] **UI/UX 추가 개선**
  - 홈 → 입력 → 결제 전 → 생성중 → 결과 → 보관함까지 정보 위계·가독성·CTA·모바일 사용성 재검토.
  - 1:1과 1:N 결과 페이지의 브랜드 일관성과 각 상품의 핵심 가치 강화.
  - 결과 첫 1~2스크린에서 점수, 관계 유형, 핵심 결론, 다음 행동을 빠르게 이해할 수 있게 개선.
  - 긴 리포트의 스캔 가능성, 챕터 전환, 요약 카드, 공유 진입점, 보관함 복귀 동선 개선.
  - 360 / 390 / 430px 실제 뷰포트 QA 병행.

- [ ] **AI 답변 스타일/화자 품질 개선**
  - 사주소년 페르소나는 유지하되 캐릭터 연기가 정보 전달을 방해하지 않도록 밀도 조절.
  - 적중감 있는 결론형 문장, 관계 장면, 실용 조언을 우선하고 명리 용어·근거는 뒤에서 설명.
  - 반복 유보형 종결, 비슷한 문장 구조, 범용 조언, 과도한 판타지 비유 축소.
  - 짝사랑/썸/연인/친구/직장동료별 질문 의도와 감정 온도 분리.
  - 실제 생성 샘플로 재미·공유성·납득감·분량 조정.

- [ ] **리포트 항목/정보구조 개선**
  - CH0~CH9 기본 구조를 유지하면서 중복·약한 항목·사용자 가치가 낮은 항목 식별.
  - 궁합 점수, 관계 흐름, 상대 반응, 갈등/회복, 실제 행동 가이드, 장기관계/협업의 배치와 비중 재조정.
  - 1:N은 순위 외에도 후보별 역할/차이/선택 이유가 쉽게 비교되도록 고도화.
  - 새 계산값을 AI가 임의 생성하지 않고 기존 deterministic snapshot 범위에서만 재구성.

## 그로스 해킹 / 프로모션·바이럴 UX

상세 지침은 `docs/PROMOTION_VIRAL_UX.md`를 사용한다. **카카오 전용 메시지/공유 API는 사용하지 않고**, Web Share API·이미지 저장·일반 공유 URL 등 플랫폼 중립 방식만 사용한다.

- [x] Phase P1 — Share 전용 DTO / Shared View 공개 범위 / 권한·privacy 계약 확정
  - 1:1·1:N 공통 public share DTO를 화이트리스트 방식으로 정의.
  - 표시명은 기본 제외하고 사용자 opt-in일 때만 포함.
  - paymentId/accessToken/생년월일시/원본 input/유료 narrative/rawTotal/internal dimensions 공개 금지 계약 추가.
  - 1:N 공개 payload는 최대 3개 후보 하이라이트로 제한.
  - 전용 contract test 및 Core validation workflow 연결.
- [x] Phase P2 — 관계 유형 × 패턴 × tone 카피 라이브러리 구축 및 120~160개 후보 선별
  - [x] P2-1 구조/평가기준 확정: 5 관계유형 × 6 패턴, `clean / tease / curiosity`, Relationship Label / Two Sides / Send This 추천 용도.
  - [x] P2-2 REVIEW ONLY raw 240개 생성: `docs/GROWTH_SHARE_COPY_REVIEW_V1.md`.
  - [x] P2-3 최종 선별: `docs/GROWTH_SHARE_COPY_SELECTIONS_V1.md` 기준 160개 채택 / 80개 제외. 짝사랑 39개는 사용자 직접 선별, 나머지는 사용자 지시에 따라 품질·중복·톤 균형 기준 일괄 선별.
  - [x] P2-4 확정 160개 Production 코드 라이브러리, deterministic pattern/tone/copy selector, 기존 6 archetype 편집 매핑, curiosity mask helper, 중복/금지표현/분포/30셀/P0 용도 contract 추가.
- [x] Phase P3 — Relationship Label / Two Sides / Send This 9:16 공유 카드 UI
  - 기존 1:1 9:16 카드/Web Share/이미지 저장 구현을 재사용해 P2 카피의 `relationship_label / two_sides / send_this` 선택 UI를 연결.
  - 1:N 결과에도 동일 3종 P0 카드 추가. 기존 deterministic ranking/summary metrics 범위에서 패턴과 역할형 하이라이트를 결정하고 새 AI 계산은 만들지 않음.
  - 1:1·1:N 이름 기본 비노출, 사용자 opt-in 시에만 이미지 표시. 결과 access token/결제 결과 URL은 공유하지 않음.
  - 1080×1920 canvas, 9:16 preview, Web Share/이미지 저장/clipboard fallback 및 360px 모바일 계약 검증.
- [x] Phase P4 — token 기반 Shared View + 일반 공유 URL + 신규 궁합 CTA
  - public share 생성은 기존 유료 결과 access token 또는 로그인 보관함 소유권으로 서버에서 권한을 먼저 검증한다.
  - 공개 URL은 별도 256-bit opaque token을 사용하고 DB에는 raw token 대신 SHA-256 hash만 저장한다.
  - 공개 저장 데이터는 P1 whitelist DTO만 허용하며 paymentId/accessToken/생년월일시/원본 input/전체 유료 narrative/internal dimensions는 Shared View 응답에 포함하지 않는다.
  - `/share/[token]`은 비로그인에서도 1:1·1:N 제한 결과를 열고 각각 신규 궁합/비교 CTA를 제공한다.
  - P3 Web Share/clipboard의 홈 URL을 Shared View URL로 교체했다.
  - 보관함 결과 영구 삭제 또는 계정 삭제 시 해당 결제에서 생성한 public share도 같은 DB 작업에서 삭제해 공유 링크 수명을 삭제 정책과 묶었다.
  - Growth P4 contract를 Core Validation에 연결하고 기존 P3/P5 UI의 홈 URL 회귀 계약을 P4 규칙으로 갱신했다.
- [ ] Phase P5 — 공유 수신자 반응 UX + analytics 이벤트 및 퍼널 측정
  - `꽤 맞음 / 반반 / 아닌데` 반응 UI와 반응 후 CTA를 구현한다.
  - `share_card_open`, `share_style_selected`, `share_image_download`, `share_native_open`, `share_link_copy`, `shared_view_open`, `shared_view_reaction`, `shared_view_cta_click`, `shared_view_new_report_start` 최소 이벤트를 연결한다.
  - analytics 저장/전송 실패가 결과 열람·공유·CTA를 차단하지 않도록 best-effort 경계로 구현한다.
- [ ] Phase P6 — Receipt / Recap 카드와 A/B 테스트 기반 확장

핵심 목표: `결과 확인 → 공유 → 상대 반응 → Shared View → 신규 궁합 시작`

## 배포 / 실사용 QA

- [ ] **Production 최신 배포 여부 확인**
  - GitHub 최신 `main` SHA와 Vercel Production 배포 SHA/상태 일치 확인.
  - Hobby build rate limit 등 외부 제한은 코드 실패와 분리 기록.

- [ ] **새 1:1 실제 결제/생성 QA**
  - 실제 결제 → 생성 → 결과 저장 → 보관함 재열람까지 확인.
  - 실제 생성시간과 새 답변 품질 관찰.
  - 5분 이상 반복 정체 시 long-segment timeout/token floor 및 무기한 transient retry 조정.
  - 새 공개 점수 분포와 결과 삭제 기능도 실제 계정에서 확인.

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
- Task: Growth P4 — public share token 기반 Shared View + 일반 공유 URL + 신규 궁합 CTA
- Status: complete
- Validation: PR #37 Core Validation #605 PASS — 기존 전체 contracts, Growth P4 Shared View contract, P3/P5 share UI 회귀 계약, npm run lint, production build 모두 통과
- Commit: main fda8f53d763cd157642d64201396a316733abcda (PR #37 squash merge)
- Remaining: P5 — 공유 수신자 `꽤 맞음 / 반반 / 아닌데` 반응 UX + 최소 analytics 이벤트/퍼널 측정. analytics 실패는 결과 열람/공유를 막지 않게 구현
- Risk: P4는 코드/빌드 계약까지 완료. Production에서 실제 token 생성·비로그인 Shared View·결과 삭제 후 기존 share 404 동작은 배포 후 실사용 QA 필요. P5 analytics/반응은 아직 미구현
- Resume: 새 채팅에서 사용자가 `다음`이라고 입력하면 최신 main/HANDOFF 재확인 후 P5를 시작한다
```