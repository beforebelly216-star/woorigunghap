# 우리사주 NEXT TASK

> GPT와 Claude의 공용 실행 큐. GitHub 최신 `main`과 실제 코드가 채팅 기억보다 우선한다.

## 작업 선택 규칙
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement / Growth 고도화

## Blocker / 운영 검증
- [ ] **Production `AI_QUALITY` 결제 결과 차단 hotfix 배포 및 동일 결제 복구 확인**
  - [x] 사용자 화면 문구 → `QUALITY_CRITICAL` 서버 분류 경로 확정
  - [x] 과도한 INTRO 일주/오행 exact-match 및 장문 중복 terminal gate 원인 확인
  - [x] `d9f7cae` 모델 1회 재시도 → 서버 사실 기반 보정 → 재검사 → 저장 복구 구현
  - [x] 재현/관련 계약 8개, lint, production build PASS
  - [x] `5435861` Vercel Production 배포 (`success`, deployment `6087168964`)
  - [ ] 실패한 동일 결제로 생성→저장→재열람 확인
- [x] **1:1 AI 과다 출력·장시간 대기·완성 형식 확정 실패 구조 개선**
- [x] **Claude Haiku 4.5 → Claude Sonnet 5 전환 및 Production 배포**
- [ ] **Production `be983fb` 실제 1:1 runtime 재검증**
  - [ ] 기존 stuck 주문 회복 확인
  - [ ] 신규 실제 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
  - [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 메시지 확인

## Hotfix / 실기기 QA
- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크 확인
- [ ] 홈 → `/free` → 유료 CTA → 1:1 prefill 실제 동작 확인
- [ ] 360 / 390 / 430px 핵심 플로우 육안 QA
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴 / 데이터 삭제 / Kakao unlink
- [ ] 결과/계정 삭제 뒤 public share와 analytics 정리 확인

## UI / UX 전면 재설계 v3 — 사용자 명시 우선 작업

> 현재 배포된 주토피 stock-theme UI/UX/레이아웃은 사용자 평가상 전면 재설계 대상. 세부 CSS 수정부터 시작하지 않는다. `docs/JOOTOPI_UI_REDESIGN.md`가 이번 재설계의 디자인 기준 문서다.

### 전체 단계
- [ ] **1단계 Design Direction / Reference 확정**
  - [ ] 1A Brand Mood — 대부분 확정. 남은 Typography / Iconography / Data visualization / Motion / 신규 포즈 검수
  - [ ] 1B Layout Grammar
  - [ ] 1C Jootopi Character Rules 최종 규격
  - [ ] 1D Reference Board
- [ ] **2단계 홈 화면만 전면 재설계** — 390px mobile-first, 홈 승인 전 핵심 화면 확장 금지
- [ ] **3단계 입력 UX 재설계** — `/free`, 1:1, 1:N
- [ ] **4단계 결제·생성 UX 재설계** — 상품 요약/CTA/대기/복귀/실패·재시도, backend contract 유지
- [ ] 후속: 1:1 결과 → 1:N 결과 → 보관함/공유/계정 → multi-viewport QA

### 1A 핵심 확정값 요약
- 캐릭터 × 핀테크
- Color: White/warm off-white 중심 B 80% + Black×Yellow C 20%
- Shape: Balanced
- Information style: Hybrid
- Character presence: Moment-based 50 + Host 50
- Voice: 무조건 반말; 귀여움 50 / 영리함 35 / 장난기 15; 주식 밈 과다사용 금지
- Placement: Hero 20 / Companion 50 / Micro 30
- Dialogue: Talk 20 / Commentary 65 / Scene 15
- Character Source of Truth: 사용자 제공 원본 주토피 캐릭터 시트. 기존 승인 포즈를 생성형 AI로 임의 재작성하지 않는다.

## 기존 UI / UX v2 완료 이력
- [x] 1~9단계 기존 Design Foundation/공통 shell/홈/무료/1:1/생성/1:N/보관함/Shared View 구현
- 기존 구현은 기능/계약 보존 참고용이며 v3 시각 방향의 기준은 아님.

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
- Task: 주토피 중심 UI/UX 전면 재설계 v3의 1A Brand Mood를 사용자와 단계별 확정하고 다음 대화용 기준 문서 저장
- Status: partial
- Validation: 문서/디자인 결정 작업만 수행; runtime 코드 변경 없음, lint/build 불필요
- Commit: 587f4a9 docs/JOOTOPI_UI_REDESIGN.md 신규 저장; 본 NEXT_TASK 갱신 커밋이 최신
- Remaining: docs/JOOTOPI_UI_REDESIGN.md의 1A 남은 항목부터 진행 — Typography → Iconography → Data visualization → Motion → 신규 7포즈 Production 검수. 이후 1B Layout Grammar → 1C → 1D. 그 뒤 2단계 홈 재설계.
- Risk: 신규 7포즈 extension은 생성 이미지이므로 원본 캐릭터 시트와 100% 동일한 공식 자산으로 간주하지 말 것. 원본 시트에서 분리한 13개 v1.1 에셋이 더 높은 신뢰도의 Identity 자산. 현재 에셋 ZIP은 채팅 산출물이므로 새 세션에서 바이너리 자체가 필요하면 다시 업로드/저장소 편입 필요.
- Deploy: 이번 디자인 문서 작업은 Production 배포 없음. 기존 Production 상태 유지.
```
