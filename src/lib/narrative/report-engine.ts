import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import { prepareCompatibilityPerson } from "@/lib/compatibility/simple-dimensions";
import type { CompatibilityDimension, FiveElement } from "@/lib/compatibility/types";
import type { OneToOneReportInput } from "@/lib/report-input";

export const REPORT_PROMPT_VERSION = "report-prompt-v3-personalized" as const;
export const REPORT_EVIDENCE_PACK_VERSION = "report-evidence-pack-v1" as const;
export const DEFAULT_REPORT_MODEL = "claude-haiku-4-5-20251001" as const;
export const DEFAULT_USD_KRW_COST_RATE = 1450;

const HAIKU_INPUT_USD_PER_MTOK = 1;
const HAIKU_OUTPUT_USD_PER_MTOK = 5;
const ELEMENTS: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];
const MAX_EVIDENCE_ARRAY_ITEMS = 8;
const MAX_EVIDENCE_OBJECT_KEYS = 12;
const MAX_EVIDENCE_STRING_LENGTH = 160;

export type CompatibilityNarrative = {
  headline: string;
  summary: string;
  personA: {
    core: string;
    elementBalance: string;
    relationshipNeed: string;
    strength: string;
    caution: string;
  };
  personB: {
    core: string;
    elementBalance: string;
    relationshipNeed: string;
    strength: string;
    caution: string;
  };
  basicChemistry: {
    dayMaster: string;
    dayBranch: string;
    yinYang: string;
    elementBalance: string;
  };
  bondAndFriction: {
    heavenlyStems: string;
    earthlyBranches: string;
    specialSignals: string;
  };
  directionalImpact: {
    aToB: string;
    bToA: string;
    balance: string;
  };
  flow: {
    primary: string;
    secondary: string;
    caution: string;
  };
  relationshipSpecific: {
    first: string;
    second: string;
    third: string;
  };
  strengths: {
    first: string;
    second: string;
  };
  adjustments: {
    first: string;
    second: string;
    redFlag: string;
  };
  practicalGuide: {
    first: string;
    second: string;
    third: string;
    avoid: string;
    conflictAction: string;
  };
  timing: {
    currentSignal: string;
    limitation: string;
  };
};

export type NarrativeUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  estimatedUsd: number;
  estimatedKrw: number;
  usdKrwRate: number;
  pricing: {
    inputUsdPerMillionTokens: number;
    outputUsdPerMillionTokens: number;
  };
};

export type NarrativeGenerationResult = {
  narrative: CompatibilityNarrative;
  meta: {
    mode: "template" | "anthropic";
    provider: "template" | "anthropic";
    model: string | null;
    promptVersion: typeof REPORT_PROMPT_VERSION;
    payloadVersion: typeof REPORT_EVIDENCE_PACK_VERSION;
    fallbackReason: string | null;
    usage: NarrativeUsage | null;
    payloadBytes: number;
  };
};

type NarrativeMode = "template" | "anthropic";

type PersonEvidence = {
  id: "A" | "B";
  birthTimeKnown: boolean;
  dayMaster: {
    stem: string;
    element: FiveElement;
    yinYang: string;
  };
  strengthSignal: {
    score: number;
    level: string;
    confidence: number;
  };
  elementBalance: {
    shares: Record<FiveElement, number>;
    strongest: FiveElement[];
    weakest: FiveElement[];
  };
  usefulSignal: {
    useful: FiveElement[];
    favorable: FiveElement[];
    unfavorable: FiveElement[];
  };
};

export type ReportEvidencePack = {
  payloadVersion: typeof REPORT_EVIDENCE_PACK_VERSION;
  relationshipType: CompatibilityCalculationSnapshot["relationshipType"];
  profile: CompatibilityCalculationSnapshot["profile"];
  overall: {
    score: number;
    confidence: CompatibilityCalculationSnapshot["confidence"];
    uncertaintyRange: CompatibilityCalculationSnapshot["uncertaintyRange"];
    scenarioCount: number;
  };
  persons: {
    A: PersonEvidence;
    B: PersonEvidence;
  };
  dimensions: Record<CompatibilityDimension, {
    normalizedScore: number;
    maxPoints: number;
    weightedPoints: number;
    evidence: unknown;
  }>;
  directionalSignals: {
    aReceivesUsefulFit: number | null;
    bReceivesUsefulFit: number | null;
    aRoleSupply: number | null;
    bRoleSupply: number | null;
    aReceivesNoblemanBranches: string[];
    bReceivesNoblemanBranches: string[];
  };
  strengths: CompatibilityDimension[];
  adjustmentPoints: CompatibilityDimension[];
  timingSupport: {
    luckCycleEngineAvailable: false;
    currentDimensionScore: number;
  };
  aiBoundary: CompatibilityCalculationSnapshot["aiBoundary"];
};

const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "기본 기운의 호흡",
  dayBranch: "생활·정서 리듬",
  usefulGodFit: "필요한 기운의 보완",
  elementComplementarity: "오행 상보성",
  heavenlyStemInteraction: "천간의 결속과 긴장",
  earthlyBranchInteraction: "지지의 결속과 마찰",
  specialStars: "귀인 신호",
  spouseStarRealization: "관계 역할의 맞물림",
  luckCycleAlignment: "대운 동조",
};

const ELEMENT_LABELS: Record<FiveElement, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

const RELATIONSHIP_LABELS: Record<CompatibilityCalculationSnapshot["relationshipType"], string> = {
  crush: "짝사랑",
  flirting: "썸",
  lover: "연인",
  friend: "친구",
  coworker: "직장동료",
};

const NARRATIVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    personA: personSchema(),
    personB: personSchema(),
    basicChemistry: objectSchema(["dayMaster", "dayBranch", "yinYang", "elementBalance"]),
    bondAndFriction: objectSchema(["heavenlyStems", "earthlyBranches", "specialSignals"]),
    directionalImpact: objectSchema(["aToB", "bToA", "balance"]),
    flow: objectSchema(["primary", "secondary", "caution"]),
    relationshipSpecific: objectSchema(["first", "second", "third"]),
    strengths: objectSchema(["first", "second"]),
    adjustments: objectSchema(["first", "second", "redFlag"]),
    practicalGuide: objectSchema(["first", "second", "third", "avoid", "conflictAction"]),
    timing: objectSchema(["currentSignal", "limitation"]),
  },
  required: [
    "headline", "summary", "personA", "personB", "basicChemistry", "bondAndFriction",
    "directionalImpact", "flow", "relationshipSpecific", "strengths", "adjustments",
    "practicalGuide", "timing",
  ],
} as const;

function objectSchema(keys: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(keys.map((key) => [key, { type: "string" }])),
    required: keys,
  };
}

function personSchema() {
  return objectSchema(["core", "elementBalance", "relationshipNeed", "strength", "caution"]);
}

const FORBIDDEN_AI_KEYS = new Set([
  "displayName", "birthDate", "birthTime", "paymentId", "orderId", "input", "sourceDate", "solarDate",
]);

function round(value: number, digits: number) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function containsForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_AI_KEYS.has(key) || containsForbiddenKey(child)
  ));
}

function compactEvidence(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.slice(0, MAX_EVIDENCE_STRING_LENGTH);
  if (depth >= 4) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_EVIDENCE_ARRAY_ITEMS)
      .map((item) => compactEvidence(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)
      .slice(0, MAX_EVIDENCE_OBJECT_KEYS)) {
      if (FORBIDDEN_AI_KEYS.has(key)) continue;
      const compacted = compactEvidence(child, depth + 1);
      if (compacted !== undefined) output[key] = compacted;
    }
    return output;
  }
  return undefined;
}

function personEvidence(id: "A" | "B", input: OneToOneReportInput["personA"]): PersonEvidence {
  const prepared = prepareCompatibilityPerson(input);
  const shares = Object.fromEntries(ELEMENTS.map((element) => [
    element,
    round(prepared.elementShares[element], 3),
  ])) as Record<FiveElement, number>;
  const ordered = [...ELEMENTS].sort((a, b) => shares[b] - shares[a]);
  return {
    id,
    birthTimeKnown: input.birthTimeKnown,
    dayMaster: {
      stem: prepared.snapshot.pillars.day.heavenlyStem,
      element: prepared.dayMasterElement,
      yinYang: prepared.snapshot.yinYang.day.stem,
    },
    strengthSignal: {
      score: round(prepared.strengthScore, 1),
      level: prepared.strengthLevel,
      confidence: round(prepared.strengthConfidence, 2),
    },
    elementBalance: {
      shares,
      strongest: ordered.slice(0, 2),
      weakest: ordered.slice(-2).reverse(),
    },
    usefulSignal: {
      useful: prepared.usefulElements,
      favorable: prepared.favorableElements,
      unfavorable: prepared.unfavorableElements,
    },
  };
}

function numericEvidence(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

function stringArrayEvidence(value: unknown, key: string): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const candidate = (value as Record<string, unknown>)[key];
  return Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
}

export function buildReportEvidencePack(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
): ReportEvidencePack {
  const dimensions = {} as ReportEvidencePack["dimensions"];
  for (const dimension of Object.keys(snapshot.dimensions) as CompatibilityDimension[]) {
    const score = snapshot.dimensions[dimension];
    dimensions[dimension] = {
      normalizedScore: score.normalizedScore,
      maxPoints: score.maxPoints,
      weightedPoints: score.weightedPoints,
      evidence: compactEvidence(snapshot.representativeEvidence[dimension]),
    };
  }

  const usefulEvidence = snapshot.representativeEvidence.usefulGodFit;
  const spouseEvidence = snapshot.representativeEvidence.spouseStarRealization;
  const starEvidence = snapshot.representativeEvidence.specialStars;

  const payload: ReportEvidencePack = {
    payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
    relationshipType: snapshot.relationshipType,
    profile: snapshot.profile,
    overall: {
      score: snapshot.score,
      confidence: snapshot.confidence,
      uncertaintyRange: snapshot.uncertaintyRange,
      scenarioCount: snapshot.scenarioPolicy.pairScenarios,
    },
    persons: {
      A: personEvidence("A", input.personA),
      B: personEvidence("B", input.personB),
    },
    dimensions,
    directionalSignals: {
      aReceivesUsefulFit: numericEvidence(usefulEvidence, "aReceives"),
      bReceivesUsefulFit: numericEvidence(usefulEvidence, "bReceives"),
      aRoleSupply: numericEvidence(spouseEvidence, "aRoleSupply"),
      bRoleSupply: numericEvidence(spouseEvidence, "bRoleSupply"),
      aReceivesNoblemanBranches: stringArrayEvidence(starEvidence, "aReceivesNoblemanBranches"),
      bReceivesNoblemanBranches: stringArrayEvidence(starEvidence, "bReceivesNoblemanBranches"),
    },
    strengths: snapshot.strengths,
    adjustmentPoints: snapshot.adjustmentPoints,
    timingSupport: {
      luckCycleEngineAvailable: false,
      currentDimensionScore: snapshot.dimensions.luckCycleAlignment.normalizedScore,
    },
    aiBoundary: snapshot.aiBoundary,
  };

  if (containsForbiddenKey(payload)) {
    throw new Error("ReportEvidencePack에 금지된 개인정보 키가 포함되어 있습니다.");
  }
  return payload;
}

function elementList(elements: FiveElement[]) {
  return elements.length ? elements.map((element) => ELEMENT_LABELS[element]).join(", ") : "뚜렷한 단일 기운 없음";
}

function relationshipSpecificTemplate(type: CompatibilityCalculationSnapshot["relationshipType"]) {
  switch (type) {
    case "crush":
      return [
        "호감의 방향을 점수만으로 단정하지 말고 실제 반응과 접점의 반복성을 확인하는 편이 좋아요.",
        "편하게 이어지는 강점 영역을 대화 소재와 만남의 접점으로 활용해 보세요.",
        "조정점이 드러날 때는 상대의 마음을 추측하기보다 반응 속도와 표현 방식을 관찰하세요.",
      ] as const;
    case "flirting":
      return [
        "썸 단계에서는 잘 맞는 영역보다 차이가 생겼을 때 회복되는 속도가 더 중요해요.",
        "강점 영역을 중심으로 부담 없는 만남을 반복하면 관계 리듬을 확인하기 쉬워요.",
        "연락 빈도와 표현 강도는 추측보다 구체적으로 맞추는 편이 안전해요.",
      ] as const;
    case "lover":
      return [
        "연인 관계에서는 강점이 일상에서 반복될 수 있는지와 약점이 갈등으로 굳어지는지를 함께 봐야 해요.",
        "두 사람이 편한 의사표현과 생활 리듬을 작은 규칙으로 만들어 두면 장점을 오래 쓰기 쉬워요.",
        "낮은 영역은 성격 결함보다 반복되는 상황의 차이로 다루는 편이 좋아요.",
      ] as const;
    case "friend":
      return [
        "친구 관계에서는 함께 있을 때 에너지가 편한지와 기대치가 과도하게 엇갈리지 않는지가 중요해요.",
        "강점과 연결되는 공동 활동을 반복하면 관계 만족도를 높이기 쉬워요.",
        "친하다는 이유로 시간·약속·연락 기대치를 생략하지 않는 편이 좋아요.",
      ] as const;
    case "coworker":
      return [
        "직장동료 관계에서는 호감보다 역할·속도·의사결정 방식의 조합이 더 중요해요.",
        "강점이 있는 영역은 역할분담에 적극 활용하고, 취약 영역은 문서와 일정으로 보완하세요.",
        "갈등 가능성이 있는 지점은 성향 평가보다 업무 기준과 책임 범위를 먼저 맞추는 게 안전해요.",
      ] as const;
  }
}

export function buildTemplateNarrative(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
): CompatibilityNarrative {
  const pack = buildReportEvidencePack(snapshot, input);
  const a = pack.persons.A;
  const b = pack.persons.B;
  const firstStrength = snapshot.strengths[0];
  const secondStrength = snapshot.strengths[1] ?? firstStrength;
  const firstAdjustment = snapshot.adjustmentPoints[0];
  const secondAdjustment = snapshot.adjustmentPoints[1] ?? firstAdjustment;
  const specific = relationshipSpecificTemplate(snapshot.relationshipType);
  const usefulA = pack.directionalSignals.aReceivesUsefulFit;
  const usefulB = pack.directionalSignals.bReceivesUsefulFit;

  return {
    headline: `${RELATIONSHIP_LABELS[snapshot.relationshipType]} 관계에서 ${DIMENSION_LABELS[firstStrength]}이 가장 강하게 잡히는 조합이에요.`,
    summary: `종합 ${snapshot.score}점으로, ${DIMENSION_LABELS[firstStrength]}과 ${DIMENSION_LABELS[secondStrength]}이 상대적인 강점이에요. 반면 ${DIMENSION_LABELS[firstAdjustment]}은 관계가 가까워질수록 의식적으로 조율할 필요가 있어요. 계산 신뢰도는 ${snapshot.confidence}이며 점수 범위는 ${snapshot.uncertaintyRange.min}~${snapshot.uncertaintyRange.max}점이에요.`,
    personA: {
      core: `A의 일간은 ${a.dayMaster.stem}(${ELEMENT_LABELS[a.dayMaster.element]})이고 ${a.dayMaster.yinYang} 기운으로 계산됐어요.`,
      elementBalance: `A는 ${elementList(a.elementBalance.strongest)}이 상대적으로 강하고 ${elementList(a.elementBalance.weakest)}이 상대적으로 약해요.`,
      relationshipNeed: `A에게 필요한 방향의 우선 신호는 ${elementList(a.usefulSignal.useful)}, 보조 신호는 ${elementList(a.usefulSignal.favorable)}예요.`,
      strength: `신강약은 ${a.strengthSignal.level} 방향의 soft signal이며 신뢰도 ${a.strengthSignal.confidence}로 사용해요.`,
      caution: `부담 가능 기운은 ${elementList(a.usefulSignal.unfavorable)}으로 잡히지만 경계 명식일수록 단정하지 않아요.`,
    },
    personB: {
      core: `B의 일간은 ${b.dayMaster.stem}(${ELEMENT_LABELS[b.dayMaster.element]})이고 ${b.dayMaster.yinYang} 기운으로 계산됐어요.`,
      elementBalance: `B는 ${elementList(b.elementBalance.strongest)}이 상대적으로 강하고 ${elementList(b.elementBalance.weakest)}이 상대적으로 약해요.`,
      relationshipNeed: `B에게 필요한 방향의 우선 신호는 ${elementList(b.usefulSignal.useful)}, 보조 신호는 ${elementList(b.usefulSignal.favorable)}예요.`,
      strength: `신강약은 ${b.strengthSignal.level} 방향의 soft signal이며 신뢰도 ${b.strengthSignal.confidence}로 사용해요.`,
      caution: `부담 가능 기운은 ${elementList(b.usefulSignal.unfavorable)}으로 잡히지만 경계 명식일수록 단정하지 않아요.`,
    },
    basicChemistry: {
      dayMaster: `${DIMENSION_LABELS.dayMaster} 점수는 ${snapshot.dimensions.dayMaster.normalizedScore}점이에요.`,
      dayBranch: `${DIMENSION_LABELS.dayBranch} 점수는 ${snapshot.dimensions.dayBranch.normalizedScore}점이에요.`,
      yinYang: "음양은 일간 상성의 보조 설명으로 사용하며 별도 가산점으로 중복 반영하지 않아요.",
      elementBalance: `오행 상보성은 ${snapshot.dimensions.elementComplementarity.normalizedScore}점으로 계산됐어요.`,
    },
    bondAndFriction: {
      heavenlyStems: `천간 합충은 ${snapshot.dimensions.heavenlyStemInteraction.normalizedScore}점으로 계산됐어요.`,
      earthlyBranches: `지지 형충파해는 ${snapshot.dimensions.earthlyBranchInteraction.normalizedScore}점으로 계산됐어요.`,
      specialSignals: `귀인 신호는 ${snapshot.dimensions.specialStars.normalizedScore}점이며 MVP에서는 천을귀인만 보수적으로 반영해요.`,
    },
    directionalImpact: {
      aToB: `A가 B에게 주는 필요한 기운의 보완은 ${usefulB ?? "중립"} 수준으로 계산됐어요.`,
      bToA: `B가 A에게 주는 필요한 기운의 보완은 ${usefulA ?? "중립"} 수준으로 계산됐어요.`,
      balance: usefulA !== null && usefulB !== null && Math.abs(usefulA - usefulB) >= 6
        ? "서로에게 주는 보완 강도가 완전히 대칭적이지 않아 한쪽이 더 안정시키는 역할로 느껴질 수 있어요."
        : "서로에게 주는 보완 강도는 비교적 비슷한 편이에요.",
    },
    flow: {
      primary: `${DIMENSION_LABELS[firstStrength]}이 관계의 가장 편한 축이에요.`,
      secondary: `${DIMENSION_LABELS[secondStrength]}도 관계를 유지하는 보조 강점으로 잡혀요.`,
      caution: `${DIMENSION_LABELS[firstAdjustment]}은 반복되는 상황에서 차이가 드러날 수 있는 영역이에요.`,
    },
    relationshipSpecific: { first: specific[0], second: specific[1], third: specific[2] },
    strengths: {
      first: `${DIMENSION_LABELS[firstStrength]}에서 두 사람의 호흡이 상대적으로 좋아요.`,
      second: `${DIMENSION_LABELS[secondStrength]}도 관계를 편하게 만드는 보조 강점이에요.`,
    },
    adjustments: {
      first: `${DIMENSION_LABELS[firstAdjustment]}에서는 서로의 방식을 추측하기보다 행동 기준을 확인하세요.`,
      second: `${DIMENSION_LABELS[secondAdjustment]}에서 차이가 느껴질 때는 구체적인 기대치를 말로 맞추는 편이 좋아요.`,
      redFlag: "낮은 점수 하나를 관계 실패 신호로 확대해석하거나 상대 성격을 단정하는 것은 피해야 해요.",
    },
    practicalGuide: {
      first: "잘 맞는 영역은 실제 데이트·대화·협업 방식으로 반복해 관계의 장점으로 굳혀 보세요.",
      second: "연락 빈도, 역할, 약속처럼 반복 가능한 기준을 구체적으로 합의하면 마찰을 줄이기 쉬워요.",
      third: "한쪽이 더 많이 보완하는 방향이면 그 역할을 당연하게 여기지 말고 부담이 쌓이는지 확인하세요.",
      avoid: "점수만 근거로 상대의 마음이나 미래 행동을 단정하지 마세요.",
      conflictAction: "갈등이 생기면 누가 맞는지보다 어떤 상황에서 같은 마찰이 반복됐는지 먼저 정리하고 한 가지 행동 규칙부터 바꿔 보세요.",
    },
    timing: {
      currentSignal: `현재 MVP의 대운 동조 항목은 ${snapshot.dimensions.luckCycleAlignment.normalizedScore}점 중립값이에요.`,
      limitation: "대운·세운 전용 계산 엔진이 아직 없으므로 특정 연도·월의 관계 고점이나 경고 시기를 예측하지 않아요.",
    },
  };
}

function isStringRecord(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === "string");
}

function isNarrative(value: unknown): value is CompatibilityNarrative {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const root = value as Record<string, unknown>;
  return (
    typeof root.headline === "string" &&
    typeof root.summary === "string" &&
    isStringRecord(root.personA, ["core", "elementBalance", "relationshipNeed", "strength", "caution"]) &&
    isStringRecord(root.personB, ["core", "elementBalance", "relationshipNeed", "strength", "caution"]) &&
    isStringRecord(root.basicChemistry, ["dayMaster", "dayBranch", "yinYang", "elementBalance"]) &&
    isStringRecord(root.bondAndFriction, ["heavenlyStems", "earthlyBranches", "specialSignals"]) &&
    isStringRecord(root.directionalImpact, ["aToB", "bToA", "balance"]) &&
    isStringRecord(root.flow, ["primary", "secondary", "caution"]) &&
    isStringRecord(root.relationshipSpecific, ["first", "second", "third"]) &&
    isStringRecord(root.strengths, ["first", "second"]) &&
    isStringRecord(root.adjustments, ["first", "second", "redFlag"]) &&
    isStringRecord(root.practicalGuide, ["first", "second", "third", "avoid", "conflictAction"]) &&
    isStringRecord(root.timing, ["currentSignal", "limitation"])
  );
}

type AnthropicUsageShape = {
  input_tokens?: unknown;
  output_tokens?: unknown;
  cache_creation_input_tokens?: unknown;
  cache_read_input_tokens?: unknown;
};

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function configuredUsdKrwRate() {
  const parsed = Number(process.env.AI_COST_USD_KRW);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_USD_KRW_COST_RATE;
}

export function calculateAnthropicUsageCost(
  usage: AnthropicUsageShape,
  usdKrwRate = configuredUsdKrwRate(),
): NarrativeUsage {
  const inputTokens = positiveInteger(usage.input_tokens);
  const outputTokens = positiveInteger(usage.output_tokens);
  const cacheCreationInputTokens = positiveInteger(usage.cache_creation_input_tokens);
  const cacheReadInputTokens = positiveInteger(usage.cache_read_input_tokens);
  const estimatedUsd =
    (inputTokens / 1_000_000) * HAIKU_INPUT_USD_PER_MTOK +
    (outputTokens / 1_000_000) * HAIKU_OUTPUT_USD_PER_MTOK;
  return {
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    estimatedUsd: round(estimatedUsd, 8),
    estimatedKrw: round(estimatedUsd * usdKrwRate, 2),
    usdKrwRate,
    pricing: {
      inputUsdPerMillionTokens: HAIKU_INPUT_USD_PER_MTOK,
      outputUsdPerMillionTokens: HAIKU_OUTPUT_USD_PER_MTOK,
    },
  };
}

function extractAnthropicText(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  const texts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const candidate = block as { type?: unknown; text?: unknown };
    if (candidate.type === "text" && typeof candidate.text === "string") texts.push(candidate.text);
  }
  return texts.length ? texts.join("") : null;
}

async function generateWithAnthropic(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY_MISSING");
  const model = process.env.ANTHROPIC_NARRATIVE_MODEL?.trim() || DEFAULT_REPORT_MODEL;
  const payload = buildReportEvidencePack(snapshot, input);
  const payloadText = JSON.stringify(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: [
          "당신은 우리사주의 유료 1:1 관계 사주 리포트 편집자입니다.",
          "오직 ReportEvidencePack에 들어 있는 계산값과 근거만 사용하세요. 새로운 사주 사실, 점수, 순위를 만들지 마세요.",
          "모든 사용자가 자기 조합에만 해당한다고 느낄 수 있도록 A와 B의 차이, A→B와 B→A의 비대칭, 구체적인 합충 근거를 우선 활용하세요.",
          "문장을 일반론으로 채우지 말고 같은 표현을 반복하지 마세요. 단, 근거가 없으면 억지로 구체화하지 마세요.",
          "신강약과 용신은 soft signal입니다. confidence가 낮으면 단정 강도를 낮추고 가능성 표현을 사용하세요.",
          "관계 성공/실패, 상대의 마음, 결혼 여부를 확정적으로 예언하지 마세요.",
          "A/B 개인 분석, 기본 케미, 결속·마찰, 양방향 영향, 관계 흐름, 관계유형 전용 분석, 강점·위험, 실전 매뉴얼을 모두 빠짐없이 작성하세요.",
          "timingSupport.luckCycleEngineAvailable가 false이면 특정 연도·월을 만들어내지 말고 현재 MVP의 한계를 명확히 쓰세요.",
          "한국어로 자연스럽고 구체적으로 작성하되 각 필드는 보통 1~3문장으로 제한하세요.",
        ].join("\n"),
        messages: [{ role: "user", content: payloadText }],
        output_config: {
          format: {
            type: "json_schema",
            schema: NARRATIVE_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`ANTHROPIC_HTTP_${response.status}`);
    const body: unknown = await response.json();
    const outputText = extractAnthropicText(body);
    if (!outputText) throw new Error("ANTHROPIC_EMPTY_OUTPUT");
    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error("ANTHROPIC_INVALID_JSON");
    }
    if (!isNarrative(parsed)) throw new Error("ANTHROPIC_SCHEMA_MISMATCH");

    const usageShape = body && typeof body === "object" && !Array.isArray(body)
      ? ((body as { usage?: AnthropicUsageShape }).usage ?? {})
      : {};
    const usage = calculateAnthropicUsageCost(usageShape);
    const payloadBytes = Buffer.byteLength(payloadText, "utf8");
    console.info("[woorigunghap:report-cost]", JSON.stringify({
      provider: "anthropic",
      model,
      promptVersion: REPORT_PROMPT_VERSION,
      payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
      payloadBytes,
      usage,
    }));
    return { narrative: parsed, model, usage, payloadBytes };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCompatibilityNarrative(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
  options?: { modeOverride?: NarrativeMode },
): Promise<NarrativeGenerationResult> {
  const configuredMode = process.env.REPORT_NARRATIVE_MODE === "anthropic" ? "anthropic" : "template";
  const mode = options?.modeOverride ?? configuredMode;
  const payloadBytes = Buffer.byteLength(JSON.stringify(buildReportEvidencePack(snapshot, input)), "utf8");

  if (mode === "template") {
    return {
      narrative: buildTemplateNarrative(snapshot, input),
      meta: {
        mode: "template",
        provider: "template",
        model: null,
        promptVersion: REPORT_PROMPT_VERSION,
        payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
        fallbackReason: null,
        usage: null,
        payloadBytes,
      },
    };
  }

  try {
    const generated = await generateWithAnthropic(snapshot, input);
    return {
      narrative: generated.narrative,
      meta: {
        mode: "anthropic",
        provider: "anthropic",
        model: generated.model,
        promptVersion: REPORT_PROMPT_VERSION,
        payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
        fallbackReason: null,
        usage: generated.usage,
        payloadBytes: generated.payloadBytes,
      },
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : "ANTHROPIC_UNKNOWN_ERROR";
    return {
      narrative: buildTemplateNarrative(snapshot, input),
      meta: {
        mode: "template",
        provider: "template",
        model: null,
        promptVersion: REPORT_PROMPT_VERSION,
        payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
        fallbackReason,
        usage: null,
        payloadBytes,
      },
    };
  }
}
