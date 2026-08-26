# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 최신 사용자 명시 작업 — 무료 천생연분 + 입력 UI 전면 재구성

- [x] 홈의 1:1 왼쪽에 `무료 천생연분` 진입 추가
- [x] `/free`를 무료 천생연분 입력 화면으로 교체
- [x] 기존 무료 관계 성향 UI/API/결과 생성기 삭제
- [x] 무료 천생연분 결과 계산은 미구현 상태로 유지
- [x] 공통 입력 UI를 첨부 레퍼런스형으로 재구성
- [x] 출생시간 24시간제 HHMM, 오전/오후 선택 없음
- [x] 1:1 입력 UI를 390px 3단계 모바일 레퍼런스형으로 전면 재구성
- [x] 1:N 입력 UI를 같은 모바일 디자인 언어로 전면 재구성
- [x] 결제·계산·AI·저장 backend 계약 유지
- [x] **PR #64 / Core calculation validation #769 PASS** — 전체 contracts, lint, production build
- [ ] PR #64 → `main` 병합
- [ ] 사용자 승인 시 Preview/Production 배포 후 첨부 이미지와 390px pixel-level 대조·보정

## 다음 기능 작업

- [ ] **무료 천생연분 결과 로직 구현**
  - 사용자 사주원국 deterministic snapshot 사용
  - 어떤 오행/일간/지지/기운 조합의 상대가 잘 맞는지 설명 가능한 구조 설계
  - 특정 실제 인물 미래 예측이 아니라 `잘 맞는 상대 사주 특성` 중심
  - 원본 이름/생년월일시를 외부 AI에 직접 전달하지 않는 원칙 유지
  - 결과 화면 UI는 입력 화면 확정 후 별도 설계

## Blocker / 운영 검증

- [ ] 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
- [ ] 신규 실제 1:1 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
- [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 UX 확인

## 실기기 QA

- [ ] 360 / 390 / 430px 홈·무료·1:1·1:N 입력 UX
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
- Task: 무료 천생연분 입력 신설 + 기존 무료 관계성향 제거 + 1:1/1:N 입력 UI 전면 재구성
- Status: complete
- Validation: PR #64 / Core calculation validation #769 PASS — 전체 calculation/payment/AI/1:N/account/Growth contracts, lint, production build PASS
- Commit: PR #64 branch gpt/ui-free-soulmate-v4; main 병합 대기
- Remaining: PR #64 main 병합 → 배포 승인 시 390px 실화면 대조 보정 → 이후 무료 천생연분 deterministic 결과 로직 구현
- Risk: 무료 천생연분 submit은 현재 UI-only 완료 상태이며 실제 결과 계산/API는 의도적으로 미구현. 유료 backend 변경 없음
- Deploy: 미수행. Git 자동배포 OFF 유지
```
