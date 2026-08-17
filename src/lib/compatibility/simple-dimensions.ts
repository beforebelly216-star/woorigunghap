import type { PersonBirthInput } from "@/lib/report-input";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import type { ManseCalculationSnapshot } from "@/lib/manseryeok/types";
import { calculateStrengthCandidate } from "./strength-candidate";
import { buildUsefulGodPreparationEvidence } from "./useful-god-evidence";
import type {
  CompatibilityDimension,
  CompatibilityProfile,
  FiveElement,
  HiddenStemRole,
  PillarPosition,
} from "./types";
import { getCompatibilityDimensionWeight } from "./weights";

const ELEMENTS: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];
const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];
const STEM_ORDER = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCH_ORDER = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

const GENERATES: Record<FiveElement, FiveElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};
const CONTROLS: Record<FiveElement, FiveElement> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};
const STEM_ELEMENT: Record<string, FiveElement> = {
  갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth",
  기: "earth", 경: "metal", 신: "metal", 임: "water", 계: "water",
};

const HIDDEN_ROLE_WEIGHT: Record<HiddenStemRole, number> = {
  RESIDUAL: 0.35,
  MIDDLE: 0.6,
  MAIN: 1,
};
const POSITION_WEIGHT: Record<PillarPosition, number> = {
  year: 0.7,
  month: 1.1,
  day: 1.2,
  hour: 0.8,
};

const STEM_HARMONY = new Set(["갑-기", "을-경", "병-신", "정-임", "무-계"]);
const STEM_CLASH = new Set(["갑-경", "을-신", "병-임", "정-계"]);
const BRANCH_HARMONY = new Set(["자-축", "인-해", "묘-술", "진-유", "사-신", "오-미"]);
const BRANCH_CLASH = new Set(["자-오", "축-미", "인-신", "묘-유", "진-술", "사-해"]);
const BRANCH_HARM = new Set(["자-미", "축-오", "인-사", "묘-진", "신-해", "유-술"]);
const BRANCH_PUNISHMENT = new Set([
  "자-묘",
  "인-사", "사-신", "인-신",
  "축-술", "미-술", "축-미",
  "진-진", "오-오", "유-유", "해-해",
]);
const BRANCH_BREAK = new Set(["자-유", "축-진", "인-해", "묘-오", "사-신", "미-술"]);

// 天乙貴人(천을귀인)만 보수적으로 사용한다.
const NOBLEMAN_BRANCHES: Record<string, string[]> = {
  갑: ["축", "미"], 무: ["축", "미"], 경: ["축", "미"],
  을: ["자", "신"], 기: ["자", "신"],
  병: ["해", "유"], 정: ["해", "유"],
  임: ["묘", "사"], 계: ["묘", "사"],
  신: ["인", "오"],
};

export type PreparedCompatibilityPerson = {
  input: PersonBirthInput;
  snapshot: ManseCalculationSnapshot;
  dayMasterElement: FiveElement;
  strengthScore: number;
  strengthLevel: "VERY_WEAK" | "WEAK" | "BALANCED" | "STRONG" | "VERY_STRONG";
  strengthConfidence: number;
  elementShares: Record<FiveElement, number>;
  usefulElements: FiveElement[];
  favorableElements: FiveElement[];
  unfavorableElements: FiveElement[];
};

export type DeterministicDimensionScore = {
  dimension: Exclude<CompatibilityDimension, "dayMaster" | "dayBranch">;
  normalizedScore: number;
  profile: CompatibilityProfile;
  maxPoints: number;
  weightedPoints: number;
  evidence: Record<string, unknown>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function round1(value: number) {
  return Math.round(value * 10) / 10;
}
function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}
function emptyElements(): Record<FiveElement, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}
function stemElement(stem: string): FiveElement {
  const element = STEM_ELEMENT[stem];
  if (!element) throw new RangeError(`지원하지 않는 천간입니다: ${stem}`);
  return element;
}
function sourceElement(target: FiveElement) {
  const found = ELEMENTS.find((element) => GENERATES[element] === target);
  if (!found) throw new Error(`생조 오행을 찾지 못했습니다: ${target}`);
  return found;
}
function controllingElement(target: FiveElement) {
  const found = ELEMENTS.find((element) => CONTROLS[element] === target);
  if (!found) throw new Error(`극제 오행을 찾지 못했습니다: ${target}`);
  return found;
}
function orderedPair(a: string, b: string, order: string[]) {
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai < 0 || bi < 0) throw new RangeError(`지원하지 않는 조합입니다: ${a}/${b}`);
  return ai <= bi ? `${a}-${b}` : `${b}-${a}`;
}
function weightedPoints(
  profile: CompatibilityProfile,
  dimension: CompatibilityDimension,
  normalizedScore: number,
) {
  const maxPoints = getCompatibilityDimensionWeight(profile, dimension);
  return { maxPoints, weightedPoints: round4((normalizedScore / 100) * maxPoints) };
}

function calculateElementShares(person: PersonBirthInput, snapshot: ManseCalculationSnapshot) {
  const evidence = buildUsefulGodPreparationEvidence(person, snapshot);
  const power = emptyElements();

  for (const position of POSITIONS) {
    const pillar = snapshot.pillars[position];
    if (pillar) power[stemElement(pillar.heavenlyStem)] += 1;
  }
  for (const branch of evidence.branchHiddenStems) {
    for (const hidden of branch.hiddenStems) {
      power[hidden.element] += HIDDEN_ROLE_WEIGHT[hidden.role];
    }
  }

  const total = Object.values(power).reduce((sum, value) => sum + value, 0);
  const shares = emptyElements();
  for (const element of ELEMENTS) shares[element] = total === 0 ? 0.2 : power[element] / total;
  return shares;
}

// 신강약은 절대판정이 아니라 용신 후보를 정하는 soft signal로만 사용한다.
function strengthConfidence(score: number) {
  if (score <= 38 || score >= 63) return 0.85;
  if (score <= 42 || score >= 59) return 0.7;
  if (score < 45 || score >= 56) return 0.6;
  return 0.5;
}

function usefulElementSignal(
  dayMasterElement: FiveElement,
  strengthScore: number,
  elementShares: Record<FiveElement, number>,
) {
  const resource = sourceElement(dayMasterElement);
  const output = GENERATES[dayMasterElement];
  const wealth = CONTROLS[dayMasterElement];
  const officer = controllingElement(dayMasterElement);

  if (strengthScore < 45) {
    return {
      usefulElements: [resource],
      favorableElements: [dayMasterElement],
      unfavorableElements: [officer, wealth],
    };
  }
  if (strengthScore >= 56) {
    return {
      usefulElements: [output],
      favorableElements: [wealth, officer],
      unfavorableElements: [dayMasterElement, resource],
    };
  }

  const low = [...ELEMENTS].sort((a, b) => elementShares[a] - elementShares[b]);
  const high = [...ELEMENTS].sort((a, b) => elementShares[b] - elementShares[a])[0];
  return {
    usefulElements: [low[0]],
    favorableElements: [low[1]],
    unfavorableElements: elementShares[high] >= 0.3 ? [high] : [],
  };
}

export function prepareCompatibilityPerson(input: PersonBirthInput): PreparedCompatibilityPerson {
  const snapshot = calculateManseSnapshot(input);
  const strength = calculateStrengthCandidate(input);
  const elementShares = calculateElementShares(input, snapshot);
  const dayMasterElement = stemElement(snapshot.pillars.day.heavenlyStem);
  const signal = usefulElementSignal(dayMasterElement, strength.score, elementShares);
  return {
    input,
    snapshot,
    dayMasterElement,
    strengthScore: strength.score,
    strengthLevel: strength.level,
    strengthConfidence: input.birthTimeKnown
      ? strengthConfidence(strength.score)
      : Math.min(0.5, strengthConfidence(strength.score)),
    elementShares,
    ...signal,
  };
}

function directionalUsefulFit(
  receiver: PreparedCompatibilityPerson,
  provider: PreparedCompatibilityPerson,
) {
  const primary = receiver.usefulElements.reduce((sum, e) => sum + provider.elementShares[e], 0);
  const favorable = receiver.favorableElements.reduce((sum, e) => sum + provider.elementShares[e], 0);
  const unfavorable = receiver.unfavorableElements.reduce((sum, e) => sum + provider.elementShares[e], 0);
  const raw = clamp(
    70 +
      (primary - 0.2 * receiver.usefulElements.length) * 70 +
      (favorable - 0.2 * receiver.favorableElements.length) * 35 -
      (unfavorable - 0.2 * receiver.unfavorableElements.length) * 30,
    45,
    92,
  );
  return round1(clamp(70 + (raw - 70) * receiver.strengthConfidence, 50, 90));
}

export function scoreUsefulGodFit(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  const aReceives = directionalUsefulFit(a, b);
  const bReceives = directionalUsefulFit(b, a);
  const normalizedScore = round1((aReceives + bReceives) / 2);
  return {
    dimension: "usefulGodFit",
    normalizedScore,
    profile,
    ...weightedPoints(profile, "usefulGodFit", normalizedScore),
    evidence: {
      method: "SOFT_USEFUL_ELEMENT_SIGNAL_V1",
      aReceives,
      bReceives,
      aStrength: { score: a.strengthScore, level: a.strengthLevel, confidence: a.strengthConfidence },
      bStrength: { score: b.strengthScore, level: b.strengthLevel, confidence: b.strengthConfidence },
      aUseful: a.usefulElements,
      bUseful: b.usefulElements,
      note: "경계·갈림 가능성이 클수록 70점 중립으로 감쇠한다.",
    },
  };
}

function imbalance(shares: Record<FiveElement, number>) {
  return ELEMENTS.reduce((sum, element) => sum + Math.abs(shares[element] - 0.2), 0) / 1.6;
}

export function scoreElementComplementarity(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  const combined = emptyElements();
  for (const e of ELEMENTS) combined[e] = (a.elementShares[e] + b.elementShares[e]) / 2;
  const aImbalance = imbalance(a.elementShares);
  const bImbalance = imbalance(b.elementShares);
  const before = (aImbalance + bImbalance) / 2;
  const after = imbalance(combined);
  const improvement = Math.max(0, before - after);
  const normalizedScore = round1(clamp(90 - after * 40 + improvement * 20, 55, 95));
  return {
    dimension: "elementComplementarity",
    normalizedScore,
    profile,
    ...weightedPoints(profile, "elementComplementarity", normalizedScore),
    evidence: {
      aImbalance: round1(aImbalance),
      bImbalance: round1(bImalance),
      combinedImbalance: round1(after),
      improvement: round1(improvement),
    },
  };
}

function activePillars(snapshot: ManseCalculationSnapshot) {
  return POSITIONS.flatMap((position) => {
    const pillar = snapshot.pillars[position];
    return pillar ? [{ position, pillar }] : [];
  });
}

export function scoreHeavenlyStemInteraction(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  let delta = 0;
  const harmonies: string[] = [];
  const clashes: string[] = [];
  for (const pa of activePillars(a.snapshot)) {
    for (const pb of activePillars(b.snapshot)) {
      const key = orderedPair(pa.pillar.heavenlyStem, pb.pillar.heavenlyStem, STEM_ORDER);
      const weight = (POSITION_WEIGHT[pa.position] + POSITION_WEIGHT[pb.position]) / 2;
      if (STEM_HARMONY.has(key)) {
        delta += 4 * weight;
        harmonies.push(`${pa.position}:${pa.pillar.heavenlyStem}-${pb.position}:${pb.pillar.heavenlyStem}`);
      }
      if (STEM_CLASH.has(key)) {
        delta -= 4 * weight;
        clashes.push(`${pa.position}:${pa.pillar.heavenlyStem}-${pb.position}:${pb.pillar.heavenlyStem}`);
      }
    }
  }
  const normalizedScore = round1(clamp(70 + delta, 45, 90));
  return {
    dimension: "heavenlyStemInteraction",
    normalizedScore,
    profile,
    ...weightedPoints(profile, "heavenlyStemInteraction", normalizedScore),
    evidence: { harmonies, clashes, rawDelta: round1(delta) },
  };
}

export function scoreEarthlyBranchInteraction(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  let delta = 0;
  const interactions: Array<{ pair: string; relation: string; weight: number }> = [];
  for (const pa of activePillars(a.snapshot)) {
    for (const pb of activePillars(b.snapshot)) {
      if (pa.position === "day" && pb.position === "day") continue;
      const key = orderedPair(pa.pillar.earthlyBranch, pb.pillar.earthlyBranch, BRANCH_ORDER);
      const weight = (POSITION_WEIGHT[pa.position] + POSITION_WEIGHT[pb.position]) / 2;
      if (BRANCH_HARMONY.has(key)) {
        delta += 3.5 * weight;
        interactions.push({ pair: key, relation: "육합", weight: round1(weight) });
      }
      if (BRANCH_CLASH.has(key)) {
        delta -= 3.5 * weight;
        interactions.push({ pair: key, relation: "충", weight: round1(weight) });
      }
      if (BRANCH_HARM.has(key)) {
        delta -= 2 * weight;
        interactions.push({ pair: key, relation: "해", weight: round1(weight) });
      }
      if (BRANCH_PUNISHMENT.has(key)) {
        delta -= 2 * weight;
        interactions.push({ pair: key, relation: "형", weight: round1(weight) });
      }
      if (BRANCH_BREAK.has(key)) {
        delta -= 1 * weight;
        interactions.push({ pair: key, relation: "파", weight: round1(weight) });
      }
    }
  }
  const normalizedScore = round1(clamp(70 + delta, 40, 90));
  return {
    dimension: "earthlyBranchInteraction",
    normalizedScore,
    profile,
    ...weightedPoints(profile, "earthlyBranchInteraction", normalizedScore),
    evidence: { interactions, rawDelta: round1(delta), dayToDayExcluded: true },
  };
}

function noblemanHits(receiver: PreparedCompatibilityPerson, provider: PreparedCompatibilityPerson) {
  const targets = NOBLEMAN_BRANCHES[receiver.snapshot.pillars.day.heavenlyStem] ?? [];
  return activePillars(provider.snapshot)
    .map((item) => item.pillar.earthlyBranch)
    .filter((branch) => targets.includes(branch));
}

export function scoreSpecialStars(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  const hitsA = noblemanHits(a, b);
  const hitsB = noblemanHits(b, a);
  const normalizedScore = round1(clamp(65 + 6 * (hitsA.length + hitsB.length), 60, 85));
  return {
    dimension: "specialStars",
    normalizedScore,
    profile,
    ...weightedPoints(profile, "specialStars", normalizedScore),
    evidence: {
      scope: "天乙貴人(천을귀인)_ONLY_V1",
      aReceivesNoblemanBranches: hitsA,
      bReceivesNoblemanBranches: hitsB,
      note: "신살은 과잉 정밀도를 피하기 위해 v1에서 천을귀인만 점수화한다.",
    },
  };
}

function relationshipRoleSupply(
  receiver: PreparedCompatibilityPerson,
  provider: PreparedCompatibilityPerson,
) {
  const wealth = CONTROLS[receiver.dayMasterElement];
  const officer = controllingElement(receiver.dayMasterElement);
  return provider.elementShares[wealth] + provider.elementShares[officer];
}

export function scoreSpouseStarRealization(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  const aSupply = relationshipRoleSupply(a, b);
  const bSupply = relationshipRoleSupply(b, a);
  const normalizedScore = round1(clamp(70 + (((aSupply + bSupply) / 2) - 0.4) * 45, 55, 85));
  return {
    dimension: "spouseStarRealization",
    normalizedScore,
    profile,
    ...weightedPoints(profile, "spouseStarRealization", normalizedScore),
    evidence: {
      method: "GENDER_INDEPENDENT_RELATIONSHIP_ROLE_PROXY_V1",
      aRoleSupply: round1(aSupply),
      bRoleSupply: round1(bSupply),
      note: "MVP 점수에서는 성별에 따른 재성/관성 배우자성 단정을 사용하지 않는다.",
    },
  };
}

export function scoreLuckCycleAlignment(
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  const normalizedScore = 70;
  return {
    dimension: "luckCycleAlignment",
    normalizedScore,
    profile,
    ...weightedPoints(profile, "luckCycleAlignment", normalizedScore),
    evidence: {
      method: "SCENARIO_BASELINE_BEFORE_THREE_YEAR_TIMING",
      note: "출생시간 시나리오 총점 집계를 위한 70점 기준값이며, 최종 스냅샷에서는 검증된 3년 대운·세운 타이밍 점수로 치환한다.",
    },
  };
}
