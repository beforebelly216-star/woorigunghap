import { COMPATIBILITY_DIMENSIONS } from "./engine";
import {
  uncertaintyRangesOverlap,
  type OneToManyCalculationSnapshot,
  type OneToManyCandidateId,
} from "./one-to-many";
import type { CompatibilityDimension, CompatibilityProfile } from "./types";
import { calibrateCompatibilityScore } from "./score-scale";
import { COMPATIBILITY_SCORING_VERSION } from "./weights";
import type { OneToManyNarrativeContent } from "@/lib/narrative/one-to-many-report-engine";

export const ONE_TO_MANY_VIEW_VERSION = "one-to-many-view-v1.2.0" as const;

export const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "대화 템포",
  dayBranch: "생활 리듬",
  usefulGodFit: "편안함·회복",
  elementComplementarity: "역할 보완",
  heavenlyStemInteraction: "연락·표현 호흡",
  earthlyBranchInteraction: "생활 속 갈등",
  specialStars: "도움·신뢰",
  spouseStarRealization: "애정 표현·관계 역할",
  luckCycleAlignment: "장기관계 방향",
};

const DIMENSION_GUIDES: Record<CompatibilityDimension, {
  strength: string;
  caution: string;
  action: string;
}> = {
  dayMaster: {
    strength: "대화할 때 반응 속도와 결론을 내리는 방식이 자연스럽게 이어져요.",
    caution: "의견이 갈릴 때 서로 결론을 재촉하면 말이 짧아지고 오해가 커질 수 있어요.",
    action: "중요한 선택 전에는 각자 가장 중요한 기준을 한 문장씩 먼저 말해 보세요.",
  },
  dayBranch: {
    strength: "연락 간격, 약속 시간, 쉬는 방식 같은 생활 리듬을 맞추기 쉬운 편이에요.",
    caution: "연락이나 약속의 작은 차이를 오래 참으면 뒤늦게 서운함이 커질 수 있어요.",
    action: "연락 빈도와 약속에서 꼭 지켜줬으면 하는 기준을 하나씩 말해 보세요.",
  },
  usefulGodFit: {
    strength: "한쪽이 지치거나 예민할 때 다른 쪽이 분위기를 안정시키는 역할을 하기 쉬워요.",
    caution: "챙겨주는 행동도 상대가 원하지 않을 때는 간섭처럼 느껴질 수 있어요.",
    action: "힘들 때 듣고 싶은 말과 받고 싶은 도움을 서로 먼저 물어보세요.",
  },
  elementComplementarity: {
    strength: "역할을 나눌 때 서로 다른 장점을 맡아 빈틈을 메우기 쉬워요.",
    caution: "잘하는 방식이 다르다는 이유로 상대의 방식을 틀렸다고 판단하지 않는 게 중요해요.",
    action: "함께 할 일이 생기면 누가 무엇을 맡을지와 완료 기준을 먼저 정해 보세요.",
  },
  heavenlyStemInteraction: {
    strength: "연락 빈도, 답장 속도, 감정이나 의견을 표현하는 방식이 잘 맞는 편이에요.",
    caution: "말투나 답장 속도가 다르면 의도보다 태도를 먼저 문제 삼을 수 있어요.",
    action: "민감한 이야기는 긴 메신저 대신 짧은 통화나 대면으로 확인해 보세요.",
  },
  earthlyBranchInteraction: {
    strength: "약속 시간, 정리 습관, 쉬는 방식 같은 반복되는 생활 장면에서 맞추기 쉬워요.",
    caution: "생활 습관의 작은 차이를 방치하면 같은 문제로 계속 부딪힐 수 있어요.",
    action: "자주 부딪히는 생활 장면 하나를 골라 서로 지킬 기준을 정해 보세요.",
  },
  specialStars: {
    strength: "힘든 일이 생겼을 때 실제로 도와주거나 믿고 맡길 수 있는 장면이 생기기 쉬워요.",
    caution: "좋은 첫인상보다 약속을 지키고 실제로 돕는 행동을 더 중요하게 보세요.",
    action: "최근 서로에게 실제 도움이 됐던 행동 한 가지를 떠올려 보세요.",
  },
  spouseStarRealization: {
    strength: "연락, 데이트, 애정 표현, 관계에서 맡는 역할에 대한 기대가 맞물리기 쉬워요.",
    caution: "표현 방식이 다르면 애정의 크기보다 방식 차이 때문에 서운해질 수 있어요.",
    action: "연락·데이트·표현 중 나에게 가장 중요한 한 가지를 서로 말해 보세요.",
  },
  luckCycleAlignment: {
    strength: "생활 변화나 장기 계획을 함께 맞춰 갈 때 방향을 조율하기 쉬운 편이에요.",
    caution: "지금의 좋은 점수만으로 미래의 관계 결과나 시기를 확정할 수는 없어요.",
    action: "앞으로 3개월 동안 함께 지키고 싶은 일정이나 계획 하나를 정해 보세요.",
  },
};

export const SUMMARY_METRIC_IDS = [
  "overall",
  "communication",
  "emotionalStability",
  "conflictManagement",
  "longTerm",
  "relationshipPurpose",
] as const;

export type SummaryMetricId = (typeof SUMMARY_METRIC_IDS)[number];
export type SituationId = Exclude<SummaryMetricId, "overall">;

type CandidateMetricValue = {
  candidateId: OneToManyCandidateId;
  score: number;
};

export type SummaryMetricRow = {
  id: SummaryMetricId;
  label: string;
  description: string;
  values: CandidateMetricValue[];
};

export type SituationalRecommendation = {
  id: SituationId;
  label: string;
  candidateIds: OneToManyCandidateId[];
  leaderScore: number;
  shared: boolean;
  basis: "SINGLE" | "WITHIN_TWO_POINTS" | "UNCERTAINTY_OVERLAP" | "MIXED";
};

export type OneToManyResultView = {
  viewVersion: typeof ONE_TO_MANY_VIEW_VERSION;
  relationshipLabel: string;
  headline: string;
  summary: string;
  closenessNotice: string;
  finalSummary: string;
  rankings: Array<{
    candidateId: OneToManyCandidateId;
    displayName: string;
    rank: number;
    score: number;
    scoreGap: number;
    gapLabel: string;
    uncertaintyRange: { min: number; max: number; width: number };
    confidenceLabel: string;
  }>;
  summaryMetrics: Array<SummaryMetricRow & {
    values: Array<CandidateMetricValue & { displayName: string }>;
  }>;
  recommendations: Array<SituationalRecommendation & {
    displayNames: string[];
    reason: string;
  }>;
  candidateInsights: Array<{
    candidateId: OneToManyCandidateId;
    displayName: string;
    rank: number;
    score: number;
    insightTitle: string;
    oneLine: string;
    strengths: Array<{ label: string; copy: string }>;
    cautions: Array<{ label: string; copy: string }>;
    practicalTip: string;
  }>;
  detailedDimensions: Array<{
    dimension: CompatibilityDimension;
    label: string;
    values: Array<{ candidateId: OneToManyCandidateId; displayName: string; score: number }>;
  }>;
};

const RELATIONSHIP_LABELS: Record<OneToManyCalculationSnapshot["relationshipType"], string> = {
  crush: "짝사랑",
  flirting: "썸",
  lover: "연인",
  friend: "친구",
  coworker: "직장동료",
};

function roundScore(value: number) {
  return Math.round(value);
}

function publicCandidateScore(candidate: OneToManyCalculationSnapshot["candidates"][number]) {
  return calibrateCompatibilityScore(candidate.calculationSnapshot.rawTotal);
}

function publicCandidateRange(candidate: OneToManyCalculationSnapshot["candidates"][number]) {
  if (candidate.calculationSnapshot.scoringVersion === COMPATIBILITY_SCORING_VERSION) {
    return candidate.uncertaintyRange;
  }
  const min = calibrateCompatibilityScore(candidate.uncertaintyRange.min);
  const max = calibrateCompatibilityScore(candidate.uncertaintyRange.max);
  return { min, max, width: max - min };
}

function average(values: number[]) {
  return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function relationshipPurposeScore(
  profile: CompatibilityProfile,
  dimensions: Record<CompatibilityDimension, number>,
) {
  if (profile === "romance") {
    return average([dimensions.dayMaster, dimensions.dayBranch, dimensions.spouseStarRealization]);
  }
  if (profile === "friend") {
    return average([dimensions.dayMaster, dimensions.elementComplementarity, dimensions.specialStars]);
  }
  return average([
    dimensions.dayMaster,
    dimensions.elementComplementarity,
    dimensions.heavenlyStemInteraction,
    dimensions.earthlyBranchInteraction,
  ]);
}

function purposeCopy(profile: CompatibilityProfile) {
  if (profile === "romance") return { label: "연애 템포", description: "연락 빈도, 애정 표현, 데이트와 생활 리듬이 얼마나 잘 맞는지 봐요." };
  if (profile === "friend") return { label: "우정 신뢰", description: "연락 간격, 함께 있을 때의 편안함, 실제로 서로 돕는 힘을 봐요." };
  return { label: "협업 신뢰", description: "소통 속도, 역할 분담, 의견 충돌 뒤 조율이 얼마나 잘 되는지 봐요." };
}

export function buildSummaryMetrics(snapshot: OneToManyCalculationSnapshot): SummaryMetricRow[] {
  const rows = snapshot.candidates.map((candidate) => {
    const dimensions = Object.fromEntries(COMPATIBILITY_DIMENSIONS.map((dimension) => [
      dimension,
      candidate.calculationSnapshot.dimensions[dimension].normalizedScore,
    ])) as Record<CompatibilityDimension, number>;

    return {
      candidateId: candidate.candidateId,
      overall: publicCandidateScore(candidate),
      communication: average([dimensions.dayMaster, dimensions.heavenlyStemInteraction]),
      emotionalStability: average([dimensions.dayBranch, dimensions.usefulGodFit]),
      conflictManagement: average([dimensions.heavenlyStemInteraction, dimensions.earthlyBranchInteraction]),
      longTerm: average([dimensions.usefulGodFit, dimensions.elementComplementarity, dimensions.luckCycleAlignment]),
      relationshipPurpose: relationshipPurposeScore(snapshot.profile, dimensions),
    };
  });
  const purpose = purposeCopy(snapshot.profile);
  const definitions: Array<[SummaryMetricId, string, string]> = [
    ["overall", "전체 관계 궁합", "연락·생활·갈등·신뢰·장기관계를 포함한 9개 기준의 종합 결과예요."],
    ["communication", "연락·대화", "연락 빈도, 답장 속도, 대화할 때 반응과 표현 방식이 잘 맞는지 봐요."],
    ["emotionalStability", "편안함·신뢰", "가까워진 뒤 생활 리듬이 편한지, 힘들 때 서로 안정감을 주는지 봐요."],
    ["conflictManagement", "갈등 회복", "말다툼이나 생활 마찰이 생긴 뒤 다시 대화하고 기준을 맞추기 쉬운지 봐요."],
    ["longTerm", "생활·장기관계", "생활 습관과 역할을 맞추고 장기 계획을 함께 조율하기 쉬운지 봐요."],
    ["relationshipPurpose", purpose.label, purpose.description],
  ];

  return definitions.map(([id, label, description]) => ({
    id,
    label,
    description,
    values: rows.map((row) => ({ candidateId: row.candidateId, score: row[id] })),
  }));
}

function candidateById(snapshot: OneToManyCalculationSnapshot, candidateId: OneToManyCandidateId) {
  const candidate = snapshot.candidates.find((item) => item.candidateId === candidateId);
  if (!candidate) throw new Error(`1:N 후보를 찾을 수 없습니다: ${candidateId}`);
  return candidate;
}

export function buildSituationalRecommendations(
  snapshot: OneToManyCalculationSnapshot,
  metrics = buildSummaryMetrics(snapshot),
): SituationalRecommendation[] {
  return metrics.filter((metric): metric is SummaryMetricRow & { id: SituationId } => metric.id !== "overall")
    .map((metric) => {
      const ordered = [...metric.values].sort((a, b) => {
        const inputA = candidateById(snapshot, a.candidateId).inputIndex;
        const inputB = candidateById(snapshot, b.candidateId).inputIndex;
        return b.score - a.score || inputA - inputB;
      });
      const leader = ordered[0];
      const leaderCandidate = candidateById(snapshot, leader.candidateId);
      let withinTwo = false;
      let overlap = false;
      const candidateIds = ordered.filter((candidate, index) => {
        if (index === 0) return true;
        const close = leader.score - candidate.score <= 2;
        const rangesOverlap = uncertaintyRangesOverlap(
          leaderCandidate.uncertaintyRange,
          candidateById(snapshot, candidate.candidateId).uncertaintyRange,
        );
        withinTwo ||= close;
        overlap ||= rangesOverlap;
        return close || rangesOverlap;
      }).map((candidate) => candidate.candidateId);

      return {
        id: metric.id,
        label: metric.label,
        candidateIds,
        leaderScore: leader.score,
        shared: candidateIds.length > 1,
        basis: candidateIds.length === 1
          ? "SINGLE"
          : withinTwo && overlap
            ? "MIXED"
            : withinTwo
              ? "WITHIN_TWO_POINTS"
              : "UNCERTAINTY_OVERLAP",
      };
    });
}

function displayNameFor(candidateId: OneToManyCandidateId, names: Record<string, string>) {
  return names[candidateId]?.trim() || candidateId.replace("candidate_", "후보 ");
}

function gapLabel(gap: number, rank: number) {
  if (gap === 0 && rank === 1) return "종합 기준";
  if (gap <= 2) return "사실상 같은 수준";
  if (gap <= 5) return "선두와 근소한 차이";
  return "선두와 의미 있는 차이";
}

function candidateInsightTitle(candidate: OneToManyCalculationSnapshot["candidates"][number]) {
  const labels = candidate.calculationSnapshot.strengths.slice(0, 2).map((dimension) => DIMENSION_LABELS[dimension]);
  if (labels.length >= 2) return `${labels[0]} · ${labels[1]}이 돋보이는 관계`;
  if (labels.length === 1) return `${labels[0]}이 돋보이는 관계`;
  return "관계의 강점과 조율점을 함께 보는 관계";
}

function semanticDimensionLabel(
  dimensions: CompatibilityDimension[],
  index: number,
  fallback: string,
) {
  const dimension = dimensions[index] ?? dimensions[0];
  return dimension ? DIMENSION_LABELS[dimension] : fallback;
}

function recommendationReason(basis: SituationalRecommendation["basis"], label: string) {
  if (basis === "SINGLE") return `${label} 기준에서 가장 안정적으로 높은 점수를 보였어요.`;
  if (basis === "WITHIN_TWO_POINTS") return `${label} 점수 차이가 2점 이내라 한 명만 더 낫다고 단정하지 않았어요.`;
  if (basis === "UNCERTAINTY_OVERLAP") return `${label}에서 출생시간 변수에 따른 점수 범위가 겹쳐 공동 추천으로 봤어요.`;
  return `${label} 점수 차이가 작고 출생시간 변수에 따른 범위도 겹쳐 공동으로 추천해요.`;
}

export function buildOneToManyResultView(
  snapshot: OneToManyCalculationSnapshot,
  names: Record<string, string>,
  narrative?: OneToManyNarrativeContent,
): OneToManyResultView {
  const summaryMetrics = buildSummaryMetrics(snapshot);
  const recommendations = buildSituationalRecommendations(snapshot, summaryMetrics);
  const topGroup = snapshot.ranking.groups[0];
  const topNames = topGroup.candidateIds.map((id) => displayNameFor(id, names));
  const secondGroup = snapshot.ranking.groups[1];
  const leaderDisplayScore = publicCandidateScore(snapshot.candidates[0]);
  const secondDisplayScore = secondGroup?.candidateIds[0]
    ? publicCandidateScore(candidateById(snapshot, secondGroup.candidateIds[0]))
    : null;
  const displayGapToSecond = secondDisplayScore === null ? null : leaderDisplayScore - secondDisplayScore;
  const closenessNotice = displayGapToSecond !== null && displayGapToSecond <= 5
    ? `다음 순위와 ${displayGapToSecond}점 차이예요. 근소한 차이는 실제 관계의 절대적인 우열을 뜻하지 않아요.`
    : snapshot.candidates.some((candidate) => candidate.uncertaintyRange.width > 0)
      ? "출생시간을 모르는 대상은 가능한 시간대를 함께 계산했어요. 범위가 겹치면 한 사람의 우위를 단정하지 않아요."
      : "점수는 관계의 경향을 비교하는 기준이며, 사람 자체의 우열을 뜻하지 않아요.";

  return {
    viewVersion: ONE_TO_MANY_VIEW_VERSION,
    relationshipLabel: RELATIONSHIP_LABELS[snapshot.relationshipType],
    headline: narrative?.rankingSummary.headline ?? (topNames.length > 1
      ? `${topNames.join("·")}님이 종합 공동 1위예요.`
      : `${topNames[0]}님이 종합 점수에서는 가장 앞서요.`),
    summary: narrative?.rankingSummary.summary ?? `같은 ${RELATIONSHIP_LABELS[snapshot.relationshipType]} 기준으로 ${snapshot.candidateCount}명을 비교했어요. 종합 순위뿐 아니라 연락·대화, 편안함·신뢰, 갈등 회복, 생활·장기관계까지 같이 확인해 보세요.`,
    closenessNotice: narrative?.rankingSummary.closenessNotice ?? closenessNotice,
    finalSummary: narrative?.finalSummary ?? "이 비교는 사람의 우열을 정하는 답이 아니라, 각 관계에서 잘 맞는 지점과 확인할 대화를 찾는 기준이에요. 점수와 상황별 강점을 함께 보고 실제 관계의 경험과 대화로 확인해 보세요.",
    rankings: snapshot.candidates.map((candidate) => {
      const score = publicCandidateScore(candidate);
      const scoreGap = leaderDisplayScore - score;
      const uncertaintyRange = publicCandidateRange(candidate);
      return {
        candidateId: candidate.candidateId,
        displayName: displayNameFor(candidate.candidateId, names),
        rank: candidate.rank,
        score,
        scoreGap,
        gapLabel: gapLabel(scoreGap, candidate.rank),
        uncertaintyRange,
        confidenceLabel: uncertaintyRange.width === 0
          ? "입력 시간 기준"
          : `가능 범위 ${uncertaintyRange.min}~${uncertaintyRange.max}점`,
      };
    }),
    summaryMetrics: summaryMetrics.map((metric) => ({
      ...metric,
      values: metric.values.map((value) => ({
        ...value,
        displayName: displayNameFor(value.candidateId, names),
      })),
    })),
    recommendations: recommendations.map((recommendation) => ({
      ...recommendation,
      displayNames: recommendation.candidateIds.map((id) => displayNameFor(id, names)),
      reason: narrative?.situationalRecommendations[recommendation.id].reason ?? recommendationReason(recommendation.basis, recommendation.label),
    })),
    candidateInsights: snapshot.candidates.map((candidate) => {
      const strengths = candidate.calculationSnapshot.strengths.slice(0, 2);
      const cautions = candidate.calculationSnapshot.adjustmentPoints.slice(0, 2);
      const generated = narrative?.candidates.find((item) => item.candidateId === candidate.candidateId);
      return {
        candidateId: candidate.candidateId,
        displayName: displayNameFor(candidate.candidateId, names),
        rank: candidate.rank,
        score: publicCandidateScore(candidate),
        insightTitle: candidateInsightTitle(candidate),
        oneLine: generated?.oneLine ?? `${displayNameFor(candidate.candidateId, names)}님과의 관계에서 강점과 조율 지점을 함께 확인해 보세요.`,
        strengths: generated ? generated.strengths.map((copy, index) => ({
          label: semanticDimensionLabel(strengths, index, "관계 강점"),
          copy,
        })) : strengths.map((dimension) => ({
          label: DIMENSION_LABELS[dimension],
          copy: DIMENSION_GUIDES[dimension].strength,
        })),
        cautions: generated ? generated.cautions.map((copy, index) => ({
          label: semanticDimensionLabel(cautions, index, "관계 조율"),
          copy,
        })) : cautions.map((dimension) => ({
          label: DIMENSION_LABELS[dimension],
          copy: DIMENSION_GUIDES[dimension].caution,
        })),
        practicalTip: generated?.practicalTip ?? DIMENSION_GUIDES[cautions[0] ?? strengths[0]].action,
      };
    }),
    detailedDimensions: COMPATIBILITY_DIMENSIONS.map((dimension) => ({
      dimension,
      label: DIMENSION_LABELS[dimension],
      values: snapshot.candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        displayName: displayNameFor(candidate.candidateId, names),
        score: candidate.calculationSnapshot.dimensions[dimension].normalizedScore,
      })),
    })),
  };
}
