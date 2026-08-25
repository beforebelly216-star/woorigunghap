# 우리사주 NEXT TASK

> GPT와 Claude의 공용 실행 큐. GitHub 최신 `main`과 실제 코드가 채팅 기억보다 우선한다.

## 작업 선택 규칙

1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement / Growth 고도화

사용자 요청이 더 구체적이면 그 요청을 우선한다. 결제·권한·개인정보·결과 유실·AI 중복비용 회귀가 발견되면 즉시 blocker로 승격한다.

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
- [x] **공통 shell + 홈 Foundation v2 실제 구현**
  - 전역 `body max-width:480px` 제거
  - header/footer 1120px content rail + 640px mobile shell 적용
  - 홈 desktop editorial 2-column / tablet single-column / mobile compact 구조 적용
  - free-first CTA, 상품 가격, 라우팅, 사주소년 화자 유지
  - `theme-unification.css` lavender override 및 shell 강제 media 제거
  - P5 UI 계약을 Foundation v2 action/ink + 820/480 responsive 계약으로 갱신
  - **Core calculation validation #682 PASS: 전체 contracts + lint + production build**
  - 실제 360/390/430/768/1280 육안 렌더링은 배포/브라우저 QA 시 확인

### 이후 순서
- [ ] **3단계 무료 분석 입력/결과 Foundation 적용**
  - `/free` 입력과 무료 결과를 compact 480px 기준으로 재구성
  - 입력 control / section / result insight 위계를 Foundation v2로 통일
  - 해당 화면의 레거시 `max-width:99999px` 규칙만 안전하게 제거
  - free → 1:1 prefill 계약 유지
- [ ] 4단계 1:1 입력/결제
- [ ] 5단계 생성중 상태 UI
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
- Task: UI/UX 2단계 — Foundation v2 공통 shell + 홈 실제 적용
- Status: complete
- Validation: Core calculation validation #682 PASS — 전체 contracts + lint + production build
- Commit: f4fbce9 (기능/CSS/계약), 상태문서 후속 커밋 포함 PR #48
- Remaining: 3단계 `/free` 입력/무료 결과 Foundation 적용 + 해당 화면 레거시 99999px 규칙 제거
- Risk: 후속 입력/결과/1:N CSS에는 전 화면 모바일 강제 규칙이 아직 남아 있음; 실제 multi-viewport 육안 QA는 미실행
- Deploy: 없음. Git 자동배포 false 유지, Production 미배포
```
