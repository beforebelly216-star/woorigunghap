# 우리궁합 AI 서술·원가 정책 v2

기준일: 2026-08-12

## 1. 역할 분리

- 만세력 계산, 궁합 9항목 점수, 종합점수, 순위는 서버 규칙 엔진이 확정한다.
- AI는 확정된 계산값과 비식별 파생 근거를 자연어 리포트로 편집한다.
- AI는 점수와 순위를 생성하거나 변경하지 못한다.
- API 실패 시 동일 계산값을 사용하는 상세 template narrative로 자동 fallback한다.

## 2. 기본 모델

- Provider: Anthropic
- Model ID: `claude-haiku-4-5-20251001`
- Extended thinking은 사용하지 않는다.
- 1:1 리포트당 AI 호출 최대 1회가 원칙이다.
- 1:N은 후보별 N회가 아니라 서버가 점수/순위를 확정한 뒤 비교용 evidence pack 1회 호출을 목표로 한다.

## 3. API 단가 상수

Claude Haiku 4.5 표준 API 기준:

- Input: USD 1 / 1M tokens
- Output: USD 5 / 1M tokens

내부 원가 환산 기본값:

- `AI_COST_USD_KRW=1450`

원가 계산:

`estimatedUsd = inputTokens / 1,000,000 * 1 + outputTokens / 1,000,000 * 5`

`estimatedKrw = estimatedUsd * AI_COST_USD_KRW`

현재 prompt caching은 사용하지 않는다. 추후 활성화하면 cache write/read 단가를 별도로 반영한다.

## 4. ReportEvidencePack v1

원가 절감을 위해 해석 근거를 삭제하지 않는다. 대신 원본 입력과 계산 중간 산출물 전체를 보내지 않고, 개인화에 필요한 비식별 파생 사실만 구조화해서 전달한다.

### 전달 항목

- relationshipType / profile
- overall score / confidence / uncertaintyRange / scenarioCount
- A 개인 관계 원국
  - 일간 / 오행 / 음양
  - 신강약 soft signal + confidence
  - 오행 share / 강한 2개 / 약한 2개
  - useful / favorable / unfavorable element signal
- B 개인 관계 원국 동일 구성
- 9개 궁합 항목 전체
  - normalizedScore / maxPoints / weightedPoints
  - 각 항목의 축약 evidence
- 방향성 근거
  - A가 B에게 받는 용신 보완
  - B가 A에게 받는 용신 보완
  - 관계 역할 공급 방향
  - 천을귀인 방향 신호
- strengths 2개 / adjustmentPoints 2개
- 대운 엔진 지원 여부
- AI score/ranking mutation 금지 플래그

### 전달 금지

- 이름/별칭
- 원본 생년월일
- 원본 출생시간
- paymentId / orderId
- 원본 주문 객체
- sourceDate / solarDate
- 시간 미상 12/144개 시나리오 원문 전체

`birthTimeKnown` boolean은 실제 시간값이 아니라 해석 강도를 낮추기 위한 비식별 신뢰도 신호이므로 유지한다.

### 현재 CI 표본

- ReportEvidencePack JSON: 4,122 chars
- 9개 항목 evidence 전체 포함
- A/B 개인 profile 포함
- A→B / B→A 방향성 포함
- 개인정보 경계 자동 테스트 통과

문자 수는 토큰 수가 아니다. 실제 과금은 Claude 응답의 `usage.input_tokens` / `usage.output_tokens`를 기준으로 한다.

## 5. 리포트 필수 콘텐츠 계약

AI 출력 JSON은 다음 내용을 모두 포함해야 한다.

1. 첫 화면 총평
2. A 개인 관계 원국
3. B 개인 관계 원국
4. 일간·일지·음양·오행 기본 케미
5. 천간·지지·귀인 결속/마찰
6. A→B / B→A 양방향 영향
7. 관계 흐름
8. 짝사랑/썸/연인/친구/직장동료 관계유형 전용 분석
9. 강점·조정점·레드 플래그
10. 실전 행동 매뉴얼
11. 관계 타이밍 섹션

대운/세운 엔진이 없는 현재 MVP에서는 11번에서 특정 연도·월을 만들어내지 않고 기능 한계를 명시한다.

## 6. 출력 길이와 원가 목표

개인화 품질을 위해 기존 900 output token 상한을 4,000으로 확장했다.

운영 목표 범위:

- 입력: 약 4,000~7,000 tokens
- 출력: 약 2,000~4,000 tokens

보수 원가 시나리오 `7,000 input + 4,000 output`:

- API 비용: USD 0.027
- 1 USD = 1,450원 기준: 약 39.15원/리포트

실제 payload는 현재 CI 표본 기준 4,122 chars이므로 실제 input token은 실 API 호출 후 usage로 측정한다.

## 7. 원가 기록

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

Day 11 저장소 구현 후 주문 결과와 함께 usage/cost 메타를 영구 저장한다.

## 8. 판매가 원칙

AI 비용만을 이유로 판매가를 결정하지 않는다. 판매가는 다음을 함께 본다.

- PG 결제 수수료
- 호스팅/DB 고정비
- 환불 및 재시도 비용
- CS 운영비
- 고객획득비용(CAC)
- 세금 및 기타 운영비

베타 가격은 `1:1 1,000원 / 1:N 3,000원`을 유지한다. 정식 가격은 실제 베타 usage, PG 실계약 요율, CAC를 확보한 뒤 재검토한다.
