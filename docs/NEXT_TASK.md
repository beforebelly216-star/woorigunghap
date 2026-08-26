# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 최신 사용자 명시 작업 — 궁합 점수 v1.5

- [x] 기존 raw 30→public 45 등 숨은 점수 상향 보정 삭제
- [x] 공개 종합점수 절대 범위 **30~100** 고정
- [x] 절대 최대 100점 ceiling 유지
- [x] 관계유형별 별도 최대점 ceiling 삭제 — 모든 관계가 100점까지 가능
- [x] 짝사랑 / 썸 / 연인 / 친구 / 직장동료 5개 관계별 최종 가중치 분리
- [x] 낮은 점수 30~49 해석 구간 추가, 결과가 나쁠 때 억지 가점 금지
- [x] AI score/ranking 불변 경계 유지
- [x] scoring `1.5.0`, engine `compatibility-engine-v1.5.0`
- [x] **PR #66 / Core calculation validation #787 PASS** — 전체 contracts, lint, production build PASS
- [x] PR #66 → `main` 병합 (`41f9852f`)

검증 샘플(동일 두 사람 / 기준연도 2026):
- 연인 74
- 짝사랑 75
- 썸 74
- 친구(한쪽 시간 미상 샘플) 74
- 직장동료(양쪽 시간 미상 샘플) 74
- `raw 30 → 30`, `raw 74 → 74`, `raw 100 → 100`, `100 초과 → 100`

## 다음 사용자 작업 — 1:1 결과 전면 재설계

- [ ] 기존 1:1 결과 UI/UX 및 불필요한 과거 콘텐츠 명세 폐기 범위 확정
- [ ] 핵심 계산·결제·저장·single-flight·privacy 계약만 보존
- [ ] 새 390px 결과 구조 구현
  - 한눈에 보기
  - 두 사람의 사주 원국
  - 끌림 + 시너지
  - 관계 구조
  - 두 사람의 관계 성향
  - 갈등 루프
  - 관계유형별 심층 분석
  - 장기 전망
  - 관계 사용설명서
  - 주토피 마무리
- [ ] 목표 본문 약 5,000자, 허용 약 4,000~6,000자
- [ ] 사용자 입력 별칭 그대로 사용 (`나/상대방/A/B` 사용자 노출 금지)
- [ ] 일상어 결론마다 사주 근거가 자연스럽게 읽히는 Sonnet 5 narrative 설계
- [ ] 내부 시스템 지침은 결과 화면에 노출하지 않음

## Blocker / 운영 검증

- [ ] 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
- [ ] 신규 실제 1:1 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
- [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 UX 확인

## 실기기 QA

- [ ] 천생연분 결과 Preview 390px pixel-level 보정
- [ ] 360 / 390 / 430px 핵심 UX
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
- Task: 궁합 공개점수 무상향 30~100 범위 + 5개 관계유형별 가중치 v1.5
- Status: complete
- Validation: PR #66 / Core calculation validation #787 PASS — 전체 calculation/payment/AI/1:N/account/Growth contracts, lint, production build PASS
- Commit: main merge `41f9852f`; 이 HANDOFF 문서 커밋이 최신 main
- Remaining: 1:1 새 결과 구조/Sonnet 5 narrative/390px UI 구현 시작
- Risk: 관계별 가중치 변경으로 신규 계산 결과는 구버전과 달라질 수 있음. 저장된 기존 구매 결과는 재계산/덮어쓰기 금지
- Deploy: 이번 작업 배포 없음. Production/Preview 자동배포 OFF 유지
```
