# 우리궁합 Day 9 — Claude 서술·원가 정책 v1

기준일: 2026-08-12

## 1. 목적

궁합 점수는 서버의 결정론 계산 엔진이 확정하고, AI는 확정된 계산값을 자연스러운 한국어 리포트로 편집하는 역할만 담당한다.

- AI는 점수·순위를 생성하거나 변경하지 않는다.
- 이름, 원본 생년월일, 원본 출생시간, paymentId/orderId는 AI에 전달하지 않는다.
- 1:1은 AI 1회 호출을 원칙으로 한다.
- 1:N은 후보별 AI 호출이 아니라 서버가 모든 후보의 점수/순위를 먼저 계산한 뒤 비교용 compact payload를 AI에 1회 전달하는 방향으로 구현한다.

## 2. 모델 고정

- Provider: Anthropic
- Model: `claude-haiku-4-5-20251001`
- Prompt version: `narrative-prompt-v2-claude`
- Payload version: `narrative-payload-v1`

Alias 대신 dated snapshot을 사용해 베타 기간의 재현성을 높인다.

## 3. AI 전달 데이터

full `calculationSnapshot`을 그대로 보내지 않는다.

전달 항목:
- relationshipType / profile
- 종합 score
- confidence / uncertaintyRange
- 9개 항목의 normalizedScore / maxPoints / weightedPoints
- strengths 2개
- adjustmentPoints 2개
- 위 강점/조정 항목 중 최대 4개 항목의 축약 keyEvidence
- `scoreMutableByAi=false`, `rankingMutableByAi=false`

금지 항목:
- displayName
- birthDate
- birthTime
- paymentId
- orderId
- 원본 입력 객체
- 시간 미상 12/144개 개별 시나리오 전체

2026-08-12 CI 기준 샘플:
- full snapshot JSON: 3,526 chars
- compact payload JSON: 2,022 chars
- 문자 기준 감소율: 42.7%

문자 수는 토큰 수와 동일하지 않으며, 실제 과금 판단은 Anthropic 응답의 usage 토큰을 사용한다.

## 4. Structured Output

Anthropic Messages API의 `output_config.format.type=json_schema`를 사용한다.

AI 출력에는 다음 서술 필드만 허용한다.
- headline
- summary
- flow.primary / secondary / caution
- strengths.first / second
- adjustments.first / second
- practicalGuide.first / second / third

숫자 점수 필드는 AI 출력 스키마에 두지 않는다.

## 5. 원가 계산

Claude Haiku 4.5 표준 API 기준:
- input: $1 / 1M tokens
- output: $5 / 1M tokens

현재 우리궁합은 prompt caching을 사용하지 않는다.

건당 추정 USD 원가:

`input_tokens / 1,000,000 * 1 + output_tokens / 1,000,000 * 5`

원화 관리용 환율:
- 기본 `AI_COST_USD_KRW=1450`
- 실제 운영 시 환경변수로 변경 가능

예시:
- input 2,500 / output 900
- USD 약 $0.007
- 1,450원/$ 적용 시 약 10.15원

## 6. 실제 사용량 기록

Anthropic 성공 응답의 다음 값을 기록한다.
- input_tokens
- output_tokens
- cache_creation_input_tokens
- cache_read_input_tokens
- 모델 ID
- promptVersion
- payloadVersion
- payloadBytes
- 추정 USD 원가
- 원가 계산용 USD/KRW 환율
- 추정 KRW 원가

Day 9~10: Vercel structured runtime log + API `narrativeMeta.usage`에 기록.
Day 11 저장소 구현 후: 주문/결과 레코드에 이 사용량 메타를 함께 영구 저장한다.

## 7. 실패 정책

다음 경우 template narrative로 즉시 fallback한다.
- API key 없음
- Anthropic HTTP 오류
- timeout
- 빈 응답
- JSON parse 실패
- schema mismatch

AI 실패는 이미 확정된 궁합 점수를 변경하거나 결제 결과를 무효화하지 않는다.

## 8. 환경변수

실 Claude 호출을 켤 때 Vercel Production에 설정한다.

- `ANTHROPIC_API_KEY=<secret>`
- `REPORT_NARRATIVE_MODE=anthropic`
- `ANTHROPIC_NARRATIVE_MODEL=claude-haiku-4-5-20251001`
- `AI_COST_USD_KRW=1450` (원가 관리용, 필요 시 변경)

API key는 GitHub 또는 클라이언트 번들에 넣지 않는다.

## 9. 가격 정책과의 연결

AI 원가는 판매가의 핵심 결정 변수가 아니다. 베타에서는 1:1 1,000원 / 1:N 3,000원을 유지하고, 실제 베타 사용량 20~30건의 Anthropic usage를 수집한 뒤 건당 실원가를 다시 계산한다.

정식 가격 검토 시에는 AI 비용 외에 PG 수수료, Vercel 상업용 플랜, DB/저장, 환불/CS, 도메인, 광고 CAC를 함께 본다.
