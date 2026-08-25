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
### 1단계 — Design Foundation v2
- [x] Foundation v2 전면 재정의 + shared token 정렬 + responsive 폭 기준 확정

### 2단계 — 공통 shell + 홈
- [x] 공통 shell + 홈 Foundation v2 실제 구현

### 3단계 — 무료 분석 입력/결과
- [x] `/free` Foundation v2 적용

### 4단계 — 1:1 입력/결제
- [x] **1:1 입력/checkout Foundation v2 적용**
  - compact 480px 전용 layout owner `one-to-one-flow.module.css` 추가
  - legacy `.input-page/.input-shell` 의존 제거
  - checkout의 `report-p5-mobile.css` 직접 import 제거
  - relationship / step progress / PersonBirthFields / textarea / nav button 위계 통일
  - checkout summary / unlock preview / 정책 동의 / sticky payment CTA 통일
  - free prefill / order recovery / 정책 동의 / 1,000원 / 결제 검증 계약 유지
  - **Core calculation validation #690 PASS: 전체 contracts + lint + production build**

### 이후 순서
- [ ] **5단계 생성중 상태 UI Foundation 적용**
  - 결제 완료 후 준비/생성/복구/실패 상태를 Foundation v2 hierarchy로 통일
  - 무한 생성중 방지·재시도·종료 메시지 hotfix 계약 유지
  - 생성 상태에서 broad mobile/legacy visual override 제거
- [ ] 6단계 1:1 결과 IA/레이아웃 전면 적용
- [ ] 7단계 1:N 입력/결제 및 비교 결과
- [ ] 8단계 보관함/계정
- [ ] 9단계 Shared View / 공유 카드 시각 통합

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
- Task: UI/UX 4단계 — 1:1 입력/checkout Foundation v2 적용
- Status: complete
- Validation: Core calculation validation #690 PASS — 전체 contracts + lint + production build
- Commit: 17cda92 기능/스타일/계약, 상태문서 후속 포함 PR #50
- Remaining: 5단계 결제 후 생성중/복구/실패 상태 UI Foundation 적용
- Risk: 1:1 결과/1:N/보관함/공유 화면에는 레거시 broad mobile CSS가 아직 남아 있음; 실제 multi-viewport 육안 QA 미실행
- Deploy: 없음. Git 자동배포 false 유지, Production 미배포
```
