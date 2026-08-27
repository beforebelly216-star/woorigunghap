# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 완료 — 궁합 점수 v1.6

- [x] 숨은 점수 상향 보정 삭제
- [x] 공개 종합점수 절대 범위 **30~100**, 절대 최대 100 유지
- [x] 관계유형별 별도 ceiling 삭제
- [x] 짝사랑 / 썸 / 연인 / 친구 / 직장동료별 최종 가중치 분리
- [x] 실제 도달 가능한 deterministic raw 구간을 공개 30~100에 정규화
- [x] scoring `1.6.0`, engine `compatibility-engine-v1.5.0`
- [x] PR #67 → `main` (`ef66e7c1`), validation #791 PASS

## 최신 사용자 작업 — 1:1 결과 전면 재설계

### P1 레이아웃
- [x] 기존 CH0~CH9 직접 렌더 중심 UI를 새 결과 화면 기준에서 폐기
- [x] 계산·결제·복구·저장·single-flight·privacy·공유·보관함 계약 보존
- [x] 새 390px 결과 layout v3 구현
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
- [x] 사용자 입력 별칭을 핵심 인물 라벨에 그대로 사용
- [x] 360 / 390 / 430px responsive contract 추가
- [x] **PR #68 / Core calculation validation #799 PASS** — 전체 contracts, lint, production build PASS
- [ ] PR #68 → `main` 병합

### P2 콘텐츠 / Narrative
- [ ] 새 layout v3 정보 구조 전용 Sonnet 5 schema/prompt 설계
- [ ] 목표 본문 약 5,000자, 허용 약 4,000~6,000자
- [ ] 일상어 결론마다 서버 사주 근거가 자연스럽게 따라오도록 매핑
- [ ] 관계유형별 심층 섹션을 짝사랑/썸/연인/친구/직장동료별 차별화
- [ ] 내부 시스템 지침·A/B·서버/AI 경계 문구 사용자 결과에 노출 금지
- [ ] 저장된 기존 구매 결과 backward-compatible 표시 유지

### P3 실화면 QA
- [ ] 1:1 layout v3 Preview 배포 승인 후 390px pixel-level 대조
- [ ] 360 / 390 / 430px overflow/spacing/텍스트 길이 QA
- [ ] 공유 카드·보관함 귀속 UI가 새 레이아웃에서 자연스럽게 이어지는지 실브라우저 확인

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
- Task: 1:1 유료 결과 390px 모바일 layout v3 1차 구현
- Status: complete
- Validation: PR #68 / Core calculation validation #799 PASS — 전체 calculation/payment/AI/1:N/account/Growth contracts + lint + production build PASS
- Commit: PR #68 branch latest; main 병합 대기
- Remaining: PR #68 main 병합 → 새 구조 전용 Sonnet 5 narrative schema/prompt 및 4,000~6,000자 콘텐츠 매핑
- Risk: 현재 화면은 기존 v7 생성 콘텐츠를 새 구조에 재배치한 단계. 저장된 기존 구매 결과 재생성/덮어쓰기 금지
- Deploy: 없음. Production/Preview 자동배포 OFF 유지
```
