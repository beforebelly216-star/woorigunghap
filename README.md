# 우리궁합 MVP

생년월일시와 관계 유형을 바탕으로 1:1·1:N 관계 궁합 리포트를 제공하는 Next.js 앱입니다.

## 로컬 실행

```bash
cp .env.example .env.local
npm run dev
```

`.env.local`에 PortOne·Kakao Developers에서 확보한 값을 입력합니다. 아래 값은 모두
서버 전용이므로 절대 브라우저 코드나 깃 저장소에 넣지 않습니다.

- `PORTONE_API_SECRET`
- `PORTONE_WEBHOOK_SECRET`
- `KAKAO_REST_API_KEY`
- `KAKAO_CLIENT_SECRET`

카카오 개발자 콘솔에는 실제 서비스 주소와 정확히 일치하는 콜백 주소를 등록합니다.
운영 예시는 `https://서비스주소/api/auth/kakao/callback`이며, 이 전체 주소를
`KAKAO_REDIRECT_URI`에도 동일하게 설정합니다.

## 현재 포함된 흐름

- 1:1 리포트 상품(1,000원) 선택 화면
- 1:1 관계 유형 선택: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 내부 계산 프로필: `romance / friend / coworker`
- 두 사람 입력: 이름·별칭, 성별, 양력/음력, 생년월일, 출생시간
- 출생시간 모름 처리 및 음력 윤달 입력
- 입력값 검증 후 `orderId`·`paymentId`와 묶은 주문 초안 생성
- 결제 전 입력 요약/금액 확인 화면
- 주문 초안과 유료 리포트 진행 상태를 Neon 서버 저장소에 보존하고 브라우저에도 복구 사본 저장
- 결제 결과 공유 링크의 256비트 접근 토큰으로 새 브라우저·새 기기에서 결과 복구
- PortOne V2 브라우저 결제 요청 및 서버 결제 검증
- PortOne 웹훅 원문·서명 검증 엔드포인트
- `manseryeok 2.0.0` 기반 서버 만세력 계산
- KASI live API 10/10 및 골든/경계 테스트를 통한 만세력 검증
- Day 6 궁합 엔진: 관계 프로필 100점 배점 테이블 + 항목 1 일간 상성 산식 구현
- AI 리포트용 서버 전용 생성 모듈: 결제·계산과 분리하고 계산된 결과만 전달
- 1:N 입력·주문: 기준자 1명 + 후보 2~5명, 단일 관계 유형, 서버 주문 저장과 3,000원 결제 전 확인
- 1:N 결정론 계산: 후보별 동일 1:1 엔진, 서버 점수 순위, 0~2점 공동 순위, 비교 JSON
- 1:N AI 리포트 계약: 익명 후보 ID와 고정 계산 근거만 전달하고, 순위·점수는 AI가 변경하지 못하게 검증
- 1:N 결과 UI: 순위 카드, 쉬운 6개 요약 지표, 공동 상황 추천, 후보별 강점·주의, 접힌 9개 상세 점수표
- 1:N 유료 흐름: 결제 입력 해시 검증 뒤에만 서버 계산·통합 AI 1회 생성, 원자적 중복 방지, Neon 스냅샷 저장·복구
- PortOne 웹훅 ID를 먼저 저장해 중복 승인 이벤트를 멱등 처리하고, 서버 조회로 금액·상품을 재검증
- 비회원 결제 흐름을 유지하는 선택형 카카오 로그인, OAuth `state` 검증, 서버 DB 세션, 로그아웃
- 카카오 회원번호만 계정 식별에 사용하고 이메일·전화번호·생년정보와 카카오 토큰은 저장하지 않음
- 로그인 후 완료된 유료 결과를 복구키로 계정에 귀속하고, 다른 계정의 중복 귀속을 DB에서 차단
- 계정 보관함의 요약 목록과 소유권 검증 재열람을 제공하며 계산·AI 생성을 다시 실행하지 않음

현재 1:1 사용자 흐름:

```text
홈 → 1:1 정보 입력 → 주문 저장 → 결제 전 확인 → PortOne 결제 → 서버 리포트 생성·복구
                                                                    └→ 선택 로그인 → 계정 보관함
```

현재 1:N 사용자 흐름:

```text
홈 → 1:N 정보 입력 → 서버 주문 저장 → 3,000원 결제 → 결제·입력 해시 검증 → 서버 비교 계산 → 통합 AI 해설 1회 → 저장·복구
                                                                                                      └→ 선택 로그인 → 계정 보관함
```

## 입력 데이터 원칙

- `birthTimeKnown=false`이면 출생시간을 모르는 입력으로 명시적으로 저장합니다.
- 음력 날짜는 양력 달력 유효성 규칙을 그대로 적용하지 않고, 음력 날짜 형태와 윤달 여부를 별도로 보관합니다.
- 이름/별칭은 화면 표시용이며 AI 생성 단계에는 원문을 전달하지 않습니다.
- 브라우저 저장소에는 빠른 재개용 사본을, 서버 DB에는 주문·결제 상태·완성 구간을 저장합니다.
- 결과 접근 토큰 원문은 브라우저의 URL fragment와 로컬 사본에만 두고 서버에는 SHA-256 해시만 저장합니다.

## 만세력 및 궁합 계산 정책

- 만세력 정책: [`docs/manse-calculation-policy.md`](./docs/manse-calculation-policy.md)
- Day 5 검증 결과: [`docs/day5-validation-report.md`](./docs/day5-validation-report.md)
- 궁합 9항목 배점·관계 프로필·시간 미상 처리·항목별 승인 산식: [`docs/compatibility-scoring-policy.md`](./docs/compatibility-scoring-policy.md)
- 1:N 구현 명세: [`docs/one-to-many-spec.md`](./docs/one-to-many-spec.md)

궁합 점수는 사용자 관계 유형에 따라 `romance / friend / coworker` 프로필로 100점 배점을 재분배합니다. 짝사랑·썸·연인은 MVP에서 동일한 `romance` 계산 프로필을 사용하고, 관계 단계별 별도 가중치는 Day 15 이후 백로그입니다.

출생시간 미상자는 임의 시주나 고정 중립점으로 대체하지 않습니다. 가능한 시주 시나리오를 계산해 항목별 중앙값과 실제 `uncertaintyRange`를 사용합니다.

항목 1 `일간 상성`은 오행의 기본 생극 관계를 85(상생) / 70(동일 오행) / 55(상극)로 정규화하며, 방향성과 음양은 evidence로만 저장합니다. 천간합과 용신·기신 효과는 다른 항목에서 별도 계산해 중복 점수를 방지합니다.

## AI 리포트 구조

AI는 사주를 계산하거나 결제 여부를 판단하지 않습니다. 서버의 만세력/궁합 엔진이 만든
`calculationSnapshot`을 받아 리포트 서술만 작성합니다.

```text
출생정보 → 서버 만세력·궁합 계산 → calculationSnapshot → AI 서술 생성 → report_json 저장
                              └── 원본 생년월일시·이름은 AI에 전달하지 않음
```

- `REPORT_NARRATIVE_MODE=anthropic`과 `ANTHROPIC_API_KEY`를 설정하면 Claude가 고정 JSON 형식으로 서술을 생성합니다.
- 생성된 문구, 모델명, 프롬프트 버전, 계산 결과 버전을 함께 `report_json`에 저장해 기존 구매 결과가 바뀌지 않게 합니다.
- AI 호출은 서버에서 PortOne 결제가 검증된 뒤에만 실행합니다.

## 진행 상태

- Day 1: 제품/1:N 구조 정의 ✅
- Day 2: 배포·결제·웹훅 ✅
- Day 3: 1:1 입력·주문 뼈대 ✅
- Day 4: 만세력 계산 모듈 ✅
- Day 5: 골든 30/30 + 경계 8/8 + KASI live 10/10 ✅
- Day 6~7: 1:1 궁합 계산 엔진·검증 ✅
- Day 8: PortOne 결제 게이트 ✅
- Day 9~10: 유료 AI 리포트·편집 품질 ✅
- Day 11: 서버 저장·안전한 결과 복구 코드/회귀 검증 ✅
- Day 12: 운영 DB 연결·실결제·재접속·시크릿창 복구 검증 ✅
- Day 13: 1:N 데이터 계약·기준자 1명 + 후보 2~5명 입력·검증 ✅
- Day 14: 1:N 후보별 계산·서버 랭킹·동률/불확실성·비교 JSON ✅
- Day 15: 1:N 결과 UI·익명 AI 콘텐츠 계약·공동 추천·순위 불변 검증 ✅
- Day 16: 1:N 주문·3,000원 결제 게이트·통합 AI 1회·Neon 저장/복구·멱등 코드 및 회귀 검증 ✅
- Day 17: 카카오 OAuth 콜백·세션·계정 식별·로그아웃·보안 경계·운영 E2E ✅
- Day 18: 유료 결과 계정 귀속·목록·권한 재열람·보관함 UI·회귀 검증 ✅ (운영 귀속 E2E 대기)

## 다음 구현 순서 (Day 19~24)

- Day 19: 청월당의 정보 위계와 흐름을 참고한 우리궁합 고유 UI 시스템
- Day 20: 모바일 실기기 입력·결제·결과·보관함 UX와 접근성·오류 복구
- Day 21: 5개 관계 유형별 구조·설명·말투 고도화
- Day 22: 이용약관·개인정보·환불·면책·PG·카카오 동의·탈퇴/삭제 정책
- Day 23: 로그인·권한·결제·웹훅·AI 실패·성능·원가 종합 QA
- Day 24: 전체 E2E, 알려진 문제, 버전 태그, 운영 전환 체크 후 베타 동결

## 검증

```bash
npm run test:manse
npm run test:manse:boundaries
npm run test:compatibility:day-master
npm run test:day11:server-store
npm run test:day13:one-to-many-input
npm run test:day14:one-to-many-calculation
npm run test:day15:one-to-many-narrative
npm run test:day15:one-to-many-result-ui
npm run test:day16:one-to-many-paid-e2e
npm run test:day17:kakao-auth
npm run test:day18:account-report-library
npm run lint
npm run build
```
