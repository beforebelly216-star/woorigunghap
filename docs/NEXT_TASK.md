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
- [ ] **v3 홈·`/free`·1:1·1:N 360 / 390 / 430px Production 육안 QA**
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴 / 데이터 삭제 / Kakao unlink
- [ ] 결과/계정 삭제 뒤 public share와 analytics 정리 확인

## UI / UX 전면 재설계 v3 — 사용자 명시 우선 작업

> `docs/JOOTOPI_UI_REDESIGN.md`가 v3 디자인 기준 문서다. 현재 Production 스킨을 부분 보정하지 않고 승인된 v3 언어를 화면별로 확장한다.

### 전체 단계
- [x] **1단계 Design Direction / Reference 확정**
  - [x] 1A Brand Mood — Typography B / Iconography B / Data Visualization A / Motion A
  - [x] 1B Layout Grammar — A, 정보 우선 클린 그리드
  - [x] 1C Jootopi Character Rules — B, 적절한 캐릭터 균형
  - [x] 1D Reference Board — 사용자 승인
  - [ ] 캐릭터 시트·신규 포즈 최종 Production 검수 — 사용자 요청으로 후순위 보류
- [ ] **2단계 홈 화면만 전면 재설계** — A안 코드/자동검증/Production 배포 완료, 실제 390px 화면 확인만 남음
  - [x] 390px mobile-first 정보 우선 레이아웃 구현
  - [x] free-first 유지: 홈 직접 1:1/1:N 유료 전환 제거
  - [x] White/Off-white + Black/Yellow, 주토피 guide 역할 적용
  - [x] 관련 Growth/UI/1:N 정적 계약 갱신
  - [x] **Core calculation validation #732: 전체 contracts + lint + production build PASS**
  - [x] PR #58 → `main` 병합 (`0c8554c`)
  - [x] PR #61 배포 배치에서 v3 홈 포함 Production 반영
  - [ ] 실제 390px 화면 확인
- [x] **3단계 입력 UX 재설계** — `/free` → 1:1 → 1:N 코드 구현 및 Production 배포 완료
  - [x] `/free` v3 입력 화면 구현: 단일 정보 카드, 주토피 guide, Black/Yellow CTA, 긴 설명 축소
  - [x] 공용 출생시간 입력을 **24시간제 HHMM**으로 변경하고 오전/오후 선택 제거
  - [x] 기존 12시간제 form state 복구 시 24시간제로 표시·정규화하는 호환 레이어 유지
  - [x] **PR #59 / Core calculation validation #736: 전체 contracts + lint + production build PASS**
  - [x] PR #59 → `main` 병합 (`5af70d3`)
  - [x] PR #61 배포 배치에서 `/free` v3 Production 반영
  - [ ] `/free` 실제 390px 화면 확인
  - [x] **1:1 입력 UX B안 구현** — `내 정보+관계 → 상대방 정보 → 확인` 3단계
    - [x] free prefill / 관계유형 / 관계기간 / 직장동료 위계 유지
    - [x] 24시간 HHMM / 출생시간 모름 유지
    - [x] 확인 단계 두 사람 요약 + 수정 진입
    - [x] 결제 복구 / 주문 draft / 결제 진입 계약 유지
    - [x] 개인정보 별칭·AI 비전달 안내 유지
    - [x] **PR #60 / Core calculation validation #742: 전체 contracts + lint + production build PASS**
    - [x] PR #60 → `main` 병합 (`b96562d`)
    - [x] PR #61 배포 배치에서 1:1 v3 Production 반영
    - [ ] 실제 390px 화면 확인
  - [x] **1:N 입력 UX B안 구현** — `기본 정보 → 후보 정보 → 확인` 3단계
    - [x] 후보 2~5명 선택 / 후보별 탭 편집 / 추가·삭제
    - [x] 24시간 HHMM / 출생시간 모름 / 기존 draft 복원 유지
    - [x] 확인 단계 관계·기준자·후보 전체 요약 + 수정 진입
    - [x] localStorage draft / 주문 draft / 3,000원 결제 진입 계약 유지
    - [x] **PR #61 / Core calculation validation #746: 전체 contracts + lint + production build PASS**
    - [x] PR #61 → `main` 병합 (`79d8307a`)
    - [x] Vercel Production 배포 성공 (`430c5538`, Vercel status `success`)
    - [x] Git 자동배포 재비활성화 (`41730e8b`)
    - [ ] 실제 390px 화면 확인
- [ ] **4단계 결제·생성 UX 재설계** — 상품 요약/CTA/대기/복귀/실패·재시도, backend contract 유지
- [ ] 후속: 1:1 결과 → 1:N 결과 → 보관함/공유/계정 → multi-viewport QA

### v3 확정 조합
- Typography: **B** — 캐릭터 × 핀테크 균형
- Iconography: **B** — Line + Solid 하이브리드
- Data Visualization: **A** — 미니멀·클린, 주식 요소 낮음
- Motion: **A** — 필요한 순간의 최소 모션
- Layout Grammar: **A** — 정보 우선 클린 그리드
- Character Rules: **B** — 가이드형 균형 배치
- Character Source of Truth: 사용자 제공 원본 주토피 캐릭터 시트. 이미지/신규 포즈 최종 확정은 후순위.

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
- Task: 사용자 승인 B안 기준 v3 1:N 입력 UX 구현, main 병합, Vercel Production 배포
- Status: complete
- Validation: PR #61 / Core calculation validation #746 PASS — 전체 contracts, lint, production build PASS; Vercel status success
- Commit: 기능 병합 `79d8307a`; 배포 트리거 `430c5538`; 자동배포 OFF 복구 `41730e8b`; 이후 상태 문서 갱신
- Remaining: Production 360/390/430px 홈·free·1:1·1:N 실기기 QA → 4단계 결제·생성 UX 재설계
- Risk: backend 계산·AI·저장·결제 계약 변경 없음. paid runtime 생성→저장→재열람 QA는 별도 미완료
- Deploy: Production 완료. Git 자동배포는 다시 비활성화 상태
```
