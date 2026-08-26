import type { RelationshipType } from "@/lib/report-input";
import type { CompatibilityDimension } from "./types";
import { RELATIONSHIP_SCORE_WEIGHTS } from "./weights";

export const PUBLIC_COMPATIBILITY_SCORE_FLOOR = 30;
export const PUBLIC_COMPATIBILITY_SCORE_CEILING = 100;

export type CompatibilityScoreBand = {
  min: number;
  max: number;
  label: string;
  shortLabel: string;
  description: string;
};

/** Configured raw output interval for each deterministic dimension scorer. */
export const COMPATIBILITY_DIMENSION_RAW_BOUNDS: Record<CompatibilityDimension, { min: number; max: number }> = {
  dayMaster: { min: 55, max: 85 },
  dayBranch: { min: 45, max: 90 },
  usefulGodFit: { min: 50, max: 90 },
  elementComplementarity: { min: 55, max: 95 },
  heavenlyStemInteraction: { min: 45, max: 90 },
  earthlyBranchInteraction: { min: 40, max: 90 },
  specialStars: { min: 60, max: 85 },
  spouseStarRealization: { min: 55, max: 85 },
  luckCycleAlignment: { min: 45, max: 92 },
};

export const COMPATIBILITY_SCORE_BANDS: readonly CompatibilityScoreBand[] = [
  { min: 95, max: 100, label: "최상급 궁합", shortLabel: "최상급", description: "핵심 궁합 지표 대부분이 매우 강하게 맞는 조합이에요. 서로의 차이보다 잘 맞는 힘이 훨씬 크게 보입니다." },
  { min: 90, max: 94, label: "아주 잘 맞는 궁합", shortLabel: "아주 잘 맞음", description: "전반적으로 조화가 매우 좋은 편이에요. 몇 가지 차이가 있어도 관계의 강점이 뚜렷합니다." },
  { min: 85, max: 89, label: "상당히 잘 맞는 궁합", shortLabel: "상당히 잘 맞음", description: "여러 핵심 지표에서 강점이 겹쳐요. 실제 관계에서도 편한 장면을 만들기 쉬운 편입니다." },
  { min: 80, max: 84, label: "잘 맞는 궁합", shortLabel: "잘 맞는 편", description: "전체적으로 잘 맞는 편이에요. 약한 지점 몇 가지만 조율하면 장점이 더 선명해집니다." },
  { min: 75, max: 79, label: "좋은 궁합", shortLabel: "좋은 편", description: "강점이 분명한 좋은 조합이에요. 서로 다른 리듬은 대화로 맞춰갈 여지가 있습니다." },
  { min: 70, max: 74, label: "무난하게 잘 맞는 궁합", shortLabel: "무난하게 잘 맞음", description: "잘 맞는 부분과 다른 부분이 함께 보여요. 관계의 기본 체력은 무난한 편입니다." },
  { min: 65, max: 69, label: "조율하면 좋아지는 궁합", shortLabel: "조율하면 좋음", description: "차이가 조금 더 눈에 띄지만, 서로의 방식을 알면 편해질 수 있는 구간이에요." },
  { min: 60, max: 64, label: "차이가 있는 궁합", shortLabel: "차이가 있음", description: "생활·표현·갈등 방식 중 여러 지점에서 조율이 필요해요. 맞추는 방식이 중요합니다." },
  { min: 55, max: 59, label: "조율이 많이 필요한 궁합", shortLabel: "조율 필요", description: "서로 다른 지점이 꽤 분명합니다. 잘 맞는 강점을 의식적으로 살리지 않으면 피로가 쌓일 수 있어요." },
  { min: 50, max: 54, label: "차이가 큰 궁합", shortLabel: "차이가 큰 편", description: "관계의 기본 리듬 차이가 큽니다. 자연스럽게 맞기보다 서로의 방식을 이해하고 조율하려는 노력이 많이 필요해요." },
  { min: 40, max: 49, label: "부딪힘이 많은 궁합", shortLabel: "부딪힘이 많음", description: "핵심 관계 지표에서 충돌과 불균형이 많이 보입니다. 끌림이 있더라도 반복되는 피로 지점을 분명히 확인할 필요가 있어요." },
  { min: 30, max: 39, label: "맞추기 어려운 궁합", shortLabel: "맞추기 어려움", description: "여러 핵심 지표가 동시에 약한 조합입니다. 좋은 점을 억지로 부풀리기보다 실제로 반복될 수 있는 갈등 구조를 먼저 보는 편이 낫습니다." },
] as const;

export function getCompatibilityRawRange(relationshipType: RelationshipType) {
  let min = 0;
  let max = 0;
  const weights = RELATIONSHIP_SCORE_WEIGHTS[relationshipType];
  for (const dimension of Object.keys(weights) as CompatibilityDimension[]) {
    const weight = weights[dimension];
    const bounds = COMPATIBILITY_DIMENSION_RAW_BOUNDS[dimension];
    min += (bounds.min / 100) * weight;
    max += (bounds.max / 100) * weight;
  }
  return { min, max };
}

/**
 * All five relationships must be able to use the same 30..100 public scale.
 * The common raw interval is the overlap of every relationship's configured
 * attainable interval: the highest raw minimum to the lowest raw maximum.
 */
export function getCommonCompatibilityRawRange() {
  const relationshipTypes: RelationshipType[] = ["crush", "flirting", "lover", "friend", "coworker"];
  const ranges = relationshipTypes.map(getCompatibilityRawRange);
  const min = Math.max(...ranges.map((range) => range.min));
  const max = Math.min(...ranges.map((range) => range.max));
  if (!(max > min)) throw new Error("관계별 궁합 원점수 공통 정규화 구간이 유효하지 않습니다.");
  return { min, max };
}

/**
 * Normalize the shared attainable raw interval to the full public 30..100
 * scale. This is not an entertainment bonus: poor raw outcomes are pushed
 * toward 30, while only genuinely strong raw outcomes approach 100. Values
 * outside the shared attainable interval clamp to the absolute endpoints.
 */
export function calibrateCompatibilityScore(rawScore: number) {
  if (!Number.isFinite(rawScore)) throw new RangeError("궁합 점수는 유한한 숫자여야 합니다.");
  const range = getCommonCompatibilityRawRange();
  const clampedRaw = Math.min(range.max, Math.max(range.min, rawScore));
  const ratio = (clampedRaw - range.min) / (range.max - range.min);
  return Math.round(
    PUBLIC_COMPATIBILITY_SCORE_FLOOR
      + ratio * (PUBLIC_COMPATIBILITY_SCORE_CEILING - PUBLIC_COMPATIBILITY_SCORE_FLOOR),
  );
}

export function getCompatibilityScoreBand(score: number): CompatibilityScoreBand {
  const normalized = Math.min(
    PUBLIC_COMPATIBILITY_SCORE_CEILING,
    Math.max(PUBLIC_COMPATIBILITY_SCORE_FLOOR, Math.round(score)),
  );
  return COMPATIBILITY_SCORE_BANDS.find((band) => normalized >= band.min && normalized <= band.max)
    ?? COMPATIBILITY_SCORE_BANDS[COMPATIBILITY_SCORE_BANDS.length - 1];
}
