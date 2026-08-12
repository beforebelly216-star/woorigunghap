import {
  getRelationshipCalculationProfile,
  type OneToOneReportInput,
  type PersonBirthInput,
} from "@/lib/report-input";
import { scoreDayMasterCompatibility } from "./day-master";
import { scoreDayBranchCompatibility } from "./day-branch";
import {
  prepareCompatibilityPerson,
  scoreEarthlyBranchInteraction,
  scoreElementComplementarity,
  scoreHeavenlyStemInteraction,
  scoreLuckCycleAlignment,
  scoreSpecialStars,
  scoreSpouseStarRealization,
  scoreUsefulGodFit,
  type PreparedCompatibilityPerson,
} from "./simple-dimensions";
import type { CompatibilityDimension, CompatibilityProfile } from "./types";
import {
  COMPATIBILITY_SCORE_WEIGHTS,
  COMPATIBILITY_SCORING_VERSION,
  getCompatibilityDimensionWeight,
} from "./weights";

export const COMPATIBILITY_ENGINE_VERSION = "compatibility-engine-v1.2.0";

const DIMENSIONS: CompatibilityDimension[] = [
  "dayMaster",
  "dayBranch",
  "usefulGodFit",
  "elementComplementarity",
  "heavenlyStemInteraction",
  "earthlyBranchInteraction",
  "specialStars",
  "spouseStarRealization",
  "luckCycleAlignment",
];

// 각 지지 시각대의 중앙에 가까운 대표 시각. 원본 시주는 저장하지 않고 계산 시나리오에서만 사용한다.
const UNKNOWN_TIME_SCENARIOS = [
  "00:30",
  "02:30",
  "04:30",
  "06:30",
  "08:30",
  "10:30",
  "12:30",
  "14:30",
  "16:30",
  "18:30",
  "20:30",
  "22:30",
] as const;

type DimensionResult = {
  normalizedScore: number;
  weightedPoints: number;
  maxPoints: number;
  evidence: unknown;
};

type ScenarioResult = {
  labelA: string;
  labelB: string;
  dimensions: Record<CompatibilityDimension, DimensionResult>;
  rawTotal: number;
};

export type CompatibilityCalculationSnapshot = {
  engineVersion: string;
  scoringVersion: string;
  relationshipType: OneToOneReportInput["relationshipType"];
  profile: CompatibilityProfile;
  scenarioPolicy: {
    personAScenarios: number;
    personBScenarios: number;
    pairScenarios: number;
    unknownTimeRepresentativeHours: readonly string[];
    aggregation: "DIMENSION_MEDIAN";
  };
  dimensions: Record<
    CompatibilityDimension,
    {
      normalizedScore: number;
      maxPoints: number;
      weightedPoints: number;
    }
  >;
  rawTotal: number;
  score: number;
  uncertaintyRange: {
    min: number;
    max: number;
    width: number;
  };
  confidence: "high" | "medium" | "low";
  representativeEvidence: Record<CompatibilityDimension, unknown>;
  aiBoundary: {
    scoreMutableByAi: false;
    rankingMutableByAi: false;
  };
};

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]) {
  if (values.length === 0) throw new RangeError("중앙값을 계산할 값이 없습니다.");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function expandPersonScenarios(person: PersonBirthInput) {
  if (person.birthTimeKnown) {
    return [{ label: person.birthTime ?? "known", input: person }];
  }

  return UNKNOWN_TIME_SCENARIOS.map((time) => ({
    label: `unknown:${time}`,
    input: {
      ...person,
      birthTimeKnown: true,
      birthTime: time,
    } satisfies PersonBirthInput,
  }));
}

function prepareScenarios(person: PersonBirthInput) {
  return expandPersonScenarios(person).map((scenario) => ({
    ...scenario,
    prepared: prepareCompatibilityPerson(scenario.input),
  }));
}

function scorePreparedPair(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
  labelA: string,
  labelB: string,
): ScenarioResult {
  const dayMaster = scoreDayMasterCompatibility(
    a.snapshot.pillars.day.heavenlyStem,
    b.snapshot.pillars.day.heavenlyStem,
    profile,
  );
  const dayBranch = scoreDayBranchCompatibility(
    a.snapshot.pillars.day.earthlyBranch,
    b.snapshot.pillars.day.earthlyBranch,
    profile,
  );
  const usefulGodFit = scoreUsefulGodFit(a, b, profile);
  const elementComplementarity = scoreElementComplementarity(a, b, profile);
  const heavenlyStemInteraction = scoreHeavenlyStemInteraction(a, b, profile);
  const earthlyBranchInteraction = scoreEarthlyBranchInteraction(a, b, profile);
  const specialStars = scoreSpecialStars(a, b, profile);
  const spouseStarRealization = scoreSpouseStarRealization(a, b, profile);
  const luckCycleAlignment = scoreLuckCycleAlignment(profile);

  const dimensions: Record<CompatibilityDimension, DimensionResult> = {
    dayMaster: {
      normalizedScore: dayMaster.normalizedScore,
      weightedPoints: dayMaster.weightedPoints,
      maxPoints: dayMaster.maxPoints,
      evidence: dayMaster,
    },
    dayBranch: {
      normalizedScore: dayBranch.normalizedScore,
      weightedPoints: dayBranch.weightedPoints,
      maxPoints: dayBranch.maxPoints,
      evidence: dayBranch,
    },
    usefulGodFit: {
      normalizedScore: usefulGodFit.normalizedScore,
      weightedPoints: usefulGodFit.weightedPoints,
      maxPoints: usefulGodFit.maxPoints,
      evidence: usefulGodFit.evidence,
    },
    elementComplementarity: {
      normalizedScore: elementComplementarity.normalizedScore,
      weightedPoints: elementComplementarity.weightedPoints,
      maxPoints: elementComplementarity.maxPoints,
      evidence: elementComplementarity.evidence,
    },
    heavenlyStemInteraction: {
      normalizedScore: heavenlyStemInteraction.normalizedScore,
      weightedPoints: heavenlyStemInteraction.weightedPoints,
      maxPoints: heavenlyStemInteraction.maxPoints,
      evidence: heavenlyStemInteraction.evidence,
    },
    earthlyBranchInteraction: {
      normalizedScore: earthlyBranchInteraction.normalizedScore,
      weightedPoints: earthlyBranchInteraction.weightedPoints,
      maxPoints: earthlyBranchInteraction.maxPoints,
      evidence: earthlyBranchInteraction.evidence,
    },
    specialStars: {
      normalizedScore: specialStars.normalizedScore,
      weightedPoints: specialStars.weightedPoints,
      maxPoints: specialStars.maxPoints,
      evidence: specialStars.evidence,
    },
    spouseStarRealization: {
      normalizedScore: spouseStarRealization.normalizedScore,
      weightedPoints: spouseStarRealization.weightedPoints,
      maxPoints: spouseStarRealization.maxPoints,
      evidence: spouseStarRealization.evidence,
    },
    luckCycleAlignment: {
      normalizedScore: luckCycleAlignment.normalizedScore,
      weightedPoints: luckCycleAlignment.weightedPoints,
      maxPoints: luckCycleAlignment.maxPoints,
      evidence: luckCycleAlignment.evidence,
    },
  };

  const rawTotal = round4(
    Object.values(dimensions).reduce((sum, dimension) => sum + dimension.weightedPoints, 0),
  );

  return { labelA, labelB, dimensions, rawTotal };
}

function confidenceForRange(width: number) {
  if (width <= 3) return "high" as const;
  if (width <= 8) return "medium" as const;
  return "low" as const;
}

export function calculateOneToOneCompatibility(
  input: OneToOneReportInput,
): CompatibilityCalculationSnapshot {
  const profile = getRelationshipCalculationProfile(input.relationshipType);
  const aScenarios = prepareScenarios(input.personA);
  const bScenarios = prepareScenarios(input.personB);
  const scenarioResults: ScenarioResult[] = [];

  for (const a of aScenarios) {
    for (const b of bScenarios) {
      scenarioResults.push(scorePreparedPair(a.prepared, b.prepared, profile, a.label, b.label));
    }
  }

  const dimensions = {} as CompatibilityCalculationSnapshot["dimensions"];
  for (const dimension of DIMENSIONS) {
    const normalizedScore = round1(
      median(scenarioResults.map((scenario) => scenario.dimensions[dimension].normalizedScore)),
    );
    const maxPoints = getCompatibilityDimensionWeight(profile, dimension);
    dimensions[dimension] = {
      normalizedScore,
      maxPoints,
      weightedPoints: round4((normalizedScore / 100) * maxPoints),
    };
  }

  const rawTotal = round4(
    clamp(
      Object.values(dimensions).reduce((sum, dimension) => sum + dimension.weightedPoints, 0),
      30,
      100,
    ),
  );
  const score = Math.round(rawTotal);
  const min = Math.round(Math.min(...scenarioResults.map((scenario) => clamp(scenario.rawTotal, 30, 100))));
  const max = Math.round(Math.max(...scenarioResults.map((scenario) => clamp(scenario.rawTotal, 30, 100))));
  const width = max - min;

  const representative = [...scenarioResults].sort(
    (x, y) => Math.abs(x.rawTotal - rawTotal) - Math.abs(y.rawTotal - rawTotal),
  )[0];
  const representativeEvidence = {} as Record<CompatibilityDimension, unknown>;
  for (const dimension of DIMENSIONS) {
    representativeEvidence[dimension] = representative.dimensions[dimension].evidence;
  }

  const configuredWeightTotal = Object.values(COMPATIBILITY_SCORE_WEIGHTS[profile]).reduce(
    (sum, value) => sum + value,
    0,
  );
  if (configuredWeightTotal !== 100) {
    throw new Error(`${profile} 궁합 배점 합계가 100이 아닙니다: ${configuredWeightTotal}`);
  }

  return {
    engineVersion: COMPATIBILITY_ENGINE_VERSION,
    scoringVersion: COMPATIBILITY_SCORING_VERSION,
    relationshipType: input.relationshipType,
    profile,
    scenarioPolicy: {
      personAScenarios: aScenarios.length,
      personBScenarios: bScenarios.length,
      pairScenarios: scenarioResults.length,
      unknownTimeRepresentativeHours: UNKNOWN_TIME_SCENARIOS,
      aggregation: "DIMENSION_MEDIAN",
    },
    dimensions,
    rawTotal,
    score,
    uncertaintyRange: { min, max, width },
    confidence: confidenceForRange(width),
    representativeEvidence,
    aiBoundary: {
      scoreMutableByAi: false,
      rankingMutableByAi: false,
    },
  };
}
