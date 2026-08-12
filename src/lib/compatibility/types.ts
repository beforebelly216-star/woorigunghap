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
export type PillarPosition = "year" | "month" | "day" | "hour";

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

export type DayBranchPrimaryRelation =
  | "SIX_HARMONY"
  | "NEUTRAL"
  | "HARM"
  | "PUNISHMENT"
  | "CLASH";

export type DayBranchEvidenceRelation = Exclude<DayBranchPrimaryRelation, "NEUTRAL">;

export type DayBranchCompatibilityScore = {
  dimension: "dayBranch";
  branchA: string;
  branchB: string;
  canonicalBranchA: string;
  canonicalBranchB: string;
  evidenceRelations: DayBranchEvidenceRelation[];
  primaryRelation: DayBranchPrimaryRelation;
  normalizedScore: 45 | 55 | 60 | 70 | 90;
  profile: CompatibilityProfile;
  maxPoints: number;
  weightedPoints: number;
};

export type HiddenStemRole = "RESIDUAL" | "MIDDLE" | "MAIN";

export type HiddenStemEvidence = {
  stem: string;
  element: FiveElement;
  role: HiddenStemRole;
};

export type MonthCommandEvidence = {
  status:
    | "STABLE"
    | "TIME_UNKNOWN_STABLE"
    | "TIME_UNKNOWN_UNCERTAIN"
    | "MONTH_PILLAR_UNCERTAIN";
  branch: string | null;
  jeolName: string | null;
  jeolInstantUtc: string | null;
  elapsedDay: number | null;
  allocationDay: number | null;
  commanderStem: string | null;
  commanderElement: FiveElement | null;
  commanderRole: HiddenStemRole | null;
};

export type UsefulGodPreparationEvidence = {
  version: "useful-god-prep-v1";
  status: "EVIDENCE_ONLY";
  scoringReady: false;
  pillarsUsed: PillarPosition[];
  dayMaster: {
    stem: string;
    element: FiveElement;
  };
  branchHiddenStems: Array<{
    position: PillarPosition;
    branch: string;
    branchElement: FiveElement;
    hiddenStems: HiddenStemEvidence[];
  }>;
  rootEvidence: {
    byPillar: Array<{
      position: PillarPosition;
      branch: string;
      containsExactDayMasterStem: boolean;
      containsDayMasterElement: boolean;
    }>;
    exactRootPositions: PillarPosition[];
    elementRootPositions: PillarPosition[];
    primaryElementRootPositions: PillarPosition[];
    hasExactRoot: boolean;
    hasElementRoot: boolean;
    hasPrimaryElementRoot: boolean;
  };
  elementOccurrences: {
    visibleStems: Record<FiveElement, number>;
    branchSurface: Record<FiveElement, number>;
    hiddenStems: Record<FiveElement, number>;
  };
  monthCommand: MonthCommandEvidence;
  methodDecision: {
    selectedMethod: null;
    usefulElements: FiveElement[];
    favorableElements: FiveElement[];
    unfavorableElements: FiveElement[];
    confidence: null;
    pendingApprovals: Array<
      | "STRENGTH_WEIGHTING"
      | "STRONG_WEAK_THRESHOLDS"
      | "SPECIAL_STRUCTURE_THRESHOLDS"
      | "CLIMATE_PRIORITY_THRESHOLDS"
      | "MEDIATION_PRIORITY_THRESHOLDS"
      | "USEFUL_FAVORABLE_UNFAVORABLE_MAPPING"
      | "USEFUL_GOD_FIT_SCORE_MAPPING"
    >;
  };
};
