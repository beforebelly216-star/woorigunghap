// Server-only module: it reads ANTHROPIC_API_KEY and is only imported by result generation routes.

import { COMPATIBILITY_DIMENSIONS } from "@/lib/compatibility/engine";
import type {
  OneToManyCalculationSnapshot,
  OneToManyCandidateId,
} from "@/lib/compatibility/one-to-many";
import { buildSituationalRecommendations } from "@/lib/compatibility/one-to-many-view";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import {
  DEFAULT_REPORT_MODEL,
  type NarrativeUsage,
} from "@/lib/narrative/report-engine";
import {
  combineAnthropicUsage,
  requestStructuredSegment,
} from "@/lib/narrative/report-engine-v6-request";

export const ONE_TO_MANY_REPORT_PROMPT_VERSION = "one-to-many-report-v1-editorial" as const;
export const ONE_TO_MANY_REPORT_PAYLOAD_VERSION = "one-to-many-evidence-v1" as const;

const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "기본 기운의 호흡",
  dayBranch: "생활·정서 리듬",
  usefulGodFit: "필요한 기운의 보완",
  elementComplementarity: "오행 상보성",
  heavenlyStemInteraction: "천간의 결속과 긴장",
  earthlyBranchInteraction: "지지의 결속과 마찰",
  specialStars: "귀인 신호",
  spouseStarRealization: "관계 역할의 맞물림",
  luckCycleAlignment: "대운 동조",
};

const STRING_ARRAY = { type: "array", items: { type: "string" } } as const;

function objectSchema(properties: Record<string, unknown>) {
  return { type: "object", additionalProperties: false, properties, required: Object.keys(properties) } as const;
}

const CANDIDATE_NARRATIVE_SCHEMA = objectSchema({
  candidateId: { type: "string" },
  oneLine: { type: "string" },
  strengths: STRING_ARRAY,
  cautions: STRING_ARRAY,
  practicalTip: { type: "string" },
});

const SITUATIONAL_RECOMMENDATION_SCHEMA = objectSchema({
  candidateIds: { type: "array", items: { type: "string" } },
  reason: { type: "string" },
});

const ONE_TO_MANY_NARRATIVE_SCHEMA = objectSchema({
  rankingSummary: objectSchema({
    headline: { type: "string" },
    summary: { type: "string" },
    closenessNotice: { type: "string" },
  }),
  candidates: { type: "array", items: CANDIDATE_NARRATIVE_SCHEMA },
  situationalRecommendations: objectSchema({
    communication: SITUATIONAL_RECOMMENDATION_SCHEMA,
    emotionalStability: SITUATIONAL_RECOMMENDATION_SCHEMA,
    longTerm: SITUATIONAL_RECOMMENDATION_SCHEMA,
    conflictManagement: SITUATIONAL_RECOMMENDATION_SCHEMA,
    relationshipPurpose: SITUATIONAL_RECOMMENDATION_SCHEMA,
  }),
  finalSummary: { type: "string" },
});

export type OneToManyCandidateNarrative = {
  candidateId: OneToManyCandidateId;
  oneLine: string;
  strengths: string[];
  cautions: string[];
  practicalTip: string;
};

export type OneToManyNarrativeContent = {
  rankingSummary: {
    headline: string;
    summary: string;
    closenessNotice: string;
  };
  candidates: OneToManyCandidateNarrative[];
  situationalRecommendations: {
    communication: { candidateIds: OneToManyCandidateId[]; reason: string };
    emotionalStability: { candidateIds: OneToManyCandidateId[]; reason: string };
    longTerm: { candidateIds: OneToManyCandidateId[]; reason: string };
    conflictManagement: { candidateIds: OneToManyCandidateId[]; reason: string };
    relationshipPurpose: { candidateIds: OneToManyCandidateId[]; reason: string };
  };
  finalSummary: string;
};

export type OneToManyNarrativeEvidence = {
  payloadVersion: typeof ONE_TO_MANY_REPORT_PAYLOAD_VERSION;
  relationshipType: OneToManyCalculationSnapshot["relationshipType"];
  profile: OneToManyCalculationSnapshot["profile"];
  candidateCount: number;
  rankingPolicy: Pick<
    OneToManyCalculationSnapshot["rankingPolicy"],
    "equivalentMaxGap" | "slightEdgeMaxGap" | "meaningfulGapMin" | "uncertaintyOverlapAffectsRank"
  >;
  candidates: Array<{
    candidateId: OneToManyCandidateId;
    rank: number;
    groupIndex: number;
    score: number;
    scoreGapFromLeader: number;
    gapBand: "EQUIVALENT" | "SLIGHT_EDGE" | "MEANINGFUL_GAP";
    uncertaintyRange: { min: number; max: number; width: number };
    uncertaintyRangesOverlapLeader: boolean;
    decisiveWordingAllowed: boolean;
    confidence: "high" | "medium" | "low";
    scenarioCount: number;
    strengths: string[];
    adjustmentPoints: string[];
    dimensions: Record<CompatibilityDimension, number>;
  }>;
  situationalRecommendations: Record<
    "communication" | "emotionalStability" | "longTerm" | "conflictManagement" | "relationshipPurpose",
    { candidateIds: OneToManyCandidateId[]; shared: boolean; leaderScore: number }
  >;
  aiBoundary: OneToManyCalculationSnapshot["aiBoundary"];
};

export type OneToManyNarrativeMeta = {
  provider: "anthropic";
  model: string;
  promptVersion: typeof ONE_TO_MANY_REPORT_PROMPT_VERSION;
  payloadVersion: typeof ONE_TO_MANY_REPORT_PAYLOAD_VERSION;
  attempt: number;
  qualityCharacters: number;
  qualityWarnings: string[];
  usage: NarrativeUsage | null;
  payloadBytes: number;
};

export type OneToManyNarrativeResult = {
  narrative: OneToManyNarrativeContent;
  meta: OneToManyNarrativeMeta;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key].trim().length > 0;
}

function hasTextArray(value: Record<string, unknown>, key: string, minimum = 0) {
  return Array.isArray(value[key])
    && value[key].length >= minimum
    && value[key].every((item) => typeof item === "string" && item.trim().length > 0);
}

function isCandidateId(value: unknown): value is OneToManyCandidateId {
  return typeof value === "string" && /^candidate_[1-5]$/.test(value);
}

function sameCandidateIds(value: unknown, expected: OneToManyCandidateId[]) {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((item, index) => item === expected[index]);
}

function validNarrative(
  value: unknown,
  expectedCandidateIds: Set<OneToManyCandidateId>,
  expectedSituations: OneToManyNarrativeEvidence["situationalRecommendations"],
): value is OneToManyNarrativeContent {
  if (!isObject(value) || !isObject(value.rankingSummary) || !Array.isArray(value.candidates) || !isObject(value.situationalRecommendations)) return false;
  if (!["headline", "summary", "closenessNotice"].every((key) => hasString(value.rankingSummary as Record<string, unknown>, key))) return false;
  if (!hasString(value, "finalSummary") || value.candidates.length !== expectedCandidateIds.size) return false;

  const responseIds = new Set<OneToManyCandidateId>();
  for (const candidate of value.candidates) {
    if (!isObject(candidate) || !isCandidateId(candidate.candidateId) || !expectedCandidateIds.has(candidate.candidateId)) return false;
    if (!hasString(candidate, "oneLine") || !hasTextArray(candidate, "strengths", 2) || !hasTextArray(candidate, "cautions", 1) || !hasString(candidate, "practicalTip")) return false;
    responseIds.add(candidate.candidateId);
  }
  if (responseIds.size !== expectedCandidateIds.size || [...expectedCandidateIds].some((id) => !responseIds.has(id))) return false;

  for (const key of ["communication", "emotionalStability", "longTerm", "conflictManagement", "relationshipPurpose"] as const) {
    const recommendation = value.situationalRecommendations[key];
    if (!isObject(recommendation) || !hasString(recommendation, "reason")) return false;
    if (!sameCandidateIds(recommendation.candidateIds, expectedSituations[key].candidateIds)) return false;
  }
  return true;
}

function compactLength(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, child) => sum + compactLength(child), 0);
  if (isObject(value)) return Object.values(value).reduce<number>((sum, child) => sum + compactLength(child), 0);
  return 0;
}

function narrativeQualityIssues(value: OneToManyNarrativeContent): string[] {
  const issues: string[] = [];
  if (compactLength(value) < 900) issues.push("ONE_TO_MANY_REPORT_SHORT");
  if (value.rankingSummary.summary.length < 120) issues.push("RANKING_SUMMARY_SHORT");
  if (value.finalSummary.length < 140) issues.push("FINAL_SUMMARY_SHORT");
  if (value.candidates.some((candidate) => compactLength(candidate) < 150)) issues.push("CANDIDATE_ANALYSIS_SHORT");
  if (Object.values(value.situationalRecommendations).some((recommendation) => recommendation.reason.length < 45)) issues.push("SITUATIONAL_REASON_SHORT");
  return issues;
}

/**
 * Converts the deterministic 1:N calculation to the smallest AI-facing evidence
 * set. It deliberately omits display names, birth-date/time data, order/payment
 * IDs and detailed raw evidence. Candidate IDs are remapped to user labels only
 * in the result renderer after this content has been stored.
 */
export function buildOneToManyNarrativeEvidence(
  snapshot: OneToManyCalculationSnapshot,
): OneToManyNarrativeEvidence {
  if (!snapshot.aiBoundary.explanationOnly || snapshot.aiBoundary.scoreMutableByAi || snapshot.aiBoundary.rankingMutableByAi) {
    throw new Error("ONE_TO_MANY_REPORT_FAILED_AI_BOUNDARY_INVALID");
  }

  const situationalRecommendations = Object.fromEntries(
    buildSituationalRecommendations(snapshot).map((recommendation) => [recommendation.id, {
      candidateIds: recommendation.candidateIds,
      shared: recommendation.shared,
      leaderScore: recommendation.leaderScore,
    }]),
  ) as OneToManyNarrativeEvidence["situationalRecommendations"];

  return {
    payloadVersion: ONE_TO_MANY_REPORT_PAYLOAD_VERSION,
    relationshipType: snapshot.relationshipType,
    profile: snapshot.profile,
    candidateCount: snapshot.candidateCount,
    rankingPolicy: {
      equivalentMaxGap: snapshot.rankingPolicy.equivalentMaxGap,
      slightEdgeMaxGap: snapshot.rankingPolicy.slightEdgeMaxGap,
      meaningfulGapMin: snapshot.rankingPolicy.meaningfulGapMin,
      uncertaintyOverlapAffectsRank: snapshot.rankingPolicy.uncertaintyOverlapAffectsRank,
    },
    candidates: snapshot.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      rank: candidate.rank,
      groupIndex: candidate.groupIndex,
      score: candidate.score,
      scoreGapFromLeader: candidate.comparisonToLeader.scoreGap,
      gapBand: candidate.comparisonToLeader.band,
      uncertaintyRange: candidate.uncertaintyRange,
      uncertaintyRangesOverlapLeader: candidate.comparisonToLeader.uncertaintyRangesOverlap,
      decisiveWordingAllowed: candidate.comparisonToLeader.decisiveWordingAllowed,
      confidence: candidate.calculationSnapshot.confidence,
      scenarioCount: candidate.calculationSnapshot.scenarioPolicy.pairScenarios,
      strengths: candidate.calculationSnapshot.strengths.map((dimension) => DIMENSION_LABELS[dimension]),
      adjustmentPoints: candidate.calculationSnapshot.adjustmentPoints.map((dimension) => DIMENSION_LABELS[dimension]),
      dimensions: Object.fromEntries(COMPATIBILITY_DIMENSIONS.map((dimension) => [
        dimension,
        candidate.calculationSnapshot.dimensions[dimension].normalizedScore,
      ])) as Record<CompatibilityDimension, number>,
    })),
    situationalRecommendations,
    aiBoundary: snapshot.aiBoundary,
  };
}

const BASE_RULES = [
  "당신은 '우리궁합'의 3,000원 유료 1:N 관계 비교 리포트를 쓰는 한국어 전문 편집자입니다.",
  "후보 ID(candidate_1 등)는 화면에서 각 사용자의 별칭으로 교체된다. 후보 ID 자체를 사용자 문장에 노출하지 말고 '각 대상'처럼 자연스럽게 쓰세요.",
  "결론 → 계산 근거 → 관계에서 느껴질 체감 → 바로 실행할 행동의 순서로, 차분하고 다정하지만 또렷하게 쓰세요.",
  "입력에 있는 점수·순위·공동 순위·불확실성 범위·각 항목 점수만 근거로 사용하세요. 새로운 점수, 사주 사실, 미래 시기, 속마음, 관계 성공/실패를 만들지 마세요.",
  "rank와 score는 서버가 확정한다. AI는 순위를 바꾸거나 정당화하기 위해 계산값을 재해석하지 마세요.",
  "gapBand가 EQUIVALENT이거나 uncertaintyRangesOverlapLeader가 true이면 절대적 우열·확정적 1등이라는 표현을 금지하세요. decisiveWordingAllowed가 false인 후보도 우열을 단정하지 마세요.",
  "동점 그룹에는 동점 사실을 명확히 쓰고, 점수가 비슷해도 상황별 강점이 다름을 설명하세요. '누가 더 좋은 사람'이라는 표현은 금지합니다.",
  "WEAK, STRONG, confidence, scenario, gapBand 같은 내부 용어를 출력하지 말고 쉬운 한국어로 바꾸세요.",
  "사주 용어를 쓰면 바로 쉬운 의미를 덧붙이고, 일반론만 반복하지 마세요. 각 후보의 강점·주의점·팁은 입력된 차이를 최소 하나 반영해야 합니다.",
  "상황별 추천의 candidateIds는 서버가 확정한다. 배열의 후보를 추가·삭제·재정렬하지 말고, 공동 추천이면 모두를 같은 비중으로 설명하세요.",
  "상황별 추천은 한 사람의 절대적 승자를 선언하는 곳이 아닙니다. 각 상황에서 상대적으로 잘 맞을 수 있는 이유와 확인할 행동 기준을 함께 쓰세요.",
].join("\n");

export async function generateOneToManyNarrative(
  snapshot: OneToManyCalculationSnapshot,
): Promise<OneToManyNarrativeResult> {
  if (process.env.REPORT_NARRATIVE_MODE !== "anthropic") {
    throw new Error("ONE_TO_MANY_REPORT_FAILED_MODE_NOT_ANTHROPIC");
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ONE_TO_MANY_REPORT_FAILED_API_KEY_MISSING");
  const model = process.env.ANTHROPIC_NARRATIVE_MODEL || DEFAULT_REPORT_MODEL;
  const evidence = buildOneToManyNarrativeEvidence(snapshot);
  const payloadText = JSON.stringify(evidence);
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");
  const expectedCandidateIds = new Set(evidence.candidates.map((candidate) => candidate.candidateId));

  try {
    const generated = await requestStructuredSegment<OneToManyNarrativeContent>({
      apiKey,
      model,
      schema: ONE_TO_MANY_NARRATIVE_SCHEMA,
      maxTokens: 4800,
      timeoutMs: 90_000,
      preferStructured: false,
      label: "ONE_TO_MANY",
      validate: (value) => validNarrative(value, expectedCandidateIds, evidence.situationalRecommendations),
      qualityIssues: narrativeQualityIssues,
      system: `${BASE_RULES}\n\n[출력 구성]\n- rankingSummary.headline: 첫 화면에서 읽히는 비교 결론 1~2문장.\n- rankingSummary.summary: 공동 순위, 점수 차이, 근거가 되는 비교 축을 포함한 3~4문장.\n- rankingSummary.closenessNotice: 근소 차이·불확실성 범위가 있을 때 읽는 방법 2~3문장.\n- candidates: 모든 후보를 한 번씩 반드시 쓰세요. oneLine은 한 줄, strengths는 최소 2개, cautions는 최소 1개, practicalTip은 한 번에 실행할 수 있는 행동 한 가지입니다.\n- situationalRecommendations: 소통·정서 안정·장기 지속·갈등 관리·관계 목적별로 서버가 준 candidateIds를 그대로 복사하고, 공동 추천이면 모든 후보가 해당되는 이유와 확인 행동을 2~3문장으로 쓰세요.\n- finalSummary: 누가 절대적으로 더 낫다는 말 없이 기준 인물이 비교 결과를 관계 선택과 대화에 활용하는 방법을 3~4문장으로 마무리하세요.`,
      user: `아래는 익명화된 서버 계산 근거입니다. 이 정보만 사용해 1:N 비교 리포트를 작성하세요.\n${payloadText}`,
    });
    const usage = combineAnthropicUsage(generated.allUsage);

    console.info("[woorigunghap:one-to-many-report]", JSON.stringify({
      model,
      attempt: generated.attempts,
      qualityCharacters: generated.best.characters,
      qualityWarnings: generated.best.qualityIssues,
      usage,
    }));

    return {
      narrative: generated.best.value,
      meta: {
        provider: "anthropic",
        model,
        promptVersion: ONE_TO_MANY_REPORT_PROMPT_VERSION,
        payloadVersion: ONE_TO_MANY_REPORT_PAYLOAD_VERSION,
        attempt: generated.attempts,
        qualityCharacters: generated.best.characters,
        qualityWarnings: generated.best.qualityIssues,
        usage,
        payloadBytes,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    console.warn("[woorigunghap:one-to-many-report-failed]", JSON.stringify({ model, reason }));
    throw new Error(`ONE_TO_MANY_REPORT_FAILED_${reason}`);
  }
}
