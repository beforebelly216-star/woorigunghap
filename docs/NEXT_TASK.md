# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 완료 — 궁합 점수 v1.6

- [x] 공개 종합점수 **30~100**, 절대 최대 100
- [x] 관계유형별 별도 ceiling 삭제 / 5개 관계유형별 가중치 분리
- [x] 약한 결과 숨은 상향 보정 삭제
- [x] PR #67 → `main` (`ef66e7c1`), validation #791 PASS

## 최신 사용자 작업 — 1:1 결과 전면 재설계

### P1 레이아웃
- [x] 기존 CH0~CH9 직접 렌더 중심 UI 폐기
- [x] 새 390px layout v3: 한눈에 보기 → 두 사람 사주 → 끌림+시너지 → 관계 구조 → 관계 성향 → 갈등 루프 → 관계유형 심층 → 장기 전망 → 관계 사용설명서 → 주토피 마무리
- [x] 입력 별칭 사용, 360/390/430 responsive contract
- [x] PR #68 → `main` (`27d47ebe`), validation #799 PASS

### P2 콘텐츠 / Narrative
- [x] layout v3 전용 Sonnet 5 narrative v8 구현
- [x] 기존 `intro/dynamics/action` 저장·single-flight 계약 유지
- [x] 목표 본문 **약 5,000자, 허용 4,000~6,000자**
- [x] 세그먼트 목표: intro 1,050~1,400 / dynamics 1,450~1,900 / action 1,800~2,400
- [x] 실제 화면 사용 필드에 분량 집중, 저장 호환 보조 필드는 짧게 유지
- [x] 일상어 결론과 일간·일지·오행·천간/지지 상호작용 근거를 같은 문맥에 배치
- [x] 짝사랑/썸/연인/친구/직장동료별 심층 해석 규칙 유지
- [x] `나/상대방/A/B` 사용자 호칭 금지, 입력 별칭 서버 치환 유지
- [x] 내부 시스템 지침/점수 변경/근거 없는 수치·심리·미래 예측 금지
- [x] 기존 구매 결과 backward-compatible 표시 유지

### P2.5 생성 대기 UX
- [x] 주토피 `궁합 떡상 기원` 전면 일러스트 추가
- [x] 실제 생성 단계 문구 + animated progress visual
- [x] 가짜 정밀 퍼센트 대신 단계 기반 진행 경험
- [x] 390px 모바일 / reduced-motion 대응
- [x] PR #69 → `main` (`4803fa7a`), validation #809 PASS

### Hotfix — 결제 직후 결과 생성 즉시 실패
- [x] Preview 실결제에서 `UNEXPECTED_SERVER_ERROR` 424 즉시 fatal 재현 확인
- [x] transient state 오류는 서버 1회 재확인 후 503 `retryable: true`로 변환
- [x] 기존 클라이언트가 같은 결제로 자동 재시도하도록 연결
- [x] 영구적인 인증/권한/입력 오류는 fatal 유지
- [x] 실패 화면을 주토피 떡상 로딩 화면과 동일한 390px UI로 통일
- [x] **PR #70 / Core calculation validation #812 PASS** — 전체 contracts + lint + production build PASS
- [x] resilient rewrite를 실제 filesystem API보다 먼저 적용하도록 `beforeFiles`로 수정 — PR #71 → `main` (`1766cf1e`)
- [x] 동일 Preview 재배포 후 즉시 fatal이 사라지는 것 확인

### Blocker hotfix — 0/3 prepare 무한대기
- [x] 기존 Preview에서 `0/3개 해설 묶음 완료 · 401초 경과` 재현 확인
- [x] 원인 코드 경로 확인: `/api/payments/verify`에서 이미 검증한 결제를 1:1 생성 `prepare/intro/dynamics/action` 단계마다 PortOne에 다시 조회
- [x] PortOne 재조회 실패가 resilient 503으로 변환되면서 `prepare` 단계가 무한 재시도되는 구조 확인
- [x] 생성 단계는 서버 주문이 `paid`이고 미삭제이며 상품/금액/입력 해시가 모두 일치할 때만 저장된 서버 결제 영수증 재사용
- [x] 최초 결제 검증은 계속 PortOne 권위 유지
- [x] 전용 `test:hotfix:paid-result-stuck-prepare` contract 추가
- [ ] PR #72 validation (`npm run lint`, `npm run build`, 전용 contract) 확인
- [ ] PR #72 → `main` 병합
- [ ] 사용자 승인 후 `preview/one-to-one-v8` 재배포
- [ ] 기존 1,000원 결제로 새로고침 → prepare 통과 → 3개 segment → 결과 저장 확인

### P3 실화면 QA
- [ ] 실제 Sonnet 5 생성 1건에서 사용자 노출 본문 4,000~6,000자 확인
- [ ] 390px pixel-level 대조 및 360/430px overflow/spacing/장문 카드 QA
- [ ] 공유 카드·보관함 귀속 UI 실브라우저 확인

## Blocker / 운영 검증

- [ ] 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
- [ ] 신규 실제 1:1 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
- [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 UX 확인

## 기타 실기기 QA

- [ ] 천생연분 결과 Preview 390px pixel-level 보정
- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함

## 기본 검증

변경 후 관련 contract + `npm run lint` + `npm run build`.
Preview/Production 배포는 사용자 명시 승인 뒤 수행한다.
Git 자동배포는 OFF 유지.

## Current HANDOFF
```text
HANDOFF
- Worker: GPT
- Task: 1:1 결제 완료 후 0/3 prepare 단계가 수백 초 무한대기하는 blocker hotfix
- Status: partial
- Validation: 전용 contract 추가 완료. PR #72에서 lint/build/contract 확인 대기
- Commit: gpt/hotfix-paid-result-stuck-prepare latest (PR #72)
- Remaining: PR #72 validation → main 병합 → 사용자 승인 후 preview/one-to-one-v8 재배포 → 기존 1,000원 결제로 실제 생성 확인
- Risk: Vercel runtime log connector가 해당 프로젝트를 직접 열지 못해 실제 하위 예외 텍스트는 미확인. 코드상 반복 PortOne 재검증 + resilient 503 무한루프는 확정적으로 제거함
- Deploy: 아직 안 함. Git 자동배포 OFF 유지
```
