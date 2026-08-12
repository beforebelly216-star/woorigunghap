import type { PersonBirthInput } from "@/lib/report-input";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import type { ManseCalculationSnapshot } from "@/lib/manseryeok/types";
import { buildUsefulGodPreparationEvidence } from "./useful-god-evidence";
import type {
  FiveElement,
  HiddenStemRole,
  PillarPosition,
  UsefulGodPreparationEvidence,
} from "./types";

export type StrengthRelation =
  | "PEER"
  | "RESOURCE"
  | "OUTPUT"
  | "WEALTH"
  | "OFFICER";

export type StrengthLevel =
  | "VERY_WEAK"
  | "WEAK"
  | "BALANCED"
  | "STRONG"
  | "VERY_STRONG";

export type StrengthCandidateResult = {
  version: "strength-shadow-v2";
  status: "SHADOW_ONLY";
  productionScoringEnabled: false;
  score: number;
  level: StrengthLevel;
  birthTimeKnown: boolean;
  components: {
    deukryeong: {
      label: "得令(득령)";
      score: number;
      weight: 0.35;
      monthBranchRelation: StrengthRelation | null;
      commanderRelation: StrengthRelation | null;
    };
    deukji: {
      label: "得地(득지)";
      score: number;
      weight: 0.3;
      rootRaw: number;
      rootMax: number;
    };
    deukse: {
      label: "得勢(득세)";
      score: number;
      weight: 0.35;
      supportPower: number;
      pressurePower: number;
    };
  };
  notes: string[];
};

const ELEMENT_GENERATES: Record<FiveElement, FiveElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const ELEMENT_CONTROLS: Record<FiveElement, FiveElement> = {
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

// 得令(득령)은 계절의 방향성을 보는 축이다. 0~100의 절대 강도율이 아니라
// 50을 중립으로 둔 제품용 지수이며, 월령 하나가 전체를 결정하지 않도록 범위를 제한한다.
const SEASON_RELATION_SCORE: Record<StrengthRelation, number> = {
  PEER: 75,
  RESOURCE: 65,
  OUTPUT: 45,
  WEALTH: 40,
  OFFICER: 30,
};

// 得勢(득세)에서는 같은 오행과 인성은 일간을 돕고,
// 식상·재성·관살은 소모 또는 제어 방향으로 취급한다.
const POWER_COEFFICIENT: Record<StrengthRelation, number> = {
  PEER: 1,
  RESOURCE: 0.8,
  OUTPUT: -0.6,
  WEALTH: -0.8,
  OFFICER: -1,
};

const ROOT_POSITION_WEIGHT: Record<PillarPosition, number> = {
  year: 0.55,
  month: 1,
  day: 0.9,
  hour: 0.75,
};

const ROOT_ROLE_WEIGHT: Record<HiddenStemRole, number> = {
  RESIDUAL: 0.4,
  MIDDLE: 0.65,
  MAIN: 1,
};

const VISIBLE_POSITION_WEIGHT: Record<PillarPosition, number> = {
  year: 0.9,
  month: 1.1,
  day: 0,
  hour: 1,
};

const HIDDEN_POSITION_WEIGHT: Record<PillarPosition, number> = {
  year: 0.7,
  month: 1,
  day: 0.9,
  hour: 0.8,
};

const HIDDEN_ROLE_WEIGHT: Record<HiddenStemRole, number> = {
  RESIDUAL: 0.35,
  MIDDLE: 0.55,
  MAIN: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function stemElement(stem: string): FiveElement {
  const element = STEM_ELEMENT[stem];
  if (!element) throw new RangeError(`지원하지 않는 천간입니다: ${stem}`);
  return element;
}

export function relationToDayMaster(
  dayMasterElement: FiveElement,
  otherElement: FiveElement,
): StrengthRelation {
  if (dayMasterElement === otherElement) return "PEER";
  if (ELEMENT_GENERATES[otherElement] === dayMasterElement) return "RESOURCE";
  if (ELEMENT_GENERATES[dayMasterElement] === otherElement) return "OUTPUT";
  if (ELEMENT_CONTROLS[dayMasterElement] === otherElement) return "WEALTH";
  if (ELEMENT_CONTROLS[otherElement] === dayMasterElement) return "OFFICER";
  throw new Error(`오행 관계를 판정할 수 없습니다: ${dayMasterElement}/${otherElement}`);
}

function strengthLevel(score: number): StrengthLevel {
  if (score < 35) return "VERY_WEAK";
  if (score < 45) return "WEAK";
  if (score < 56) return "BALANCED";
  if (score < 71) return "STRONG";
  return "VERY_STRONG";
}

function calculateDeukryeong(evidence: UsefulGodPreparationEvidence) {
  const dayMasterElement = evidence.dayMaster.element;
  const monthBranch = evidence.branchHiddenStems.find((item) => item.position === "month");
  if (!monthBranch) {
    return {
      score: 50,
      monthBranchRelation: null,
      commanderRelation: null,
    };
  }

  const monthBranchRelation = relationToDayMaster(
    dayMasterElement,
    monthBranch.branchElement,
  );
  const branchScore = SEASON_RELATION_SCORE[monthBranchRelation];
  const commanderElement = evidence.monthCommand.commanderElement;
  if (!commanderElement) {
    return {
      score: branchScore,
      monthBranchRelation,
      commanderRelation: null,
    };
  }

  const commanderRelation = relationToDayMaster(dayMasterElement, commanderElement);
  const commanderScore = SEASON_RELATION_SCORE[commanderRelation];

  // 월지 자체를 80%, 월령 사령을 20%로 둔다. 사령은 정밀 보정이지 하루 경계로
  // 신강약 전체가 급변하는 절대판정 스위치가 아니다.
  return {
    score: round1(branchScore * 0.8 + commanderScore * 0.2),
    monthBranchRelation,
    commanderRelation,
  };
}

function calculateDeukji(evidence: UsefulGodPreparationEvidence) {
  const dayMasterElement = evidence.dayMaster.element;
  const dayMasterStem = evidence.dayMaster.stem;
  let rootRaw = 0;
  let rootMax = 0;

  for (const branch of evidence.branchHiddenStems) {
    const positionWeight = ROOT_POSITION_WEIGHT[branch.position];
    rootMax += positionWeight;

    const matching = branch.hiddenStems.filter((hidden) => hidden.element === dayMasterElement);
    if (matching.length === 0) continue;

    const strongestRoot = Math.max(
      ...matching.map((hidden) => {
        const exactStemMultiplier = hidden.stem === dayMasterStem ? 1 : 0.85;
        return ROOT_ROLE_WEIGHT[hidden.role] * exactStemMultiplier;
      }),
    );
    rootRaw += positionWeight * strongestRoot;
  }

  // 뿌리가 없다는 사실은 강한 약화 신호지만 '0점'을 뜻하지 않는다.
  // 得地(득지) 축은 30을 하한으로 두고 뿌리의 위치·본기/중기/여기 강도로 100까지 상승한다.
  const rootRatio = rootMax === 0 ? 0.5 : clamp(rootRaw / rootMax, 0, 1);
  return {
    score: round1(30 + rootRatio * 70),
    rootRaw: round1(rootRaw),
    rootMax: round1(rootMax),
  };
}

function addPower(
  relation: StrengthRelation,
  weight: number,
  accumulator: { support: number; pressure: number },
) {
  const contribution = POWER_COEFFICIENT[relation] * weight;
  if (contribution >= 0) accumulator.support += contribution;
  else accumulator.pressure += Math.abs(contribution);
}

function calculateDeukse(
  snapshot: ManseCalculationSnapshot,
  evidence: UsefulGodPreparationEvidence,
) {
  const dayMasterElement = evidence.dayMaster.element;
  const power = { support: 0, pressure: 0 };
  const positions: PillarPosition[] = ["year", "month", "day", "hour"];

  // 일간 자체는 자기 자신이므로 제외하고, 주변에 드러난 천간만 계산한다.
  for (const position of positions) {
    if (position === "day") continue;
    const pillar = snapshot.pillars[position];
    if (!pillar) continue;
    const relation = relationToDayMaster(dayMasterElement, stemElement(pillar.heavenlyStem));
    addPower(relation, VISIBLE_POSITION_WEIGHT[position], power);
  }

  // 지지는 표면 오행을 한 번 더 세지 않고 지장간으로 전개해 역할별 가중한다.
  for (const branch of evidence.branchHiddenStems) {
    for (const hidden of branch.hiddenStems) {
      const relation = relationToDayMaster(dayMasterElement, hidden.element);
      const weight =
        HIDDEN_POSITION_WEIGHT[branch.position] * HIDDEN_ROLE_WEIGHT[hidden.role];
      addPower(relation, weight, power);
    }
  }

  const total = power.support + power.pressure;
  const score =
    total === 0
      ? 50
      : clamp(50 + (50 * (power.support - power.pressure)) / total, 0, 100);

  return {
    score: round1(score),
    supportPower: round1(power.support),
    pressurePower: round1(power.pressure),
  };
}

export function calculateStrengthCandidate(
  person: PersonBirthInput,
): StrengthCandidateResult {
  const snapshot = calculateManseSnapshot(person);
  const evidence = buildUsefulGodPreparationEvidence(person, snapshot);
  const deukryeong = calculateDeukryeong(evidence);
  const deukji = calculateDeukji(evidence);
  const deukse = calculateDeukse(snapshot, evidence);

  const score = round1(
    deukryeong.score * 0.35 + deukji.score * 0.3 + deukse.score * 0.35,
  );
  const notes = [
    "이 결과는 Day 6 보정용 shadow 점수이며 아직 고객 점수에 사용하지 않습니다.",
    "得令(득령) 35% + 得地(득지) 30% + 得勢(득세) 35%의 제품용 재현 규칙입니다.",
    "각 축은 50을 중립 기준으로 해석하며, 단일 결손이 전체 점수를 0에 가깝게 만들지 않도록 설계했습니다.",
    "十二運星(십이운성), 원국 합화, 從格(종격), 調候(조후), 通關(통관)은 아직 최종 판정에 넣지 않았습니다.",
  ];
  if (!person.birthTimeKnown) {
    notes.push(
      "출생시간 미상 표본은 현재 3주 evidence만 비교하며, production에서는 12개 시주 시나리오 중앙값/범위로 대체합니다.",
    );
  }

  return {
    version: "strength-shadow-v2",
    status: "SHADOW_ONLY",
    productionScoringEnabled: false,
    score,
    level: strengthLevel(score),
    birthTimeKnown: person.birthTimeKnown,
    components: {
      deukryeong: {
        label: "得令(득령)",
        score: deukryeong.score,
        weight: 0.35,
        monthBranchRelation: deukryeong.monthBranchRelation,
        commanderRelation: deukryeong.commanderRelation,
      },
      deukji: {
        label: "得地(득지)",
        score: deukji.score,
        weight: 0.3,
        rootRaw: deukji.rootRaw,
        rootMax: deukji.rootMax,
      },
      deukse: {
        label: "得勢(득세)",
        score: deukse.score,
        weight: 0.35,
        supportPower: deukse.supportPower,
        pressurePower: deukse.pressurePower,
      },
    },
    notes,
  };
}
