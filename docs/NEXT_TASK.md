# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 완료 — 전 화면 mobile app theme v4

- [x] 새 1:1 결과의 390px 보라–핑크 UI를 전 제품 공통 기준으로 확정
- [x] 홈·로그인·보관함·정책·결제·결제 상태·1:N 결과·Shared View 일괄 적용
- [x] 1:1/1:N 1080×1920 공유 이미지 팔레트 통일
- [x] 루트 레이아웃의 구버전 전역 CSS import 전면 제거
- [x] 1:N 후행 route CSS 우선순위 보정 및 rounded mobile card 강제
- [x] 관련 contracts + TypeScript + lint(0 errors, 기존 warnings 5) + production build PASS
- [x] 360/390/430px 홈·로그인·1:N 데모 실브라우저 QA — overflow/오류 overlay 없음
- [x] `main` 푸시 및 Preview 배포 — source `3b09c34`, trigger `69388ee`, Vercel SUCCESS, 자동배포 OFF `4208ec1`

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

### BLOCKER — 결제 확인 / 0-of-3 무한대기 전수조사

이전 PR #70~#73은 각각 일부 오류 경로를 막았으나 실기기 Preview에서 `0/3` 장기대기와 이후 `결제를 확인하고 있어요` 반복이 재현되어 **완전 해결 판정은 취소**한다.

- [x] 결제 → PortOne 조회 → Neon 주문 → 결과 prepare → AI segment → 저장 → 브라우저 retry 관련 코드 일괄 전수조사
- [x] `markServerOrderPaid()` 계열에서 실제 UPDATE 0건도 성공으로 취급될 수 있던 결함 확인
- [x] `/api/payments/verify`가 입력값을 사용하지 않은 채 PortOne 결제를 확인하던 경로 제거
- [x] 결제 검증은 `product + exact input`을 함께 검증하고, PortOne input binding 유지
- [x] PortOne에서 검증된 결제만 authoritative server order를 `UPDATE ... RETURNING`으로 paid 확정
- [x] 서버 주문 행이 유실된 경우에도 PortOne customData가 정확한 입력을 bind한 주문만 동일 paymentId/accessToken으로 복구
- [x] PortOne 조회 10초 / trusted server receipt 조회 6초 timeout 추가
- [x] webhook도 paid UPDATE 결과 1건을 확인하지 못하면 성공 ACK하지 않고 재시도 가능하게 변경
- [x] 1:1 API를 두 번 호출하던 `one-to-one-resilient` wrapper와 `beforeFiles` rewrite 전면 제거 — filesystem `/api/compatibility/one-to-one` 단일 권위 경로
- [x] 결제 redirect 무한 `while` polling 제거 — 최대 7회 + 요청당 12초 timeout
- [x] 서버 장애/저장 지연 시 재결제 CTA를 노출하지 않고 `같은 결제 다시 확인`만 제공
- [x] Day 8 / paid-result hotfix 계약을 새 bounded 정책으로 갱신
- [x] **PR #75 / Core calculation validation #832 PASS** — payment/narrative/1:N/account/Growth contracts + lint + production build PASS
- [x] PR #75 → `main` (`ab8a6006`)
- [x] 동일 `preview/one-to-one-v8` 재배포 — trigger `8a8f903f`, Vercel SUCCESS, 자동배포 OFF 복구 (`a5fba970`)
- [x] 첨부 실기기 오류 문구가 `PAYMENT_STORE_NOT_CONFIGURED`이며 해당 배포 런타임의 `DATABASE_URL` 부재를 뜻하는 것을 코드로 재확인
- [x] 1:1 서버 주문 저장 실패 시 브라우저 전용 주문으로 결제까지 진행하던 fallback 제거
- [x] PortOne 호출 전 서버 주문/access token/상품·금액/입력 hash/삭제·기결제 상태 preflight 추가
- [x] 이미 paid인 주문은 PortOne을 다시 열지 않고 기존 결과로 이동
- [x] 서버 설정 누락은 7회 자동 재시도하지 않고 즉시 같은 결제 수동 재확인 상태로 종료
- [x] 결제 preflight/verify 구조화 오류 로그 추가
- [x] local validation — paid-result/day8/runtime UI/server-store/1:N paid E2E/1:1 form contracts + lint + production build PASS
- [ ] 실패한 Preview 대상에 `DATABASE_URL` 연결 여부 확인 및 hotfix 배포 (사용자 승인 필요)
- [ ] 기존 1,000원 결제로 `payment verify → prepare → intro → dynamics → action → 저장` 실동작 확인

### P3 실화면 QA
- [ ] 실제 Sonnet 5 생성 1건에서 사용자 노출 본문 4,000~6,000자 확인
- [ ] 390px pixel-level 대조 및 360/430px overflow/spacing/장문 카드 QA
- [ ] 공유 카드·보관함 귀속 UI 실브라우저 확인

### BLOCKER — 1:1 action 2/3 형식 오류

- [x] Vercel Preview 런타임 로그에서 `ACTION_INVALID_JSON` / `ACTION_SCHEMA_MISMATCH` 422 재현 근거 확인
- [x] ACTION AI 스키마를 실제 화면 핵심 필드로 축소
- [x] `situationStrategy` / `actionPlan30` 서버 결정론 조립으로 저장·기존 UI 호환 유지
- [x] 안전한 JSON 스키마 mismatch 경로 로그 및 재시도 지시 추가
- [x] `AI_FORMAT` 같은 결제 자동 재시도 1회로 제한
- [x] 재실패 시 새로고침 없는 `같은 결제로 다시 시도` 버튼 추가
- [x] 관련 contracts + TypeScript + lint + production build PASS
- [x] Preview 배포 — source `8051e2f`, trigger `a875c09`, Vercel SUCCESS, 자동배포 OFF `07e3858`
- [ ] 기존 결제에서 action 저장 및 즉시 결과 전환 실확인

## Blocker / 운영 검증

- [ ] 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
- [ ] 신규 실제 1:1 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
- [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 UX 확인

## 기타 실기기 QA

- [ ] 천생연분 결과 Preview 390px pixel-level 보정
- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함

## 완료 — 최신 Preview 기준 Production 배포

- [x] 최신 `main` 및 Preview source 상태 확인
- [x] Production one-time Git deploy trigger `d8186ab`
- [x] Vercel Production SUCCESS — deployment `E9hgx8qjpxdCBv9jAk4YXRYfZuGN`
- [x] Git 자동배포 OFF 복구 — commit `8051554`
- [x] 복구 상태 Core calculation validation #838 PASS

## 완료 — 주토피 원본 캐릭터 자산 교체

- [x] 사용자 승인 캐릭터 시트의 실제 픽셀 자산을 공통 캐릭터 원본으로 적용
- [x] 공통 `ZootopiMark`의 코드 생성 토끼 SVG 제거 및 승인 주토피 자산 적용
- [x] 생성 대기 `궁합 떡상 기원`을 승인 상승 포즈 자산으로 교체
- [x] 최신 `relationship-editorial-v4-direct-labels`에 뒤처진 Day 10/21 테스트 버전 기대값 정합화
- [x] PR #78 / Core calculation validation #850 — 전체 contracts + lint + production build PASS
- [x] Preview one-time deploy trigger `7cb538b` — Vercel SUCCESS (`Gjv1vd6wMAn74cvxFTPQFJH4es6s`), 자동배포 OFF 복구 `7d37dd8`
- [x] PR #78 → `main` (`9d04101`), Git 자동배포 OFF 유지

## 완료 — 1:1 결과 UI 정리

- [x] 1:1/1:N 공용 히트맵을 낮음=빨강, 중간=노랑, 높음=녹색의 주가형 5단계 팔레트로 교체
- [x] 1:1 결과에 혼입된 구형 `60일주 캐릭터` 카드와 관련 렌더 파일·스타일 제거
- [x] 원국 아래 `달빛 항구`, `정원의 설계자` 같은 시적 한줄평 렌더 제거
- [x] 1:1 공유 영역을 선택 탭 없는 `한 장 요약` 카드 하나로 고정하고 공유 CTA 개선
- [x] 관련 contracts + TypeScript + lint(0 errors, 기존 warnings 5) + production build PASS

## 완료 — 홈 최근 보관함 및 점수 근거 정리

- [x] 홈의 고정 TOP 3 샘플을 로그인 계정 보관함 최신 3개로 교체
- [x] 1:1 상대 이름 앞 3글자 프로필·이름·관계·점수 표시, 1:N은 `1:다`·관계·최고점만 표시
- [x] 홈 우측 상단 카카오 로그인/로그아웃 활성화
- [x] 1:1 핵심 점수별 계산 근거를 3문장 이내 접이식 토글로 제공
- [x] 1:1 관계 타이밍 지표와 대운·세운 3년 흐름 UI 전면 제거
- [x] `정보 수준 A/B` 제거, 출생시간 미입력 시 시주 제외 안내만 표시
- [x] source `fcdb9eb` + 관련 contracts + TypeScript + lint + production build PASS

## 완료 — 홈 미지원 섹션 정리 및 오늘의 한마디 365일화

- [x] 기능이 없는 하단 `이벤트` 메뉴 제거 및 홈·보관함·마이페이지 3열 재배치
- [x] 샘플 차트인 `관계 흐름 한눈에 보기` 섹션과 관련 렌더·스타일 제거
- [x] 기존 한 문구를 포함한 중복 없는 365개 `주토피의 오늘의 한마디` 구성
- [x] 서울 날짜 기준 일별 선택, 윤일은 2월 28일 문구 재사용
- [x] 홈 전용 contract + lint(0 errors, 기존 warnings 5) + production build + local 200 응답 PASS

## 완료 — 1:N 결과 순위 전용 화면 정리

- [x] `종합 결과 → 한눈에 보는 순위`와 후보별 순위·종합점수 카드만 유지
- [x] 총평·역할·공통 지표·상황별 추천·후보별 상세·9개 점수·마무리·공유·결과 하단 UI 제거
- [x] 결과 화면의 계정 귀속 패널 제거
- [x] 결정론 점수·순위, 결제, 저장, 복구, single-flight 로직 무변경
- [x] Day 15 UI/Day 16 paid E2E/runtime/share contracts + lint + production build + demo local 200 응답 PASS

## 기본 검증

변경 후 관련 contract + `npm run lint` + `npm run build`.
Preview 배포는 사용자의 상시 승인을 따라 변경 검증 후 별도 재확인 없이 수행한다. Production 배포는 사용자 명시 승인 뒤 수행한다.
Git 자동배포는 OFF 유지.

## Current HANDOFF
```text
HANDOFF
- Worker: Codex
- Task: 1:N 결과를 종합 순위 전용 화면으로 정리
- Status: 구현 및 local validation 완료
- Validation: Day 15 UI/Day 16 paid E2E/runtime/share contracts + lint + production build + demo local 200 PASS
- Scope: 순위 카드만 렌더, 나머지 결과·공유·계정 귀속 UI 제거, 계산/결제/저장/복구 유지
- Remaining: Production에서 기존/신규 1:1 결제 → AI 3-segment → 저장 → 재열람 실동작 검증
- Risk: 실제 결제/Anthropic 생성 성공 여부는 기존 운영 blocker로 미검증
- Deploy: 미배포; Git 자동배포 OFF 유지
```
