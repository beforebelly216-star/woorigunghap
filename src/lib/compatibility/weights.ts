import type { RelationshipType } from "@/lib/report-input";
import type { CompatibilityDimension, CompatibilityProfile } from "./types";

export const COMPATIBILITY_SCORING_VERSION = "1.7.0";

/**
 * Dimension scorers still use the three interpretation profiles for rules that
 * genuinely differ by romance/friend/coworker. Final public score weighting is
 * relationship-specific via RELATIONSHIP_SCORE_WEIGHTS below.
 */
export const COMPATIBILITY_SCORE_WEIGHTS = {
  romance: {
    dayMaster: 10,
    dayBranch: 15,
    usefulGodFit: 20,
    elementComplementarity: 10,
    heavenlyStemInteraction: 10,
    earthlyBranchInteraction: 15,
    specialStars: 5,
    spouseStarRealization: 10,
    luckCycleAlignment: 5,
  },
  friend: {
    dayMaster: 15,
    dayBranch: 5,
    usefulGodFit: 20,
    elementComplementarity: 15,
    heavenlyStemInteraction: 15,
    earthlyBranchInteraction: 15,
    specialStars: 10,
    spouseStarRealization: 0,
    luckCycleAlignment: 5,
  },
  coworker: {
    dayMaster: 15,
    dayBranch: 5,
    usefulGodFit: 20,
    elementComplementarity: 20,
    heavenlyStemInteraction: 10,
    earthlyBranchInteraction: 15,
    specialStars: 10,
    spouseStarRealization: 0,
    luckCycleAlignment: 5,
  },
} as const satisfies Record<
  CompatibilityProfile,
  Record<CompatibilityDimension, number>
>;

/**
 * Public 1:1/1:N scoring weights by the actual relationship selected by the
 * user. There is no relationship-specific score ceiling: every relationship
 * uses the same absolute 30..100 output range, while only emphasis changes.
 */
export const RELATIONSHIP_SCORE_WEIGHTS = {
  crush: {
    dayMaster: 15,
    dayBranch: 15,
    usefulGodFit: 15,
    elementComplementarity: 10,
    heavenlyStemInteraction: 15,
    earthlyBranchInteraction: 15,
    specialStars: 10,
    spouseStarRealization: 5,
    luckCycleAlignment: 0,
  },
  flirting: {
    dayMaster: 12,
    dayBranch: 16,
    usefulGodFit: 16,
    elementComplementarity: 10,
    heavenlyStemInteraction: 12,
    earthlyBranchInteraction: 16,
    specialStars: 7,
    spouseStarRealization: 7,
    luckCycleAlignment: 4,
  },
  lover: {
    dayMaster: 10,
    dayBranch: 15,
    usefulGodFit: 20,
    elementComplementarity: 10,
    heavenlyStemInteraction: 10,
    earthlyBranchInteraction: 15,
    specialStars: 5,
    spouseStarRealization: 10,
    luckCycleAlignment: 5,
  },
  friend: {
    dayMaster: 15,
    dayBranch: 5,
    usefulGodFit: 20,
    elementComplementarity: 15,
    heavenlyStemInteraction: 15,
    earthlyBranchInteraction: 15,
    specialStars: 10,
    spouseStarRealization: 0,
    luckCycleAlignment: 5,
  },
  coworker: {
    dayMaster: 15,
    dayBranch: 5,
    usefulGodFit: 20,
    elementComplementarity: 20,
    heavenlyStemInteraction: 10,
    earthlyBranchInteraction: 15,
    specialStars: 10,
    spouseStarRealization: 0,
    luckCycleAlignment: 5,
  },
} as const satisfies Record<RelationshipType, Record<CompatibilityDimension, number>>;

export function getCompatibilityDimensionWeight(
  profile: CompatibilityProfile,
  dimension: CompatibilityDimension,
) {
  return COMPATIBILITY_SCORE_WEIGHTS[profile][dimension];
}

export function getRelationshipDimensionWeight(
  relationshipType: RelationshipType,
  dimension: CompatibilityDimension,
) {
  return RELATIONSHIP_SCORE_WEIGHTS[relationshipType][dimension];
}

export function getCompatibilityProfileTotal(profile: CompatibilityProfile) {
  return Object.values(COMPATIBILITY_SCORE_WEIGHTS[profile]).reduce<number>(
    (sum, value) => sum + value,
    0,
  );
}

export function getRelationshipWeightTotal(relationshipType: RelationshipType) {
  return Object.values(RELATIONSHIP_SCORE_WEIGHTS[relationshipType]).reduce<number>(
    (sum, value) => sum + value,
    0,
  );
}
