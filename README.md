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
- PortOne V2 브라우저 결제 요청: 모바일 대응 `redirectUrl` 방식
- 결제 완료 뒤 서버에서 `paymentId`, 결제 상태, 금액을 재검증하는 API
- PortOne 웹훅 원문·서명 검증 엔드포인트
- AI 리포트용 서버 전용 생성 모듈: 결제·계산과 분리하고, 계산된 결과만 전달

## AI 리포트 구조

AI는 사주를 계산하거나 결제 여부를 판단하지 않습니다. 서버의 만세력/궁합 엔진이 만든
`calculationSnapshot`을 받아 연인 리포트의 6개 서술 섹션만 한 번에 작성합니다.

```
출생정보 → 서버 만세력·궁합 계산 → calculationSnapshot → AI 서술 생성 → report_json 저장
                              └── 원본 생년월일시·이름은 AI에 전달하지 않음
```

- 기본값 `REPORT_NARRATIVE_MODE=template`: API 비용 없이 기작성 기본 문구를 사용합니다.
- `REPORT_NARRATIVE_MODE=openai`: `OPENAI_API_KEY`와 `OPENAI_MODEL`을 설정하면 OpenAI Responses API가
  고정 JSON 형식으로 6개 섹션을 생성합니다.
- 생성된 문구, 모델명, 프롬프트 버전, 계산 결과 버전을 함께 `report_json`에 저장해야 기존 구매 결과가 바뀌지 않습니다.
- AI 호출은 향후 **서버에서 PortOne 결제가 검증된 뒤**에만 `generateReportNarratives()`로 실행합니다.
  브라우저에서 호출하거나 공개 API로 노출하지 않습니다.

## 다음 구현 순서

1. 주문·입력·계산결과 DB를 연결해 `paymentId`와 상품을 서버에서 조회한다.
2. 입력 화면과 만세력 계산 모듈, 골든 테스트 20개를 구현한다.
3. 결제 검증 성공 시에만 `generateReportNarratives()`를 실행하고, 결과 스냅샷을 저장한다.
4. 배포 URL을 PortOne 웹훅 URL로 등록하고, 성공·취소·중복 웹훅을 검증한다.

## 검증

```bash
npm run lint
npm run build
```
