import type { CompatibilityDimension, CompatibilityProfile } from "./types";

export const COMPATIBILITY_SCORING_VERSION = "1.3.0";

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

export function getCompatibilityDimensionWeight(
  profile: CompatibilityProfile,
  dimension: CompatibilityDimension,
) {
  return COMPATIBILITY_SCORE_WEIGHTS[profile][dimension];
}

export function getCompatibilityProfileTotal(profile: CompatibilityProfile) {
  let total = 0;
  for (const value of Object.values(COMPATIBILITY_SCORE_WEIGHTS[profile])) {
    total += value;
  }
  return total;
}
