# 우리궁합 MVP

생년월일시와 관계 유형을 바탕으로 1:1·1:다 관계 궁합 리포트를 제공하는 Next.js 앱입니다.

## 로컬 실행

```bash
cp .env.example .env.local
npm run dev
```

`.env.local`에 PortOne 콘솔에서 확보한 값을 입력합니다. `PORTONE_API_SECRET`과
`PORTONE_WEBHOOK_SECRET`은 서버 전용 값이므로 절대 브라우저 코드나 깃 저장소에 넣지 않습니다.

## 현재 포함된 흐름

- 1:1 리포트 상품(1,000원) 선택 화면
- 1:1 관계 유형 선택: 연인 / 친구 / 직장동료
- 두 사람 입력: 이름·별칭, 성별, 양력/음력, 생년월일, 출생시간
- 출생시간 모름 처리 및 음력 윤달 입력
- 입력값 검증 후 `orderId`·`paymentId`와 묶은 주문 초안 생성
- 결제 전 입력 요약/금액 확인 화면
- Day 3 단계에서는 주문 초안을 `sessionStorage`에 임시 저장하며, 후속 단계에서 DB로 교체
- PortOne V2 브라우저 결제 요청: 모바일 대응 `redirectUrl` 방식
- 결제 완료 뒤 서버에서 `paymentId`, 결제 상태, 금액을 재검증하는 API
- PortOne 웹훅 원문·서명 검증 엔드포인트
- AI 리포트용 서버 전용 생성 모듈: 결제·계산과 분리하고, 계산된 결과만 전달

현재 1:1 사용자 흐름:

```text
홈 → 1:1 정보 입력 → 입력 검증 → 주문 초안 생성 → 결제 전 확인 → PortOne 결제
```

## 입력 데이터 원칙

- `birthTimeKnown=false`이면 출생시간을 모르는 입력으로 명시적으로 저장합니다.
- 음력 날짜는 양력 달력 유효성 규칙을 그대로 적용하지 않고, 음력 날짜 형태와 윤달 여부를 별도로 보관합니다.
- 이름/별칭은 화면 표시용이며 AI 생성 단계에는 원문을 전달하지 않습니다.
- Day 3의 `sessionStorage`는 개발용 임시 저장소입니다. 운영 전에는 서버 DB 주문 레코드로 교체해야 합니다.

## AI 리포트 구조

AI는 사주를 계산하거나 결제 여부를 판단하지 않습니다. 서버의 만세력/궁합 엔진이 만든
`calculationSnapshot`을 받아 리포트 서술만 작성합니다.

```text
출생정보 → 서버 만세력·궁합 계산 → calculationSnapshot → AI 서술 생성 → report_json 저장
                              └── 원본 생년월일시·이름은 AI에 전달하지 않음
```

- 기본값 `REPORT_NARRATIVE_MODE=template`: API 비용 없이 기작성 기본 문구를 사용합니다.
- `REPORT_NARRATIVE_MODE=openai`: `OPENAI_API_KEY`와 `OPENAI_MODEL`을 설정하면 OpenAI Responses API가 고정 JSON 형식으로 서술을 생성합니다.
- 생성된 문구, 모델명, 프롬프트 버전, 계산 결과 버전을 함께 `report_json`에 저장해 기존 구매 결과가 바뀌지 않게 합니다.
- AI 호출은 서버에서 PortOne 결제가 검증된 뒤에만 실행합니다.

## 다음 구현 순서

1. Day 4: 만세력 계산 모듈 1차 구현
2. Day 5: 만세력 골든 테스트 20개 및 경계값 검산
3. Day 6: 1:1 궁합 점수·계산 엔진
4. Day 8 전후: 주문·입력·계산결과 DB 연결 및 결제→계산 E2E
5. Day 9 이후: AI 서술 생성 및 결과 스냅샷 저장
6. Day 12~13: 1:N 입력·계산·랭킹·결과 구현

## 검증

```bash
npm run lint
npm run build
```
