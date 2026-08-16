# 우리궁합 MVP

생년월일시와 관계 유형을 바탕으로 1:1·1:N 관계 궁합 리포트를 제공하는 Next.js 앱입니다.

## 로컬 실행

```bash
cp .env.example .env.local
npm run dev
```

`.env.local`에 PortOne 콘솔에서 확보한 값을 입력합니다. `PORTONE_API_SECRET`과
`PORTONE_WEBHOOK_SECRET`은 서버 전용 값이므로 절대 브라우저 코드나 깃 저장소에 넣지 않습니다.

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
- 1:N 입력 베타: 기준자 1명 + 후보 2~5명, 단일 관계 유형, 입력 검증·브라우저 임시 저장
- 1:N 결정론 계산: 후보별 동일 1:1 엔진, 서버 점수 순위, 0~2점 공동 순위, 비교 JSON
- 1:N AI 리포트 계약: 익명 후보 ID와 고정 계산 근거만 전달하고, 순위·점수는 AI가 변경하지 못하게 검증

현재 1:1 사용자 흐름:

```text
홈 → 1:1 정보 입력 → 주문 저장 → 결제 전 확인 → PortOne 결제 → 서버 리포트 생성·복구
```

현재 1:N 사용자 흐름:

```text
홈 → 1:N 정보 입력 → 기준자·후보 2~5명 검증 → 서버 비교 계산 → AI 리포트 생성 계약
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
- Day 15: 1:N 익명 AI 콘텐츠 계약·순위 불변 검증 ✅

## 다음 구현 순서 (Day 16~21)

- Day 16: 1:N 주문 생성·입력 해시·3,000원 결제 진입을 1:1과 분리해 구현
- Day 17: 검증된 1:N 결제 뒤 순위·비교 매트릭스·후보별 해석·상황별 추천 결과 화면 구현
- Day 18: 1:N 주문·계산·AI 리포트 스냅샷을 서버에 보존하고 접근 토큰으로 복구
- Day 19: PortOne 실제 테스트 결제/웹훅/복구 E2E 점검 (실제 결제 동작은 테스트 시점에 별도 진행)
- Day 20: 청월당 레퍼런스의 여백·위계·읽기 흐름을 참고한 화면 재설계 (브랜드·카피·자산 복제 없음)
- Day 21: 카카오 로그인 뒤 계정별 리포트 보관·재열람 연결. 카카오 개발자 앱 키와 리디렉션 도메인 설정이 필요한 외부 연동 단계

## 검증

```bash
npm run test:manse
npm run test:manse:boundaries
npm run test:compatibility:day-master
npm run test:day11:server-store
npm run test:day13:one-to-many-input
npm run test:day14:one-to-many-calculation
npm run test:day15:one-to-many-narrative
npm run lint
npm run build
```
