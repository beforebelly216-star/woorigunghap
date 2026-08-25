# 우리사주 NEXT TASK

> GPT와 Claude의 공용 실행 큐. GitHub 최신 `main`과 실제 코드가 채팅 기억보다 우선한다.

## 작업 선택 규칙
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement / Growth 고도화

## Blocker / 운영 검증
- [ ] **PR #45 Production 배포 후 실제 1:1 runtime 재검증**
  - [ ] 기존 stuck 주문 회복 확인
  - [ ] 신규 실제 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
  - [ ] AI/transport/dependency 실패 시 종료 메시지 확인

## Hotfix / 실기기 QA
- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크 확인
- [ ] 홈 → `/free` → 유료 CTA → 1:1 prefill 실제 동작 확인
- [ ] 360 / 390 / 430px 핵심 플로우 육안 QA
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴 / 데이터 삭제 / Kakao unlink
- [ ] 결과/계정 삭제 뒤 public share와 analytics 정리 확인

## UI / UX 전면 개편
- [x] 1단계 Design Foundation v2
- [x] 2단계 공통 shell + 홈
- [x] 3단계 무료 분석 입력/결과
- [x] 4단계 1:1 입력/결제
- [x] 5단계 생성중/복구/실패 상태
- [x] 6단계 1:1 완성 결과 IA/레이아웃
- [x] 7단계 1:N 입력/결제/비교 결과
- [x] 8단계 보관함/계정
- [x] **9단계 Shared View / 공유 카드 시각 통합**
  - Shared View를 neutral canvas + typography/divider 위계로 전환
  - 1:1·1:N 9:16 preview와 실제 1080×1920 canvas export를 동일 시각체계로 통일
  - lavender gradient/장식 원/큰 shadow 제거
  - Receipt/Recap/Relationship Label/Two Sides/Send This + P6 A/B experiment 유지
  - public DTO/privacy/opaque token/Web Share/image download/analytics/reaction/new-analysis CTA 유지
  - **Core calculation validation #710 PASS: 전체 contracts + lint + production build**

### 다음 UI 작업
- [ ] **전체 multi-viewport 육안 QA + spacing/overflow 최종 보정**
  - 360 / 390 / 430 / 768 / 1280px
  - 홈, 무료 분석, 1:1 입력/결제/생성/결과, 1:N 입력/결제/결과, 보관함/로그인, Shared View
  - CTA safe-area, 긴 한글 줄바꿈, horizontal overflow, sticky/fixed 충돌, desktop content rail 확인
  - 기능 로직 변경 없이 CSS/markup 최소 보정

## 콘텐츠 개선 backlog
- [ ] 사주소년 화자는 유지하되 정보 전달 우선, 관계 유형별 감정 온도 분리
- [ ] CH0~CH9 구조를 유지하면서 중복/약한 항목 정리
- [ ] 1:N 후보별 역할·차이·선택 이유 비교성 강화
- [ ] 실제 사용자 반응 기반 문체·분량·재미 개선

## 기본 검증
변경 후 관련 contract test + `npm run lint` + `npm run build`. Vercel Preview/Production 배포는 사용자 명시 승인 뒤 별도 수행한다.

## Current HANDOFF
```text
HANDOFF
- Worker: GPT
- Task: UI/UX 9단계 — Shared View + 1:1·1:N 9:16 공유 카드 Foundation v2 시각 통합
- Status: complete
- Validation: Core calculation validation #710 PASS — 전체 contracts + lint + production build
- Commit: 9af42bd 기능/스타일/계약, 상태문서 후속 포함 PR #55
- Remaining: 전체 360/390/430/768/1280 multi-viewport 육안 QA 및 spacing/overflow 최종 보정
- Risk: 실제 배포 렌더링/Web Share/이미지 저장 실기기 QA는 미실행
- Deploy: 없음. Git 자동배포 false 유지, Production 미배포
```
