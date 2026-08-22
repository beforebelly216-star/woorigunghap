import { COMPATIBILITY_DIMENSIONS } from "./engine";
import {
  uncertaintyRangesOverlap,
  type OneToManyCalculationSnapshot,
  type OneToManyCandidateId,
} from "./one-to-many";
import type { CompatibilityDimension, CompatibilityProfile } from "./types";
import type { OneToManyNarrativeContent } from "@/lib/narrative/one-to-many-report-engine";

export const ONE_TO_MANY_VIEW_VERSION = "one-to-many-view-v1.1.0" as const;

export const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
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

const DIMENSION_GUIDES: Record<CompatibilityDimension, {
  strength: string;
  caution: string;
  action: string;
}> = {
  dayMaster: {
    strength: "서로의 기본 반응 방식이 비교적 자연스럽게 이어져요.",
    caution: "판단 기준이 다르게 느껴질 때 결론부터 단정하지 않는 편이 좋아요.",
    action: "중요한 선택 전에는 각자 우선순위를 한 문장씩 먼저 말해 보세요.",
  },
  dayBranch: {
    strength: "가까워진 뒤의 생활 리듬과 정서적 반응이 잘 맞는 편이에요.",
    caution: "편안함을 당연하게 여기면 작은 서운함이 뒤늦게 커질 수 있어요.",
    action: "일상에서 편했던 순간과 불편했던 순간을 구체적으로 나눠 보세요.",
  },
  usefulGodFit: {
    strength: "서로에게 필요한 기운을 보완하는 방향이 비교적 선명해요.",
    caution: "도움을 주는 방식이 상대에게는 간섭처럼 느껴질 수 있어요.",
    action: "도움이 필요할 때 원하는 방식부터 서로 확인해 보세요.",
  },
  elementComplementarity: {
    strength: "서로 다른 장점이 한쪽으로 치우치지 않게 균형을 만들어 줘요.",
    caution: "차이를 장점이 아니라 성격 결함으로 해석하지 않도록 주의하세요.",
    action: "각자 잘하는 역할을 나누고 결과 기준을 미리 합의해 보세요.",
  },
  heavenlyStemInteraction: {
    strength: "겉으로 드러나는 의사 표현과 관계의 추진력이 잘 이어져요.",
    caution: "표현 속도나 말투 차이가 생기면 의도보다 태도가 먼저 보일 수 있어요.",
    action: "민감한 대화는 메신저보다 짧은 통화나 대면으로 확인해 보세요.",
  },
  earthlyBranchInteraction: {
    strength: "반복되는 일상 속에서 서로의 습관을 받아들이기 쉬운 편이에요.",
    caution: "생활 방식의 작은 차이가 누적되면 반복 마찰이 될 수 있어요.",
    action: "자주 부딪히는 한 가지 상황의 기준을 먼저 정해 보세요.",
  },
  specialStars: {
    strength: "필요한 순간에 서로를 돕는 계기와 연결 신호가 비교적 좋아요.",
    caution: "좋은 첫인상이나 우연한 계기만으로 관계 전체를 판단하지 마세요.",
    action: "실제로 도움을 주고받았던 행동을 기준으로 관계를 살펴보세요.",
  },
  spouseStarRealization: {
    strength: "연애 관계에서 기대하는 역할과 애정 표현이 맞물리기 쉬워요.",
    caution: "관계 역할에 대한 기대가 다르면 애정의 크기를 오해할 수 있어요.",
    action: "연락·데이트·표현 중 가장 중요한 한 가지를 서로 말해 보세요.",
  },
  luckCycleAlignment: {
    strength: "관계의 장기적인 방향을 함께 조율할 여지가 있어요.",
    caution: "현재 점수만으로 미래의 성공이나 시기를 단정할 수는 없어요.",
    action: "가까운 3개월 동안 함께 지키고 싶은 계획 하나를 정해 보세요.",
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
  if (profile === "romance") return { label: "연애 호흡", description: "끌림과 생활 리듬, 관계 역할의 조화를 함께 봐요." };
  if (profile === "friend") return { label: "우정의 편안함", description: "기본 호흡과 보완성, 서로 돕는 신호를 함께 봐요." };
  return { label: "협업 적합도", description: "업무 호흡과 역할 보완, 소통·마찰 신호를 함께 봐요." };
}

export function buildSummaryMetrics(snapshot: OneToManyCalculationSnapshot): SummaryMetricRow[] {
  const rows = snapshot.candidates.map((candidate) => {
    const dimensions = Object.fromEntries(COMPATIBILITY_DIMENSIONS.map((dimension) => [
      dimension,
      candidate.calculationSnapshot.dimensions[dimension].normalizedScore,
    ])) as Record<CompatibilityDimension, number>;

    return {
      candidateId: candidate.candidateId,
      overall: candidate.score,
      communication: average([dimensions.dayMaster, dimensions.heavenlyStemInteraction]),
      emotionalStability: average([dimensions.dayBranch, dimensions.usefulGodFit]),
      conflictManagement: average([dimensions.heavenlyStemInteraction, dimensions.earthlyBranchInteraction]),
      longTerm: average([dimensions.usefulGodFit, dimensions.elementComplementarity, dimensions.luckCycleAlignment]),
      relationshipPurpose: relationshipPurposeScore(snapshot.profile, dimensions),
    };
  });
  const purpose = purposeCopy(snapshot.profile);
  const definitions: Array<[SummaryMetricId, string, string]> = [
    ["overall", "종합 궁합", "관계 유형별 9개 항목의 가중 점수를 합산한 결과예요."],
    ["communication", "소통 궁합", "기본 반응과 겉으로 드러나는 표현의 호흡을 봐요."],
    ["emotionalStability", "정서 안정", "가까워진 뒤의 리듬과 필요한 기운의 보완을 봐요."],
    ["conflictManagement", "갈등 관리", "표현의 긴장과 반복 마찰을 조율하기 쉬운지 봐요."],
    ["longTerm", "지속성", "서로의 균형과 장기 방향을 안정적으로 맞출 여지를 봐요."],
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

function recommendationReason(basis: SituationalRecommendation["basis"]) {
  if (basis === "SINGLE") return "이 상황의 관련 지표에서 가장 높은 점수를 보였어요.";
  if (basis === "WITHIN_TWO_POINTS") return "관련 지표 차이가 2점 이내라 한 명으로 단정하지 않았어요.";
  if (basis === "UNCERTAINTY_OVERLAP") return "출생시간 변수에 따른 점수 범위가 겹쳐 공동으로 보는 편이 안전해요.";
  return "관련 지표 차이가 작고 출생시간 변수에 따른 범위도 겹쳐 공동으로 추천해요.";
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
  const closenessNotice = secondGroup?.gapFromPreviousGroup?.band === "SLIGHT_EDGE"
    ? `다음 순위와 ${secondGroup.gapFromPreviousGroup.points}점 차이예요. 근소한 차이는 실제 관계의 절대적인 우열을 뜻하지 않아요.`
    : snapshot.candidates.some((candidate) => candidate.uncertaintyRange.width > 0)
      ? "출생시간을 모르는 대상은 가능한 시간대를 함께 계산했어요. 범위가 겹치면 한 사람의 우위를 단정하지 않아요."
      : "점수는 관계의 경향을 비교하는 기준이며, 사람 자체의 우열을 뜻하지 않아요.";

  return {
    viewVersion: ONE_TO_MANY_VIEW_VERSION,
    relationshipLabel: RELATIONSHIP_LABELS[snapshot.relationshipType],
    headline: narrative?.rankingSummary.headline ?? (topNames.length > 1
      ? `${topNames.join("·")}님이 종합 공동 1위예요.`
      : `${topNames[0]}님이 종합 점수에서는 가장 앞서요.`),
    summary: narrative?.rankingSummary.summary ?? `같은 ${RELATIONSHIP_LABELS[snapshot.relationshipType]} 기준으로 ${snapshot.candidateCount}명을 비교했어요. 종합 순위만 보지 않고 소통, 정서 안정, 갈등 관리, 지속성과 관계 목적별 강점을 함께 확인해 보세요.`,
    closenessNotice: narrative?.rankingSummary.closenessNotice ?? closenessNotice,
    finalSummary: narrative?.finalSummary ?? "이 비교는 사람의 우열을 정하는 답이 아니라, 각 관계에서 잘 맞는 지점과 확인할 대화를 찾는 기준이에요. 점수와 상황별 강점을 함께 보고 실제 관계의 경험과 대화로 확인해 보세요.",
    rankings: snapshot.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      displayName: displayNameFor(candidate.candidateId, names),
      rank: candidate.rank,
      score: candidate.score,
      scoreGap: candidate.comparisonToLeader.scoreGap,
      gapLabel: gapLabel(candidate.comparisonToLeader.scoreGap, candidate.rank),
      uncertaintyRange: candidate.uncertaintyRange,
      confidenceLabel: candidate.uncertaintyRange.width === 0
        ? "입력 시간 기준"
        : `가능 범위 ${candidate.uncertaintyRange.min}~${candidate.uncertaintyRange.max}점`,
    })),
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
      reason: narrative?.situationalRecommendations[recommendation.id].reason ?? recommendationReason(recommendation.basis),
    })),
    candidateInsights: snapshot.candidates.map((candidate) => {
      const strengths = candidate.calculationSnapshot.strengths.slice(0, 2);
      const cautions = candidate.calculationSnapshot.adjustmentPoints.slice(0, 2);
      const generated = narrative?.candidates.find((item) => item.candidateId === candidate.candidateId);
      return {
        candidateId: candidate.candidateId,
        displayName: displayNameFor(candidate.candidateId, names),
        rank: candidate.rank,
        score: candidate.score,
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
