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
  - [ ] 기존 stuck 주문이 saved segment / 5분 stale lock / complete-lock reconciliation을 통해 회복하는지 확인
  - [ ] 신규 실제 결제 → intro → dynamics/action → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
  - [ ] AI/transport/dependency 실패 시 무한 `생성중`이 아니라 분류된 종료 메시지가 표시되는지 확인

## Hotfix / 실기기 QA

- [ ] 실제 1:1·1:N 결과에서 Web Share / 1080×1920 이미지 저장 / public Shared View 링크 확인
- [ ] 홈 → `/free` → 유료 CTA → `/one-to-one?from=free` 본인정보 prefill 실제 동작 확인
- [ ] 360 / 390 / 430px 핵심 플로우 육안 QA
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴 / 데이터 삭제 / Kakao unlink
- [ ] 결과/계정 삭제 뒤 public share와 연계 analytics 정리 확인

## UI / UX 전면 개편

### 1단계 — Design Foundation v2

- [x] **기존 오행 디자인 스펙을 전면 폐기하고 Design Foundation을 처음부터 재정의**
  - Source of Truth: `docs/DESIGN_FIVE_ELEMENT_SYSTEM.md`
  - 레퍼런스 원칙: Co–Star / The Pattern / Toss / Spotify Wrapped의 구조적 장점만 차용
  - neutral canvas + 기능형 오행색 + typography-first + progressive disclosure 확정
  - 컬러 / type scale / spacing / radius / border / shadow / motion / accessibility / 상태 UI 규칙 정의
  - 입력 / 1:1 결과 / 1:N 비교 / 공유 UI 정보구조 정의
  - shared tokens(`src/app/report-theme.css`)을 Foundation v2와 정렬
  - 입력·결제 480 / 1:1 report 640 / 1:N compare 960 반응형 폭 기준 확정
  - 전 화면 480px 강제 원칙 폐기
  - 과거 라벤더/고정 breakpoint 문자열에 과결합된 UI 계약을 기능 계약 중심으로 갱신
  - CI에서 발견한 `vercel.json` Git 자동배포 `true`를 정책대로 `false`로 복구
  - PR #47에서 전체 회귀 + lint + build 최종 확인 후 `main` 병합

### 2단계 — Foundation 실제 화면 적용

- [ ] **공통 shell + 홈부터 새 Foundation으로 실제 구현**
  - 기존 `max-width:99999px` 및 모든 화면 480px 강제 CSS를 한 번에 제거하지 말고 관련 화면부터 안전하게 복원
  - header / footer / page canvas / Button / Input / Card / Section / Chip 위계를 Foundation v2에 맞춤
  - 홈의 free-first 퍼널과 기존 기능/카피 계약은 유지
  - 360 / 390 / 430 / 768 / 1280px 실제 렌더링 확인
  - 해당 화면 계약 + `npm run lint` + `npm run build`

### 이후 순서

- [ ] 3단계 무료 분석 입력/결과
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

가능한 환경에서는 변경 후 최소:

```bash
npm run lint
npm run build
```

관련 contract test를 함께 실행한다. Vercel Preview/Production 배포는 사용자 명시 승인 뒤 별도 수행한다.

## Current HANDOFF

```text
HANDOFF
- Worker: GPT
- Task: UI/UX 1단계 — Design Foundation v2 전면 재작성 및 shared token/계약 정렬
- Status: complete on PR #47; final CI/merge 진행 중
- Validation: 만세력·궁합·결제/AI·1:N·Growth·report contracts 재검증 중; Foundation v2 P5 UI/공유/persona contracts PASS, lint/build는 최종 CI 대기
- Commit: 9f88799 (Foundation 구현/테스트 + Vercel 자동배포 false 복구; 상태문서 커밋은 후속)
- Remaining: PR #47 CI 전체 PASS 후 main 병합 → 2단계 공통 shell/홈 적용 + 레거시 전 화면 480px 강제 CSS를 화면별로 제거
- Risk: 기존 화면 CSS에 max-width:99999px/480px 강제 흔적이 남아 새 responsive 원칙과 충돌; 2단계에서 실제 렌더링 QA 필수
- Deploy: 없음. Production은 사용자 승인 전 건드리지 않음
```
