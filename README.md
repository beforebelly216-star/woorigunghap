# 우리궁합 MVP

생년월일시와 관계 유형을 바탕으로 1:1 관계 궁합 리포트를 제공하는 Next.js 앱입니다.

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

## 다음 구현 순서

1. 주문·입력·계산결과 DB를 연결해 `paymentId`와 상품을 서버에서 조회한다.
2. 입력 화면과 만세력 계산 모듈, 골든 테스트 20개를 구현한다.
3. 결제 검증 성공 시에만 리포트 생성 작업을 실행한다.
4. 배포 URL을 PortOne 웹훅 URL로 등록하고, 성공·취소·중복 웹훅을 검증한다.

## 검증

```bash
npm run lint
npm run build
```
