# 우리사주 NEXT TASK

> GPT와 Claude의 공용 실행 큐. GitHub 최신 `main`과 실제 코드가 채팅 기억보다 우선한다.

## 작업 선택 규칙
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement / Growth 고도화

## Blocker / 운영 검증
- [x] **1:1 AI 과다 출력·장시간 대기·완성 형식 확정 실패 구조 개선**
  - 목표 분량을 공백 제외 약 2,500~4,000자로 축소하고 CH0~CH9·관계별 편집 기준 유지
  - 암묵적 token 확대를 제거하고 segment별 1차/재시도 ceiling, timeout, 총 요청 예산을 명시
  - structured output 우선 + 기존 JSON fallback, transient/max_tokens 제한 재시도, 요청 단위 관측 로그 추가
  - 원자 저장, 완료 segment 재사용, single-flight/idempotency 및 결제 검증 경계 유지
  - `f758c4f` — 관련 contracts, lint, production build PASS
- [x] **Claude Haiku 4.5 → Claude Sonnet 5 전환 및 Production 배포**
  - `claude-sonnet-5` 기본화, 기존 Haiku 운영 환경변수 자동 마이그레이션
  - adaptive thinking 비활성화로 bounded JSON 출력 예산 보호, 1:1·1:N structured output 우선
  - `be983fb` Production 배포 status `success`; Git 자동배포 다시 비활성화
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
- Task: 유료 1:1·1:N AI를 Claude Sonnet 5로 전환하고 1:1 생성 hotfix와 함께 Production 배포
- Status: complete — 코드·계약·정책·Production 배포 완료
- Validation: 모델/1:1·1:N 관련 계약 8개 PASS; lint 오류 0건(기존 warning 3건); production build PASS
- Commit: be983fb 모델/테스트/배포 트리거, 상태문서·자동배포 off 후속 커밋 별도
- Remaining: 기존 stuck 주문 및 신규 실제 결제로 1:1 생성→저장→재열람 시간과 Sonnet 5 구조화 로그 확인
- Risk: Vercel runtime log 직접 조회 불가; 실제 Sonnet 5 paid runtime은 미검증
- Deploy: Production success · be983fb · Git 자동배포 false 복구
```
