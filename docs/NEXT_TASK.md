# 우리사주 NEXT TASK

> GPT와 Claude의 공용 실행 큐. GitHub 최신 `main`과 실제 코드가 채팅 기억보다 우선한다. 완료 이력은 최소화하고 실제 미완료 작업을 위에서부터 수행한다.

## 작업 선택 규칙
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement / Growth 고도화

## Blocker / 운영 검증

- [ ] **기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인**
  - 구현된 `QUALITY_CRITICAL` 복구 hotfix와 실패 lock 해제는 Production 반영 완료
  - 실제 실패했던 동일 결제 또는 재현 가능한 paid order가 있어야 최종 확인 가능
- [ ] **실제 1:1 paid runtime 재검증**
  - [ ] 기존 stuck 주문 회복 확인
  - [ ] 신규 실제 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
  - [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 메시지 확인

## Hotfix / 실기기 QA

- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크 확인
- [ ] 홈 → `/free` → 유료 CTA → 1:1 prefill 실제 동작 확인
- [ ] **v3 홈·`/free`·1:1·1:N 360 / 390 / 430px Production 육안 QA**
  - 현재 자동 브라우저/Vercel connector에서 Production project/deployment 접근이 제한되어 실기기 또는 접근 가능한 브라우저에서 확인 필요
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴 / 데이터 삭제 / Kakao unlink
- [ ] 결과/계정 삭제 뒤 public share와 analytics 정리 확인

## UI / UX 전면 재설계 v3

기준: `docs/JOOTOPI_UI_REDESIGN.md`

- [x] **1단계 Design Direction / Reference 확정**
  - Typography B / Iconography B / Data Visualization A / Motion A / Layout Grammar A / Character Rules B
  - [ ] 캐릭터 시트·신규 포즈 최종 Production 검수 — 후순위 보류
- [ ] **2단계 홈 화면 재설계**
  - [x] 코드 구현 / 자동검증 / Production 배포
  - [ ] 실제 390px 화면 확인
- [x] **3단계 입력 UX 재설계**
  - [x] `/free` v3 + 24시간 HHMM
  - [x] 1:1 B안 `내 정보+관계 → 상대방 정보 → 확인`
  - [x] 1:N B안 `기본 정보 → 후보 정보 → 확인`, 후보 2~5명
  - [x] Production 배포
  - [ ] 360/390/430px 실기기 QA
- [ ] **4단계 결제·생성 UX 재설계**
  - [x] 1:1 결제: 입력 완료 → 결제 → 리포트 생성 단계 표시
  - [x] 1:N 결제: 입력 완료 → 결제 → 비교 생성 단계 표시
  - [x] 상품 요약 / 제공 내용 / 가격 / 저장·복구 안내 재구성
  - [x] 모바일 sticky 결제 CTA
  - [x] 1:1 생성 대기 v3 상태 surface
  - [x] 1:N 생성·복구·실패 v3 상태 surface
  - [x] 기존 결제·AI·저장·single-flight/idempotency contract 유지
  - [x] **PR #62 / Core calculation validation #752 PASS** — 전체 contracts, lint, production build
  - [x] PR #62 → `main` 병합 (`ef8ea140`)
  - [ ] **Vercel Production 배포 — 별도 사용자 승인 필요**
  - [ ] Production 360/390/430px 결제·대기·실패 상태 육안 QA
- [ ] **후속 v3:** 1:1 결과 → 1:N 결과 → 보관함/공유/계정 → multi-viewport QA

## 콘텐츠 개선 backlog

- [ ] 사주소년 화자는 유지하되 정보 전달 우선, 관계 유형별 감정 온도 분리
- [ ] CH0~CH9 구조를 유지하면서 중복/약한 항목 정리
- [ ] 1:N 후보별 역할·차이·선택 이유 비교성 강화
- [ ] 실제 사용자 반응 기반 문체·분량·재미 개선

## 기본 검증

변경 후 관련 contract test + `npm run lint` + `npm run build`.
Vercel Preview/Production 배포는 사용자 명시 승인 뒤 별도 수행한다.
Git 자동배포는 기본 비활성화 상태를 유지한다.

## Current HANDOFF
```text
HANDOFF
- Worker: GPT
- Task: v3 4단계 1:1·1:N 결제·생성 UX 재설계 및 main 병합
- Status: complete
- Validation: PR #62 / Core calculation validation #752 PASS — 만세력·궁합·결제/AI·1:N·account/editorial/policy/Growth/system QA, lint, production build PASS
- Commit: 기능 병합 `ef8ea140`; PROJECT_STATE 갱신 `ba3e428b`; 본 HANDOFF 갱신이 최신 main 문서 상태
- Remaining: 사용자 배포 승인 시 PR #62 결제·생성 UX를 Vercel Production 배포 → 360/390/430px 결제/생성 상태 육안 QA. 별도로 실제 paid runtime 생성→저장→재열람 QA가 남음
- Risk: backend 계산·결제·AI·저장·single-flight/idempotency 변경 없음. Production 화면 자동 QA는 현재 Vercel connector project/deployment 접근 제한으로 수행 불가
- Deploy: 이번 작업에서는 미수행. Git 자동배포 OFF 유지
```
