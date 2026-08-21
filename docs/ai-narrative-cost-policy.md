# 우리사주 AI 서술·원가 정책 v3

기준일: 2026-08-16

## 1. 역할 분리

- 만세력 계산, 궁합 9항목 점수, 종합점수, 순위는 서버 규칙 엔진이 확정한다.
- AI는 확정된 계산값과 비식별 파생 근거를 자연어 리포트로 편집한다.
- AI는 점수와 순위를 생성하거나 변경하지 못한다.
- 유료 1:1 결과는 짧은 template을 최종 결과로 조용히 대체하지 않는다. Claude 일시 실패는 완료된 구간을 저장한 채 해당 구간만 자동 재시도한다.

## 2. 기본 모델과 호출 구조

- Provider: Anthropic
- Model ID: `claude-haiku-4-5-20251001`
- Extended thinking은 사용하지 않는다.
- 1:1 유료 리포트는 현재 3개 장문 세그먼트로 생성한다.
  1. `intro`: 총평 + 두 사람 개인 원국
  2. `dynamics`: 기본 케미 + 결속/마찰 + 양방향 영향
  3. `action`: 관계 흐름 + 관계유형 + 위험신호 + 실전 매뉴얼
- 세그먼트별 성공 결과를 즉시 저장하므로 이후 구간에서 실패해도 이미 성공한 구간을 다시 과금하지 않는 것을 기본 원칙으로 한다.
- 1:N은 후보별 N회 호출이 아니라 서버가 점수/순위를 확정한 뒤 비교용 evidence pack을 묶어 호출하는 방향을 유지한다.

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

## 4. ReportEvidencePack

원가 절감을 위해 해석 근거를 삭제하지 않는다. 대신 원본 입력과 계산 중간 산출물 전체를 보내지 않고 개인화에 필요한 비식별 파생 사실만 구조화해서 전달한다.

### 전달 항목

- relationshipType / profile
- overall score / confidence / uncertaintyRange / scenarioCount
- A/B 개인 관계 원국 파생정보
  - 일간 / 오행 / 음양
  - 신강약 soft signal + confidence
  - 오행 share / 강한 2개 / 약한 2개
  - useful / favorable / unfavorable element signal
- 9개 궁합 항목 전체의 점수 및 축약 evidence
- A→B / B→A 방향성 근거
- strengths / adjustmentPoints
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

## 5. 리포트 필수 콘텐츠 계약

유료 1:1은 다음 10개 챕터를 유지한다.

1. 첫 화면 총평
2. 나의 관계 원국
3. 상대의 관계 원국
4. 일간·일지·음양·오행 기본 케미
5. 천간·지지·귀인 결속/마찰
6. A→B / B→A 양방향 영향
7. 관계 흐름과 현실 갈등 시나리오
8. 짝사랑/썸/연인/친구/직장동료 관계유형 전용 분석
9. 강점·반복 마찰·레드 플래그
10. 실전 행동 매뉴얼

세운·대운·특정 연도/월 관계 타이밍은 제공하지 않는다.

## 6. v7 출력 길이와 예상 원가

v7은 한 번의 짧은 호출이 아니라 3개 장문 세그먼트다. 따라서 기존 v2 문서의 `7,000 input + 4,000 output = 39.15원`은 현재 1:1 전체 리포트의 보수 원가가 아니다. 이 수치는 원가 계산기 단위 테스트용 예시로만 남긴다.

현재 운영 전 추정 범위:

- 일반 목표: 전체 약 `12,000 input + 7,000 output`
  - USD 0.047
  - 1 USD = 1,450원 기준 약 68.15원
- 보수 목표: 전체 약 `18,000 input + 10,000 output`
  - USD 0.068
  - 약 98.60원
- 현재 설정된 세그먼트 출력 상한을 넉넉히 소진하는 예시 `18,000 input + 12,000 output`
  - USD 0.078
  - 약 113.10원

실제 과금은 Claude 응답의 `usage.input_tokens` / `usage.output_tokens`를 세 세그먼트 합산해서 판단한다. 한국어 문자 수를 토큰 수로 간주하지 않는다.

## 7. 재시도 원가 관리

- Claude 자체 요청은 한 세그먼트 안에서 사용할 수 없는 응답일 때만 제한적으로 재시도한다.
- 단순히 목표 글자 수보다 짧다는 이유만으로 정상 구조 응답을 폐기하고 다시 과금하지 않는다.
- 사용자 화면의 장기 재시도는 `prepare / intro / dynamics / action` 중 실패한 구간만 다시 호출한다.
- 완료된 세그먼트는 브라우저 진행 저장소에서 재사용한다.
- 인증·크레딧·모델 권한처럼 반복 호출로 해결되지 않는 오류는 무한 재시도하지 않는다.
- 일시적인 rate limit, 과부하, 네트워크/서버 timeout, 출력 잘림, JSON 형식 오류는 사용자에게 지연 실패 화면을 보여주지 않고 해당 세그먼트를 다시 시도한다.

비정상 상태에서 동일 세그먼트가 장시간 계속 실패하면 호출 원가가 누적될 수 있으므로 베타 usage 로그를 반드시 확인한다. Day 11 서버 저장소가 붙으면 paymentId별 생성 lock 및 서버측 세그먼트 캐시를 추가해 다중 탭/기기 중복 호출까지 차단한다.

## 8. 원가 기록

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

현재는 각 세그먼트 meta에 usage를 기록하고 결과 화면의 `debug=1`에서 QA 확인이 가능하다. Day 11 저장소 구현 후 주문 결과와 함께 세그먼트 usage/cost 메타를 영구 저장한다.

## 9. 판매가 원칙

AI 비용만을 이유로 판매가를 결정하지 않는다. 판매가는 다음을 함께 본다.

- PG 결제 수수료
- 호스팅/DB 고정비
- 환불 및 재시도 비용
- CS 운영비
- 고객획득비용(CAC)
- 세금 및 기타 운영비

베타 가격은 `1:1 1,000원 / 1:N 3,000원`을 유지한다. 정식 가격은 실제 베타 usage, PG 실계약 요율, CAC를 확보한 뒤 재검토한다.
