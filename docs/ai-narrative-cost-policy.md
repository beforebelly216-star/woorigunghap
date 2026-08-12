# 우리궁합 AI 서술 원가 정책 v1

기준일: 2026-08-12

## 1. 역할 분리

- 만세력 계산, 궁합 9항목 점수, 종합점수, 순위는 서버 규칙 엔진이 확정한다.
- AI는 확정된 계산값과 핵심 근거를 자연어 리포트로 편집하는 역할만 한다.
- AI는 점수와 순위를 생성하거나 변경하지 못한다.
- API 실패 시 동일 계산값을 사용하는 template narrative로 자동 fallback한다.

## 2. 기본 모델

- Provider: Anthropic
- Model ID: `claude-haiku-4-5-20251001`
- 모델 별칭 대신 고정 ID를 사용해 결과 재현성과 원가 추적을 높인다.
- Extended thinking은 사용하지 않는다.
- 1:1 호출은 리포트 1건당 최대 1회가 원칙이다.
- 1:N은 후보별 N회 호출이 아니라 서버에서 모든 점수/순위를 확정한 뒤 비교용 compact payload 1회 호출을 목표로 한다.

## 3. 현재 API 단가 상수

Claude Haiku 4.5 표준 API 기준:

- Input: USD 1 / 1M tokens
- Output: USD 5 / 1M tokens

내부 원가 환산 기본값:

- `AI_COST_USD_KRW=1450`
- 실제 운영에서는 필요 시 환경변수만 변경한다.

원가 계산:

`estimatedUsd = inputTokens / 1,000,000 * 1 + outputTokens / 1,000,000 * 5`

`estimatedKrw = estimatedUsd * AI_COST_USD_KRW`

현재 prompt caching은 사용하지 않는다. 추후 caching을 활성화할 경우 cache write/read 단가를 별도로 원가식에 반영한다.

## 4. Compact payload 정책

AI에 full `calculationSnapshot`을 전달하지 않는다.

전달 항목:

- relationshipType / profile
- overall score / confidence / uncertaintyRange
- 9개 항목의 normalizedScore / maxPoints / weightedPoints
- strengths 2개
- adjustmentPoints 2개
- 위 강점/조정 항목 중 최대 4개의 축약 evidence
- AI score/ranking mutation 금지 플래그

전달 금지:

- 이름/별칭
- 원본 생년월일
- 원본 출생시간
- paymentId / orderId
- 원본 주문 입력
- 시간 미상 12/144개 시나리오 원문 전체

현재 CI 표본:

- full snapshot JSON: 3,526 chars
- compact payload JSON: 2,022 chars
- 문자 길이 기준 감소율: 42.7%

실제 토큰 수는 Claude 응답의 `usage.input_tokens` / `usage.output_tokens`를 과금 기준으로 사용한다.

## 5. 원가 기록

Anthropic 호출 성공 시 서버 로그에 다음을 기록한다.

- provider
- model
- promptVersion
- payloadVersion
- payloadBytes
- inputTokens
- outputTokens
- estimatedUsd
- estimatedKrw
- 적용 환율

개인 식별정보, 생년월일시, paymentId는 원가 로그에 기록하지 않는다.

Day 11 저장소 구현 후 주문 결과와 함께 usage/cost 메타를 영구 저장할 수 있도록 확장한다.

## 6. 현재 원가 예시

내부 보수 시나리오 `2,500 input + 900 output`:

- API 비용: USD 0.007
- 1 USD = 1,450원 기준: 약 10.15원/리포트

이 수치는 예상치이며 실제 베타 운영에서는 Anthropic usage 응답으로 다시 보정한다.

## 7. 판매가 원칙

AI 비용만을 이유로 판매가를 결정하지 않는다. 판매가는 다음을 함께 본다.

- PG 결제 수수료
- 호스팅/DB 고정비
- 환불 및 재시도 비용
- CS 운영비
- 고객획득비용(CAC)
- 세금 및 기타 운영비

베타 가격은 현재 결정된 `1:1 1,000원 / 1:N 3,000원`을 유지한다. 정식 가격은 실제 베타의 API usage, PG 실계약 요율, CAC가 확보된 후 재검토한다.
