# 우리사주

생년월일시와 관계 유형을 바탕으로 1:1·1:N 관계 궁합 리포트를 제공하는 Next.js 서비스입니다.

> 공식 프로젝트명/서비스명은 **우리사주**입니다. 저장소명 `woorigunghap`, 기존 Vercel 도메인, DB 테이블의 `woorigunghap_*` prefix는 기존 데이터·배포 호환을 위한 레거시 내부 식별자이며 사용자 노출 브랜드명이 아닙니다.

## 상품

- 1:1 관계 궁합: 1,000원
- 1:N 비교 궁합: 3,000원
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 1:N: 기준자 1명 + 후보 2~5명

## 핵심 구조

- 사주 계산과 궁합 점수는 서버의 결정론적 로직이 담당합니다.
- AI는 계산 결과를 바꾸지 않고 유료 리포트 서술만 생성합니다.
- 이름·별칭과 원본 생년월일시는 AI에 직접 전달하지 않습니다.
- PortOne 결제가 서버에서 검증된 뒤에만 유료 AI 생성을 실행합니다.
- 동일 결제/세그먼트의 AI 중복 생성을 막는 single-flight/idempotency 구조를 유지합니다.
- 완성된 구매 결과는 Neon에 저장하며 재열람 시 재생성하지 않습니다.
- 카카오 로그인은 선택 사항이며 비회원 결제 흐름을 유지합니다.

## 현재 구현 상태

- `manseryeok 2.0.0` 기반 만세력 계산 및 경계 검증
- 9개 궁합 지표와 관계 유형별 배점
- 1:1 CH0~CH9 장문 리포트
- 1:N 후보 비교·순위·공동 추천
- PortOne V2 결제 검증 및 webhook 멱등 처리
- Neon 주문/결제/결과 저장 및 복구
- 카카오 로그인, 계정 귀속, 보관함, 회원탈퇴/데이터 삭제
- 이용약관/개인정보처리방침/환불 안내
- 결과 완료 알림용 카카오톡 채널 알림톡(SOLAPI) 코드

## 카카오톡 채널 완료 알림

결과 완료 알림은 Kakao OAuth `나에게 보내기`가 아니라 **우리사주 카카오톡 채널 알림톡**으로 발송하도록 구성합니다.

필요한 Production 환경값:

```text
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_KAKAO_PF_ID=
SOLAPI_KAKAO_TEMPLATE_ID=
```

운영 설정 절차는 [`docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md`](./docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md)를 참고합니다.

## 로컬 실행

```bash
cp .env.example .env.local
npm install
npm run dev
```

주요 서버 비밀값은 브라우저 코드나 GitHub에 넣지 않습니다.

```text
PORTONE_API_SECRET=
PORTONE_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
DATABASE_URL=
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_ADMIN_KEY=
KAKAO_TOKEN_ENCRYPTION_KEY=
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
```

## Production 공개 운영정보

정식 판매 전 아래 값을 Vercel Production 환경에 설정합니다.

```text
NEXT_PUBLIC_OPERATOR_NAME=
NEXT_PUBLIC_OPERATOR_EMAIL=
NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER=
NEXT_PUBLIC_ECOMMERCE_REGISTRATION_NUMBER=
NEXT_PUBLIC_APP_URL=
```

## 사용자 흐름

### 1:1

```text
홈
→ 정보 입력
→ 서버 주문 저장
→ 결제 전 확인·정책 동의
→ PortOne 결제
→ 서버 결제 검증
→ 결정론 계산
→ AI 리포트 생성
→ 저장/복구
→ 선택 로그인/보관함
```

### 1:N

```text
홈
→ 기준자 + 후보 2~5명 입력
→ 서버 주문 저장
→ 3,000원 결제
→ 결제·입력 해시 검증
→ 후보별 동일 계산 엔진
→ 서버 랭킹
→ 통합 AI 해설 1회
→ 저장/복구
```

## 주요 문서

작업 시작 시 아래 순서로 확인합니다.

1. [`AGENTS.md`](./AGENTS.md)
2. [`docs/PROJECT_STATE.md`](./docs/PROJECT_STATE.md)
3. [`docs/NEXT_TASK.md`](./docs/NEXT_TASK.md)
4. [`docs/DECISIONS.md`](./docs/DECISIONS.md)

세부 명세:

- 만세력 정책: [`docs/manse-calculation-policy.md`](./docs/manse-calculation-policy.md)
- 궁합 계산 정책: [`docs/compatibility-scoring-policy.md`](./docs/compatibility-scoring-policy.md)
- 1:N 명세: [`docs/one-to-many-spec.md`](./docs/one-to-many-spec.md)
- 유료 리포트 계약: [`docs/paid-report-content-contract.md`](./docs/paid-report-content-contract.md)
- 관계별 편집 계약: [`docs/relationship-editorial-v1.md`](./docs/relationship-editorial-v1.md)
- 알림톡 운영: [`docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md`](./docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md)
- 바이럴 UX backlog: [`docs/PROMOTION_VIRAL_UX.md`](./docs/PROMOTION_VIRAL_UX.md)

## 테스트

기본 검증:

```bash
npm run lint
npm run build
```

관련 기능 계약 테스트는 `package.json`의 `test:*` 스크립트를 기준으로 실행합니다.

예:

```bash
npm run test:pending-library-notify
npm run test:day22:operating-policy
npm run test:day24:beta-freeze
npm run test:one-to-one:quality-gate
```

## 개발/배포 원칙

- GitHub 최신 `main`이 Source of Truth입니다.
- GPT와 Claude는 이전 채팅 진도를 신뢰하지 않고 최신 `main`과 HANDOFF를 다시 확인합니다.
- blocker → hotfix → post-beta 운영 QA → improvement 순으로 처리합니다.
- 관련 코드·테스트·상태 문서를 한 작업 묶음으로 정리한 뒤 원격 `main`에는 한 번만 push합니다.
- Vercel Hobby build rate limit은 코드 실패로 취급하지 않습니다.
- 기존 구매 결과와 DB 호환성을 깨뜨리는 내부 식별자 rename은 별도 마이그레이션 없이 수행하지 않습니다.
