export type CompatibilityProfile = "romance" | "friend" | "coworker";

export type CompatibilityDimension =
  | "dayMaster"
  | "dayBranch"
  | "usefulGodFit"
  | "elementComplementarity"
  | "heavenlyStemInteraction"
  | "earthlyBranchInteraction"
  | "specialStars"
  | "spouseStarRealization"
  | "luckCycleAlignment";

export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";
export type YinYang = "yang" | "yin";

export type DayMasterRelation = "GENERATES" | "SAME_ELEMENT" | "CONTROLS";
export type DayMasterDirection = "A_TO_B" | "B_TO_A" | "MUTUAL";
export type PolarityRelation = "SAME" | "OPPOSITE";

export type DayMasterCompatibilityScore = {
  dimension: "dayMaster";
  stemA: string;
  stemB: string;
  canonicalStemA: string;
  canonicalStemB: string;
  elementA: FiveElement;
  elementB: FiveElement;
  yinYangA: YinYang;
  yinYangB: YinYang;
  relation: DayMasterRelation;
  direction: DayMasterDirection;
  polarityRelation: PolarityRelation;
  normalizedScore: 55 | 70 | 85;
  profile: CompatibilityProfile;
  maxPoints: number;
  weightedPoints: number;
};
