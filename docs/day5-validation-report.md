# Day 5 만세력 검증 결과

## 상태
- 30개 골든 회귀 테스트: **30/30 통과**
- GitHub Actions: **success**
- ESLint: **success**
- Production build: **success**
- Vercel deploy: **success**
- KASI live API 교차검증: **스크립트 준비 완료 / KASI_SERVICE_KEY 미설정으로 현재 skip**

## 골든 테스트 구성
총 30개를 다음 범주로 고정했다.

1. 일반/표준 사주팔자 14개
2. 음력 입력 전체 명식 2개
3. 입춘 연주 경계 3개
4. 한국 음력/윤달 변환 5개
5. 출생시간 미상 및 절입 불확실성 3개
6. 시진 경계 3개

## 검증된 중요 경계
- 입춘 전/후 연주 전환
- 절입 당일 출생시간 미상 시 월주 미확정 처리
- 23:30 자시와 `midnight` 일경계 정책의 분리
- 음력 입력 전체 명식
- 2020년 윤4월 변환
- 한국과 중국 음력 날짜가 달라지는 1997년 음력 1월 1일
- 한국 음력 특수 변환 1933년 음6월 1일

## 기준값 출처
우리 테스트의 표준 명식은 `manseryeok` upstream의 `src/golden.test.ts` 및 `src/index.test.ts`에 고정된 KASI 표준 골든값을 사용했다. 우리 테스트 목적은 해당 표준값을 우리 서버 어댑터와 정책 레이어가 변형하지 않고 보존하는지 확인하는 것이다.

독립 검증을 위해 KASI OpenAPI와 직접 비교하는 `scripts/manse-kasi-crosscheck.ts`도 구현했다. 이 스크립트는 10개 날짜에 대해 다음을 비교한다.

- KASI `lunIljin` ↔ 우리 일주
- KASI 음력 연/월/일 ↔ `manseryeok` 한국 음력 변환
- KASI 윤달 여부 ↔ `manseryeok` 윤달 여부

## 자동화
`.github/workflows/manse-validation.yml`에서 모든 `src/**` 변경 시 다음을 자동 실행한다.

1. `npm ci`
2. `npm run test:manse`
3. `npm run test:manse:kasi`
4. `npm run lint`
5. `npm run build`

KASI 키가 없는 환경에서는 공식 API 단계만 명시적으로 skip하고 나머지는 실패 없이 수행한다.

## Day 5 남은 수동 완료 조건
`KASI_SERVICE_KEY`를 GitHub Actions repository secret으로 등록한 뒤 워크플로를 다시 실행하여 KASI 10/10 교차검증을 확인한다.

보조 국내 만세력 앱 비교는 KASI 공식 검증 이후 표본 3~5개에 대해 수행하고, 차이가 있으면 시간대/자시/진태양시/입춘·절입 정책 차이를 먼저 기록한다.
