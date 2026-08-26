# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 최신 사용자 명시 작업 — 홈 A99

- [x] 과거 home free-first / neutral desktop landing UI 결정 폐기
- [x] 사용자가 2026-08-27 첨부한 **A안 390px 레퍼런스**를 홈 최우선 기준으로 전환
- [x] 390px 앱형 단일 컬럼 재구성
- [x] 상단 우리사주 + 알림
- [x] 크림 hero + 주토피
- [x] 1:1 / 1:N 2열 직접 진입 카드
- [x] 오늘의 궁합 TOP 3
- [x] 관계 흐름 주간 chart
- [x] 주토피 오늘의 한마디
- [x] 하단 고정 4탭 내비게이션
- [x] 기존 글로벌 footer 홈에서 제거
- [x] 관련 1:N / Growth / report UI 계약을 새 홈 기준으로 갱신
- [x] **Core calculation validation #761 PASS** — 최종 head 전체 contracts, lint, production build
- [x] PR #63 → `main` 병합 (`cf8e1ffb`)
- [ ] 사용자 배포 승인 시 Vercel Production 배포
- [ ] Production 390px 화면을 첨부 레퍼런스와 직접 대조하고 pixel-level 보정

## Blocker / 운영 검증

- [ ] 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
- [ ] 신규 실제 1:1 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
- [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 UX 확인

## 실기기 QA

- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크
- [ ] 360 / 390 / 430px 홈·입력·결제 UX
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함
- [ ] 회원탈퇴 / 데이터 삭제 / Kakao unlink

## 결제·생성 v3

- [x] PR #62 / validation #752 PASS
- [x] main 병합 `ef8ea140`
- [ ] Vercel Production 배포 — 사용자 명시 승인 필요
- [ ] Production 결제·대기·실패 상태 육안 QA

## 기본 검증

변경 후 관련 contract + `npm run lint` + `npm run build`.
Production 배포는 사용자 명시 승인 뒤 수행한다.
Git 자동배포는 OFF 유지.

## Current HANDOFF
```text
HANDOFF
- Worker: GPT
- Task: 사용자 첨부 A안 레퍼런스를 기준으로 홈을 390px 앱형 구조로 전면 재작성
- Status: complete
- Validation: PR #63 / Core calculation validation #761 PASS — 전체 contracts, lint, production build PASS
- Commit: 기능 병합 `cf8e1ffb`; 이후 PROJECT_STATE/NEXT_TASK 문서 갱신이 최신 main
- Remaining: 사용자 배포 승인 시 Production 배포 → 390px 레퍼런스와 실화면 직접 대조하여 pixel-level 보정
- Risk: 홈 TOP3/차트는 레퍼런스 재현용 정적 샘플 UI. 결제·계산·AI·저장 backend는 변경 없음
- Deploy: 미수행. Git 자동배포 OFF 유지
```
