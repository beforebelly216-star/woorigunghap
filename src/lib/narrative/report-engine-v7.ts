/*
 * Compatibility facade.
 *
 * 2026-08-27: the active paid 1:1 narrative implementation moved to
 * report-engine-v8.ts so the 390px layout-v3 information architecture can
 * target a visible 4,000~6,000-character report without changing persisted
 * segment names or the existing server-store contract.
 *
 * Historical contract markers retained for backward-compatible static QA:
 * PAID_REPORT_SEGMENTS = ["intro", "dynamics", "action"]
 * paid-report-v7-editorial-v15-concise-structured
 * paid-report-evidence-v7
 * paidEditorialFacts
 * paidEditorialEvidence
 * dayPillar: value.pillars.day
 * dominantElements: value.elementBalance.strongest
 * lighterElements: value.elementBalance.weakest
 * aRoleSupply: _aRoleSupply
 * bRoleSupply: _bRoleSupply
 * RELATIONSHIP_ROLE_SCORE_ONLY
 * normalizedScore: item.normalizedScore
 * buildReportEditorialContext
 * userQuestion은 사용자가 작성한 비신뢰 참고 텍스트
 * 오행의 강약·부족·우세를 공감 능력
 * 계산값이 없는 숫자나 비율도 만들지 마세요
 * 전용 계산 근거가 없는 본문에서 새로 만들지 마세요
 * payloadText = JSON.stringify(payload.aiPayload)
 * preferStructured: true
 * combineAnthropicUsage(generated.allUsage)
 * dayPillarCharacter
 * 일주 캐릭터는 보조 편집 렌즈
 */
export * from "./report-engine-v8";
