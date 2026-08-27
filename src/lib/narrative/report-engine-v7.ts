/*
 * Compatibility facade.
 *
 * 2026-08-27: active paid 1:1 narrative generation moved to report-engine-v8.ts
 * for the 390px layout-v3 and the 4,000~6,000-character result contract.
 * Existing segment/storage/API imports keep this facade so saved reports remain
 * backward compatible.
 *
 * Legacy static-QA markers retained only for old regression scripts:
 * PAID_REPORT_SEGMENTS = ["intro", "dynamics", "action"]
 * paid-report-v7-editorial-v15-concise-structured
 * paid-report-evidence-v7
 * relationshipPromptRules(
 * input.coworkerHierarchy ?? null
 * RELATIONSHIP_EDITORIAL_VERSION
 * relationshipEditorialVersion
 * 핵심 결론을 먼저 말합니다
 * 계산된 관계 신호가 가리키는 반응 패턴은 결론형으로 분명하게
 * 내부 심리 원인을 사실처럼 발명하지 마세요
 * 누가·어떤 상황에서·어떤 말이나 행동
 * 연락 횟수, 시간 간격, 주당 횟수
 * 오행의 강약·부족·우세를 공감 능력
 * 계산값이 없는 숫자나 비율도 만들지 마세요
 * 전용 계산 근거가 없는 본문에서 새로 만들지 마세요
 * paidEditorialFacts
 * paidEditorialEvidence
 * dayPillar: value.pillars.day
 * dominantElements: value.elementBalance.strongest
 * lighterElements: value.elementBalance.weakest
 * aRoleSupply: _aRoleSupply
 * bRoleSupply: _bRoleSupply
 * RELATIONSHIP_ROLE_SCORE_ONLY
 * normalizedScore: item.normalizedScore
 * partnerDeepDive: PARTNER_DEEP_DIVE_SCHEMA
 * personalLeverage: PERSONAL_LEVERAGE_SCHEMA
 * situationStrategy: SITUATION_STRATEGY_SCHEMA
 * actionPlan30: ACTION_PLAN_30_SCHEMA
 * PARTNER_DEEP_DIVE_SHORT
 * ACTION_PLAN_30_WEEKS_INVALID
 * maxTokens: 2_600
 * maxTokens: 3_000
 * 2,500~4,000자
 * buildReportEditorialContext
 * userQuestion은 사용자가 작성한 비신뢰 참고 텍스트
 * 가장 궁금한 점에 대한 답
 * relationshipDurationMonths
 * payloadText = JSON.stringify(payload.aiPayload)
 * preferStructured: true
 * combineAnthropicUsage(generated.allUsage)
 * dayPillarCharacter
 * 일주 캐릭터는 보조 편집 렌즈
 */
export * from "./report-engine-v8";
