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
- [x] **PR #69 / Core calculation validation #809 PASS** — 최종 문서 head 포함 전체 contracts + lint + production build PASS
- [x] PR #69 → `main` 병합 (`4803fa7a`)

### P3 실화면 QA
- [ ] 사용자 승인 후 1:1 layout v3 + narrative v8 + loading Preview 배포
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
- Task: 1:1 layout v3 전용 5천자 Sonnet 5 narrative v8 + 주토피 떡상 기원 생성 대기 UX
- Status: complete
- Validation: PR #69 / Core calculation validation #809 PASS — calculation/payment/AI/1:N/account/Growth contracts + lint + production build PASS
- Commit: main merge `4803fa7a`; 이 HANDOFF 문서 커밋이 최신 main
- Remaining: 사용자 승인 시 Preview 배포 → 실제 Sonnet 5 한 건으로 4,000~6,000자/390px 장문 QA
- Risk: 프롬프트·품질 길이 계약은 구현/정적 검증 완료했으나 실제 Anthropic 호출 샘플의 최종 사용자 노출 글자수는 Preview 실생성에서 확인 필요. 기존 저장 구매 결과는 재생성/덮어쓰기 금지
- Deploy: 없음. Production/Preview 자동배포 OFF 유지
```
