import type { RelationshipType } from "@/lib/report-input";
import type { CompatibilityDimension } from "./types";
import { RELATIONSHIP_SCORE_WEIGHTS } from "./weights";

export const PUBLIC_COMPATIBILITY_SCORE_FLOOR = 30;
export const PUBLIC_COMPATIBILITY_SCORE_CEILING = 100;
export const COMPATIBILITY_GRADE_POLICY_VERSION = "relationship-grade-v1" as const;

export const COMPATIBILITY_GRADES = ["S", "A", "B", "C", "D", "E"] as const;
export type CompatibilityGrade = (typeof COMPATIBILITY_GRADES)[number];

export const COMPATIBILITY_GRADE_COPY: Record<CompatibilityGrade, {
  min: number;
  max: number;
  label: string;
  description: string;
}> = {
  S: { min: 90, max: 100, label: "강하게 통하는 관계", description: "여러 관계 축에서 강점이 뚜렷하게 겹쳐요." },
  A: { min: 80, max: 89, label: "아주 잘 맞는 관계", description: "편하게 맞는 지점이 많고 조율 부담이 적은 편이에요." },
  B: { min: 70, max: 79, label: "잘 맞는 관계", description: "강점이 분명하고 차이는 대화로 맞추기 좋은 편이에요." },
  C: { min: 60, max: 69, label: "균형을 찾는 관계", description: "맞는 부분과 다른 부분이 함께 보여요." },
  D: { min: 50, max: 59, label: "조율이 필요한 관계", description: "서로의 방식과 기대를 자주 확인할수록 좋아요." },
  E: { min: 30, max: 49, label: "세심한 조율이 필요한 관계", description: "반복되는 차이를 먼저 알고 천천히 맞춰가는 편이 좋아요." },
};

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
  ...COMPATIBILITY_GRADES.map((grade) => ({
    ...COMPATIBILITY_GRADE_COPY[grade],
    label: `${grade}등급 · ${COMPATIBILITY_GRADE_COPY[grade].label}`,
    shortLabel: `${grade}등급`,
  })),
] as const;

type CalibrationKnot = { raw: number; score: number };

/**
 * Deterministic contrast curve for the public score. The calculation itself
 * remains untouched; these knots only spread the realistically observed raw
 * interval so weak and strong pairs no longer collapse into the 60s and 70s.
 */
function compatibilityCalibrationKnots(): readonly CalibrationKnot[] {
  const range = getCommonCompatibilityRawRange();
  return [
    { raw: range.min, score: 30 },
    { raw: 58, score: 35 },
    { raw: 62, score: 45 },
    { raw: 66, score: 55 },
    { raw: 70, score: 66 },
    { raw: 74, score: 78 },
    { raw: 78, score: 89 },
    { raw: 82, score: 96 },
    { raw: range.max, score: 100 },
  ];
}

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
  const knots = compatibilityCalibrationKnots();
  const upperIndex = knots.findIndex((knot) => clampedRaw <= knot.raw);
  if (upperIndex <= 0) return knots[0].score;
  const lower = knots[upperIndex - 1];
  const upper = knots[upperIndex];
  const ratio = (clampedRaw - lower.raw) / (upper.raw - lower.raw);
  return Math.round(lower.score + ratio * (upper.score - lower.score));
}

/** Re-map stored v1.6 linear public scores without mistaking them for raw scores. */
export function migrateStoredCompatibilityScore(score: number, sourceScoringVersion: string) {
  const clampedScore = Math.min(
    PUBLIC_COMPATIBILITY_SCORE_CEILING,
    Math.max(PUBLIC_COMPATIBILITY_SCORE_FLOOR, score),
  );
  if (sourceScoringVersion !== "1.6.0") return Math.round(clampedScore);
  const range = getCommonCompatibilityRawRange();
  const legacyRatio = (clampedScore - PUBLIC_COMPATIBILITY_SCORE_FLOOR)
    / (PUBLIC_COMPATIBILITY_SCORE_CEILING - PUBLIC_COMPATIBILITY_SCORE_FLOOR);
  return calibrateCompatibilityScore(range.min + legacyRatio * (range.max - range.min));
}

export function getCompatibilityGrade(score: number): CompatibilityGrade {
  const normalized = Math.min(
    PUBLIC_COMPATIBILITY_SCORE_CEILING,
    Math.max(PUBLIC_COMPATIBILITY_SCORE_FLOOR, Math.round(score)),
  );
  return COMPATIBILITY_GRADES.find((grade) => {
    const range = COMPATIBILITY_GRADE_COPY[grade];
    return normalized >= range.min && normalized <= range.max;
  }) ?? "E";
}

export function getCompatibilityScoreBand(score: number): CompatibilityScoreBand {
  const normalized = Math.min(
    PUBLIC_COMPATIBILITY_SCORE_CEILING,
    Math.max(PUBLIC_COMPATIBILITY_SCORE_FLOOR, Math.round(score)),
  );
  return COMPATIBILITY_SCORE_BANDS.find((band) => normalized >= band.min && normalized <= band.max)
    ?? COMPATIBILITY_SCORE_BANDS[COMPATIBILITY_SCORE_BANDS.length - 1];
}
