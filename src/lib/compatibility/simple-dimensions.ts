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
  갑: "wood",
  을: "wood",
  병: "fire",
  정: "fire",
  무: "earth",
  기: "earth",
  경: "metal",
  신: "metal",
  임: "water",
  계: "water",
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

const BRANCH_ORDER = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
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

const NOBLEMAN_BRANCHES: Record<string, string[]> = {
  갑: ["축", "미"],
  무: ["축", "미"],
  경: ["축", "미"],
  을: ["자", "신"],
  기: ["자", "신"],
  병: ["해", "유"],
  정: ["해", "유"],
  임: ["묘", "사"],
  계: ["묘", "사"],
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

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function emptyElementRecord(): Record<FiveElement, number> {
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

function pairKey(a: string, b: string, order?: string[]) {
  if (!order) return a <= b ? `${a}-${b}` : `${b}-${a}`;
  return order.indexOf(a) <= order.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
}

function weightedPoints(
  profile: CompatibilityProfile,
  dimension: CompatibilityDimension,
  normalizedScore: number,
) {
  const maxPoints = getCompatibilityDimensionWeight(profile, dimension);
  return {
    maxPoints,
    weightedPoints: round4((normalizedScore / 100) * maxPoints),
  };
}

function calculateElementShares(
  person: PersonBirthInput,
  snapshot: ManseCalculationSnapshot,
) {
  const evidence = buildUsefulGodPreparationEvidence(person, snapshot);
  const power = emptyElementRecord();

  for (const position of POSITIONS) {
    const pillar = snapshot.pillars[position];
    if (!pillar) continue;
    power[stemElement(pillar.heavenlyStem)] += 1;
  }

  for (const branch of evidence.branchHiddenStems) {
    for (const hidden of branch.hiddenStems) {
      power[hidden.element] += HIDDEN_ROLE_WEIGHT[hidden.role];
    }
  }

  const total = Object.values(power).reduce((sum, value) => sum + value, 0);
  const shares = emptyElementRecord();
  for (const element of ELEMENTS) {
    shares[element] = total === 0 ? 0.2 : power[element] / total;
  }
  return shares;
}

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

  const sorted = [...ELEMENTS].sort((a, b) => elementShares[a] - elementShares[b]);
  const most = [...ELEMENTS].sort((a, b) => elementShares[b] - elementShares[a])[0];
  return {
    usefulElements: [sorted[0]],
    favorableElements: [sorted[1]],
    unfavorableElements: elementShares[most] >= 0.3 ? [most] : [],
  };
}

export function prepareCompatibilityPerson(
  input: PersonBirthInput,
): PreparedCompatibilityPerson {
  const snapshot = calculateManseSnapshot(input);
  const strength = calculateStrengthCandidate(input);
  const elementShares = calculateElementShares(input, snapshot);
  const dayMasterElement = stemElement(snapshot.pillars.day.heavenlyStem);
  const signal = usefulElementSignal(dayMasterElement, strength.score, elementShares);
  const confidence = input.birthTimeKnown
    ? strengthConfidence(strength.score)
    : Math.min(0.5, strengthConfidence(strength.score));

  return {
    input,
    snapshot,
    dayMasterElement,
    strengthScore: strength.score,
    strengthLevel: strength.level,
    strengthConfidence: confidence,
    elementShares,
    ...signal,
  };
}

function directionalUsefulFit(
  receiver: PreparedCompatibilityPerson,
  provider: PreparedCompatibilityPerson,
) {
  const primary = receiver.usefulElements.reduce(
    (sum, element) => sum + provider.elementShares[element],
    0,
  );
  const favorable = receiver.favorableElements.reduce(
    (sum, element) => sum + provider.elementShares[element],
    0,
  );
  const unfavorable = receiver.unfavorableElements.reduce(
    (sum, element) => sum + provider.elementShares[element],
    0,
  );

  const raw = clamp(
    70 +
      (primary - 0.2 * receiver.usefulElements.length) * 70 +
      (favorable - 0.2 * receiver.favorableElements.length) * 35 -
      (unfavorable - 0.2 * receiver.unfavorableElements.length) * 30,
    45,
    92,
  );

  const damped = 70 + (raw - 70) * receiver.strengthConfidence;
  return round1(clamp(damped, 50, 90));
}

export function scoreUsefulGodFit(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  const aReceives = directionalUsefulFit(a, b);
  const bReceives = directionalUsefulFit(b, a);
  const normalizedScore = round1((aReceives + bReceives) / 2);
  const points = weightedPoints(profile, "usefulGodFit", normalizedScore);

  return {
    dimension: "usefulGodFit",
    normalizedScore,
    profile,
    ...points,
    evidence: {
      method: "SOFT_USEFUL_ELEMENT_SIGNAL_V1",
      aReceives,
      bReceives,
      aStrength: { score: a.strengthScore, level: a.strengthLevel, confidence: a.strengthConfidence },
      bStrength: { score: b.strengthScore, level: b.strengthLevel, confidence: b.strengthConfidence },
      aUseful: a.usefulElements,
      bUseful: b.usefulElements,
      note: "신강약 경계·갈림 가능성은 70점 중립 방향으로 감쇠한다.",
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
  const combined = emptyElementRecord();
  for (const element of ELEMENTS) combined[element] = (a.elementShares[element] + b.elementShares[element]) / 2;

  const before = (imbalance(a.elementShares) + imbalance(b.elementShares)) / 2;
  const after = imbalance(combined);
  const improvement = Math.max(0, before - after);
  const normalizedScore = round1(clamp(90 - after * 40 + improvement * 20, 55, 95));
  const points = weightedPoints(profile, "elementComplementarity", normalizedScore);

  return {
    dimension: "elementComplementarity",
    normalizedScore,
    profile,
    ...points,
    evidence: {
      aImbalance: round1(imbalance(a.elementShares)),
      bImbalance: round1(imbalance(b.elementShares)),
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
      const key = pairKey(pa.pillar.heavenlyStem, pb.pillar.heavenlyStem);
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
  const points = weightedPoints(profile, "heavenlyStemInteraction", normalizedScore);
  return {
    dimension: "heavenlyStemInteraction",
    normalizedScore,
    profile,
    ...points,
    evidence: { harmonies, clashes, rawDelta: round1(delta) },
  };
}

export function scoreEarthlyBranchInteraction(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  let delta = 0;
  const evidence: Array<{ pair: string; relation: string; weight: number }> = [];

  for (const pa of activePillars(a.snapshot)) {
    for (const pb of activePillars(b.snapshot)) {
      if (pa.position === "day" && pb.position === "day") continue;
      const key = pairKey(pa.pillar.earthlyBranch, pb.pillar.earthlyBranch, BRANCH_ORDER);
      const weight = (POSITION_WEIGHT[pa.position] + POSITION_WEIGHT[pb.position]) / 2;
      const add = (relation: string, value: number) => {
        delta += value * weight;
        evidence.push({ pair: `${pa.position}:${pa.pillar.earthlyBranch}-${pb.position}:${pb.pillar.earthlyBranch}`, relation, weight: round1(weight) });
      };
      if (BRANCH_HARMONY.has(key)) add("六合(육합)", 4);
      if (BRANCH_CLASH.has(key)) add("沖(충)", -6);
      if (BRANCH_PUNISHMENT.has(key)) add("刑(형)", -4);
      if (BRANCH_HARM.has(key)) add("害(해)", -3);
      if (BRANCH_BREAK.has(key)) add("破(파)", -2);
    }
  }

  const normalizedScore = round1(clamp(70 + delta, 40, 90));
  const points = weightedPoints(profile, "earthlyBranchInteraction", normalizedScore);
  return {
    dimension: "earthlyBranchInteraction",
    normalizedScore,
    profile,
    ...points,
    evidence: { interactions: evidence, rawDelta: round1(delta), dayToDayExcluded: true },
  };
}

function noblemanHits(receiver: PreparedCompatibilityPerson, provider: PreparedCompatibilityPerson) {
  const dayStem = receiver.snapshot.pillars.day.heavenlyStem;
  const targets = NOBLEMAN_BRANCHES[dayStem] ?? [];
  const branches = activePillars(provider.snapshot).map((item) => item.pillar.earthlyBranch);
  return branches.filter((branch) => targets.includes(branch));
}

export function scoreSpecialStars(
  a: PreparedCompatibilityPerson,
  b: PreparedCompatibilityPerson,
  profile: CompatibilityProfile,
): DeterministicDimensionScore {
  const hitsA = noblemanHits(a, b);
  const hitsB = noblemanHits(b, a);
  const normalizedScore = round1(clamp(65 + 6 * (hitsA.length + hitsB.length), 60, 85));
  const points = weightedPoints(profile, "specialStars", normalizedScore);
  return {
    dimension: "specialStars",
    normalizedScore,
    profile,
    ...points,
    evidence: {
      scope: "天乙貴人(천을귀인)_ONLY_V1",
      aReceivesNoblemanBranches: hitsA,
      bReceivesNoblemanBranches: hitsB,
      note: "신살은 과잉 가점을 피하기 위해 v1에서 천을귀인만 보수적으로 점수화한다.",
    },
  };
}

function relationshipRoleSupply(receiver: PreparedCompatibilityPerson, provider: PreparedCompatibilityPerson) {
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
  const points = weightedPoints(profile, "spouseStarRealization", normalizedScore);
  return {
    dimension: "spouseStarRealization",
    normalizedScore,
    profile,
    ...points,
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
  const points = weightedPoints(profile, "luckCycleAlignment", normalizedScore);
  return {
    dimension: "luckCycleAlignment",
    normalizedScore,
    profile,
    ...points,
    evidence: {
      method: "MVP_NEUTRAL_UNTIL_DAEUN_ENGINE",
      note: "대운(大運) 계산은 현재 MVP 만세력 범위 밖이므로 허위 정밀도를 피하기 위해 중립 처리한다.",
    },
  };
}
