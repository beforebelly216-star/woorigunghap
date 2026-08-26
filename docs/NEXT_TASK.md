# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 최신 사용자 명시 작업 — 무료 천생연분 결과

- [x] 기존 무료 관계 성향 UI/API/결과 생성기 삭제 상태 유지
- [x] `/free` 입력 → `/api/free/soulmate` 결정론 계산 → `/free/result` 연결
- [x] 사주팔자 전체 원국(년월일시/천간지지)을 결과 첫 핵심 데이터로 표시
- [x] 일간 / 성향 키워드 / 강점 / 보완점 4개 요약
- [x] 10개 일간 내부 비교 후 의미 있는 TOP 2~3만 추천
- [x] 천생연분 지수/궁합 확률/퍼센트 미사용
- [x] 오행 구성 / 음양 균형 / 추천 천간·지지 / 특히 잘 맞는 조건 / 주의 구성 구현
- [x] `만남 & 관계 가이드`, `인연 시기 흐름`, 추천 활동/컬러 삭제
- [x] 주토피 Hero + 중간 Commentary + 마지막 해설 + CTA companion 구현
- [x] 1:1 궁합 CTA 연결
- [x] 용신은 EVIDENCE_ONLY 경계 유지, 확정 판정 금지
- [x] 신규 `test:soulmate-result` + Growth 계약 갱신
- [x] **PR #65 / Core calculation validation #778 PASS** — 전체 contracts, lint, production build
- [x] PR #65 → `main` 병합 (`4740c240`)
- [x] Vercel Preview 배포 — branch `preview/soulmate-result-v1`, deploy trigger `7f0b031c`, Vercel success
- [x] Preview 배포 후 branch 자동배포 OFF 원복 (`4182eb52`)
- [ ] Preview 390px 실화면을 승인 레퍼런스와 pixel-level 대조·보정

## Blocker / 운영 검증

- [ ] 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
- [ ] 신규 실제 1:1 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
- [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 UX 확인

## 실기기 QA

- [ ] 360 / 390 / 430px 홈·무료 입력·천생연분 결과·1:1·1:N UX
- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함
- [ ] 회원탈퇴 / 데이터 삭제 / Kakao unlink

## 기본 검증

변경 후 관련 contract + `npm run lint` + `npm run build`.
Preview/Production 배포는 사용자 명시 승인 뒤 수행한다.
Git 자동배포는 OFF 유지.

## Current HANDOFF
```text
HANDOFF
- Worker: GPT
- Task: 무료 천생연분 결정론 결과 엔진 + 승인 390px 결과 UI 구현 + Preview 배포
- Status: complete
- Validation: PR #65 / Core calculation validation #778 PASS — soulmate + 전체 calculation/payment/AI/1:N/account/Growth contracts, lint, production build PASS
- Commit: main merge `4740c240`; Preview trigger `7f0b031c`; Preview auto-deploy OFF `4182eb52`; 상태문서 갱신이 최신 main
- Remaining: Preview 390px 실화면을 승인 레퍼런스와 pixel-level 대조·보정 → 360/390/430 QA
- Risk: 추천은 일간 생극·오행·음양·일지 관계 기반 heuristic이며 용신 확정/확률 표시는 하지 않음. 유료 backend 변경 없음
- Deploy: Preview Vercel success. Production 미수행. Git 자동배포 OFF 유지
```
