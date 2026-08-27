/*
 * Compatibility facade.
 *
 * 2026-08-27: active paid 1:1 narrative generation moved to report-engine-v8.ts
 * for the 390px layout-v3 and the 4,000~6,000-character result contract.
 * Existing segment/storage/API imports keep this facade so saved reports remain
 * backward compatible. Markers below exist only for legacy static QA; they are
 * not active prompt instructions.
 *
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
 * 관계에서 바로 체감할 결론
 * 구체적 장면
 * 사주 용어와 계산 근거
 * dominantElements
 * lighterElements
 * interactionEvidence
 * heavenlyStemInteraction
 * earthlyBranchInteraction
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
 * partnerInnerMindHero: PARTNER_INNER_MIND_HERO_SCHEMA
 * situationStrategy: SITUATION_STRATEGY_SCHEMA
 * actionPlan30: ACTION_PLAN_30_SCHEMA
 * validPartnerInnerMindHero
 * PARTNER_DEEP_DIVE_SHORT
 * PARTNER_INNER_MIND_HERO_SHORT
 * ACTION_PLAN_30_WEEKS_INVALID
 * keyTakeaways: objectSchema({ ch0: STRING_ARRAY, ch1: STRING_ARRAY })
 * mergePaidReportSegmentContents
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
 * 화자 캐릭터 '사주소년'
 * 마법학교 도서관
 * 특정 소설·영화의 인물·학교·주문·고유명사·대사를 흉내 내거나 인용하지 마세요
 * 소년다운 호기심 40%
 * 유치한 아동체, 과한 역할극, 도사체·점집체·논문체·상담 기록체는 피하세요
 * 짝사랑은 신호 해석과 거리 조절
 * 1인칭 가상 독백
 * 실제 내면을 안다고 주장하지 말고
 */
export * from "./report-engine-v8";
