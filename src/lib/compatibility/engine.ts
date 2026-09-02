import {
  getRelationshipCalculationProfile,
  type OneToOneReportInput,
  type PersonBirthInput,
} from "@/lib/report-input";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import { scoreDayBranchCompatibility } from "./day-branch";
import { scoreDayMasterCompatibility } from "./day-master";
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
import { calculateThreeYearTimingAlignment, type ThreeYearTimingAssessment } from "./timing-alignment";
import { calibrateCompatibilityScore } from "./score-scale";
import type { CompatibilityDimension, CompatibilityProfile } from "./types";
import {
  COMPATIBILITY_SCORING_VERSION,
  RELATIONSHIP_SCORE_WEIGHTS,
  getRelationshipDimensionWeight,
} from "./weights";

export const COMPATIBILITY_ENGINE_VERSION = "compatibility-engine-v1.6.0";

export const COMPATIBILITY_DIMENSIONS = [
  "dayMaster",
  "dayBranch",
  "usefulGodFit",
  "elementComplementarity",
  "heavenlyStemInteraction",
  "earthlyBranchInteraction",
  "specialStars",
  "spouseStarRealization",
  "luckCycleAlignment",
] as const satisfies readonly CompatibilityDimension[];

const UNKNOWN_TIME_SCENARIOS = [
  "00:30", "02:30", "04:30", "06:30", "08:30", "10:30",
  "12:30", "14:30", "16:30", "18:30", "20:30", "22:30",
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

type BirthScenario = {
  label: string;
  input: PersonBirthInput;
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
    boundaryStatesAdded: boolean;
    aggregation: "DIMENSION_MEDIAN";
  };
  dimensions: Record<CompatibilityDimension, {
    normalizedScore: number;
    maxPoints: number;
    weightedPoints: number;
  }>;
  rawTotal: number;
  score: number;
  uncertaintyRange: { min: number; max: number; width: number };
  confidence: "high" | "medium" | "low";
  strengths: CompatibilityDimension[];
  adjustmentPoints: CompatibilityDimension[];
  representativeEvidence: Record<CompatibilityDimension, unknown>;
  threeYearTiming?: ThreeYearTimingAssessment;
  aiBoundary: { scoreMutableByAi: false; rankingMutableByAi: false };
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]) {
  if (!values.length) throw new RangeError("중앙값을 계산할 값이 없습니다.");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function currentKoreanYear() {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date()));
}

function pillarBoundaryKey(person: PersonBirthInput) {
  const snapshot = calculateManseSnapshot(person);
  return `${snapshot.pillars.year?.korean ?? "null"}|${snapshot.pillars.month?.korean ?? "null"}`;
}

function expandPersonScenarios(person: PersonBirthInput) {
  if (person.birthTimeKnown) {
    return {
      boundaryStatesAdded: false,
      scenarios: [{ label: person.birthTime ?? "known", input: person }] as BirthScenario[],
    };
  }

  const scenarios: BirthScenario[] = UNKNOWN_TIME_SCENARIOS.map((time) => ({
    label: `unknown:${time}`,
    input: { ...person, birthTimeKnown: true, birthTime: time },
  }));

  const start: PersonBirthInput = { ...person, birthTimeKnown: true, birthTime: "00:01" };
  const end: PersonBirthInput = { ...person, birthTimeKnown: true, birthTime: "23:59" };
  const boundaryStatesAdded = pillarBoundaryKey(start) !== pillarBoundaryKey(end);

  if (boundaryStatesAdded) {
    scenarios.push({ label: "boundary:00:01", input: start });
    scenarios.push({ label: "boundary:23:59", input: end });
  }

  return { boundaryStatesAdded, scenarios };
}

function prepareScenarios(person: PersonBirthInput) {
  const expanded = expandPersonScenarios(person);
  return {
    boundaryStatesAdded: expanded.boundaryStatesAdded,
    scenarios: expanded.scenarios.map((scenario) => ({
      ...scenario,
      prepared: prepareCompatibilityPerson(scenario.input),
    })),
  };
}

function scorePreparedPair(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
  relationshipType: OneToOneReportInput["relationshipType"],
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
  const rest = {
    usefulGodFit: scoreUsefulGodFit(a, b, profile),
    elementComplementarity: scoreElementComplementarity(a, b, profile),
    heavenlyStemInteraction: scoreHeavenlyStemInteraction(a, b, profile),
    earthlyBranchInteraction: scoreEarthlyBranchInteraction(a, b, profile),
    specialStars: scoreSpecialStars(a, b, profile),
    spouseStarRealization: scoreSpouseStarRealization(a, b, profile),
    luckCycleAlignment: scoreLuckCycleAlignment(profile),
  };

  const baseDimensions: Record<CompatibilityDimension, DimensionResult> = {
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
    ...Object.fromEntries(
      Object.entries(rest).map(([dimension, result]) => [dimension, {
        normalizedScore: result.normalizedScore,
        weightedPoints: result.weightedPoints,
        maxPoints: result.maxPoints,
        evidence: result.evidence,
      }]),
    ) as Record<Exclude<CompatibilityDimension, "dayMaster" | "dayBranch">, DimensionResult>,
  };

  const dimensions = {} as Record<CompatibilityDimension, DimensionResult>;
  for (const dimension of COMPATIBILITY_DIMENSIONS) {
    const normalizedScore = baseDimensions[dimension].normalizedScore;
    const maxPoints = getRelationshipDimensionWeight(relationshipType, dimension);
    dimensions[dimension] = {
      normalizedScore,
      maxPoints,
      weightedPoints: round4((normalizedScore / 100) * maxPoints),
      evidence: baseDimensions[dimension].evidence,
    };
  }

  const rawTotal = round4(Object.values(dimensions).reduce(
    (sum, dimension) => sum + dimension.weightedPoints,
    0,
  ));

  return { labelA, labelB, dimensions, rawTotal };
}

function confidenceForRange(width: number) {
  if (width <= 3) return "high" as const;
  if (width <= 8) return "medium" as const;
  return "low" as const;
}

function summarizeDimensions(
  dimensions: CompatibilityCalculationSnapshot["dimensions"],
) {
  const scored = COMPATIBILITY_DIMENSIONS
    .filter((dimension) => dimensions[dimension].maxPoints > 0)
    .map((dimension) => ({
      dimension,
      score: dimensions[dimension].normalizedScore,
    }));

  const strengths = [...scored]
    .sort((a, b) => b.score - a.score || COMPATIBILITY_DIMENSIONS.indexOf(a.dimension) - COMPATIBILITY_DIMENSIONS.indexOf(b.dimension))
    .slice(0, 2)
    .map((item) => item.dimension);

  const adjustmentPoints = [...scored]
    .sort((a, b) => a.score - b.score || COMPATIBILITY_DIMENSIONS.indexOf(a.dimension) - COMPATIBILITY_DIMENSIONS.indexOf(b.dimension))
    .slice(0, 2)
    .map((item) => item.dimension);

  return { strengths, adjustmentPoints };
}

export function calculateOneToOneCompatibility(
  input: OneToOneReportInput,
  options: { timingBaseYear?: number } = {},
): CompatibilityCalculationSnapshot {
  const profile = getRelationshipCalculationProfile(input.relationshipType);
  const preparedA = prepareScenarios(input.personA);
  const preparedB = prepareScenarios(input.personB);
  const scenarioResults: ScenarioResult[] = [];

  for (const a of preparedA.scenarios) {
    for (const b of preparedB.scenarios) {
      scenarioResults.push(scorePreparedPair(
        a.prepared,
        b.prepared,
        profile,
        input.relationshipType,
        a.label,
        b.label,
      ));
    }
  }

  const dimensions = {} as CompatibilityCalculationSnapshot["dimensions"];
  for (const dimension of COMPATIBILITY_DIMENSIONS) {
    const normalizedScore = round1(median(
      scenarioResults.map((scenario) => scenario.dimensions[dimension].normalizedScore),
    ));
    const maxPoints = getRelationshipDimensionWeight(input.relationshipType, dimension);
    dimensions[dimension] = {
      normalizedScore,
      maxPoints,
      weightedPoints: round4((normalizedScore / 100) * maxPoints),
    };
  }

  const timingBaseYear = options.timingBaseYear ?? currentKoreanYear();
  const threeYearTiming = calculateThreeYearTimingAlignment(input, timingBaseYear);
  const timingWeight = getRelationshipDimensionWeight(input.relationshipType, "luckCycleAlignment");
  dimensions.luckCycleAlignment = {
    normalizedScore: threeYearTiming.normalizedScore,
    maxPoints: timingWeight,
    weightedPoints: round4((threeYearTiming.normalizedScore / 100) * timingWeight),
  };

  const rawTotal = round4(clamp(
    Object.values(dimensions).reduce((sum, dimension) => sum + dimension.weightedPoints, 0),
    30,
    100,
  ));
  const score = calibrateCompatibilityScore(rawTotal);

  const timingMinDelta = ((threeYearTiming.scoreRange.min - 70) / 100) * timingWeight;
  const timingMaxDelta = ((threeYearTiming.scoreRange.max - 70) / 100) * timingWeight;
  const rawMin = Math.min(...scenarioResults.map(
    (scenario) => clamp(scenario.rawTotal + timingMinDelta, 30, 100),
  ));
  const rawMax = Math.max(...scenarioResults.map(
    (scenario) => clamp(scenario.rawTotal + timingMaxDelta, 30, 100),
  ));
  const min = calibrateCompatibilityScore(rawMin);
  const max = calibrateCompatibilityScore(rawMax);
  const width = max - min;

  const representativeTimingDelta = ((threeYearTiming.normalizedScore - 70) / 100) * timingWeight;
  const representative = [...scenarioResults].sort(
    (x, y) => Math.abs((x.rawTotal + representativeTimingDelta) - rawTotal) - Math.abs((y.rawTotal + representativeTimingDelta) - rawTotal),
  )[0];
  const representativeEvidence = {} as Record<CompatibilityDimension, unknown>;
  for (const dimension of COMPATIBILITY_DIMENSIONS) {
    representativeEvidence[dimension] = dimension === "luckCycleAlignment"
      ? { policy: "SERVER_RENDERED_CH5_ONLY" }
      : representative.dimensions[dimension].evidence;
  }

  const weightValues: number[] = Object.values(RELATIONSHIP_SCORE_WEIGHTS[input.relationshipType]);
  const weightTotal = weightValues.reduce((sum, value) => sum + value, 0);
  if (weightTotal !== 100) {
    throw new Error(`${input.relationshipType} 궁합 배점 합계가 100이 아닙니다: ${weightTotal}`);
  }

  const summary = summarizeDimensions(dimensions);

  return {
    engineVersion: COMPATIBILITY_ENGINE_VERSION,
    scoringVersion: COMPATIBILITY_SCORING_VERSION,
    relationshipType: input.relationshipType,
    profile,
    scenarioPolicy: {
      personAScenarios: preparedA.scenarios.length,
      personBScenarios: preparedB.scenarios.length,
      pairScenarios: scenarioResults.length,
      unknownTimeRepresentativeHours: UNKNOWN_TIME_SCENARIOS,
      boundaryStatesAdded: preparedA.boundaryStatesAdded || preparedB.boundaryStatesAdded,
      aggregation: "DIMENSION_MEDIAN",
    },
    dimensions,
    rawTotal,
    score,
    uncertaintyRange: { min, max, width },
    confidence: confidenceForRange(width),
    strengths: summary.strengths,
    adjustmentPoints: summary.adjustmentPoints,
    representativeEvidence,
    threeYearTiming,
    aiBoundary: { scoreMutableByAi: false, rankingMutableByAi: false },
  };
}
