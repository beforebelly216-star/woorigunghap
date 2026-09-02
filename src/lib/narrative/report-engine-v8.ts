import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { OneToOneReportInput } from "@/lib/report-input";
import {
  resolveReportModel,
  REPORT_EVIDENCE_PACK_VERSION,
  buildReportEvidencePack,
  type NarrativeUsage,
} from "@/lib/narrative/report-engine";
import {
  buildPaidReportFacts,
  type DetailedReportContent,
  type PaidReportFacts,
} from "@/lib/narrative/report-engine-v5";
import type {
  ActionPlan30,
  PartnerDeepDive,
  PartnerInnerMindHero,
  PersonalLeverage,
  SituationStrategy,
  EnhancedDetailedReportContent,
} from "@/lib/narrative/report-deep-content";
import { buildReportEditorialContext } from "@/lib/narrative/report-editorial-context";
import { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";
import {
  combineAnthropicUsage,
  requestStructuredSegment,
  type PaidEditorialFactsPayload,
} from "@/lib/narrative/report-engine-v6-request";
import {
  RELATIONSHIP_EDITORIAL_VERSION,
  relationshipPromptRules,
} from "@/lib/relationship-editorial";

export const PAID_REPORT_V7_PROMPT_VERSION = "paid-report-v10-woorisaju-direct-voice" as const;
export const PAID_REPORT_V7_PAYLOAD_VERSION = "paid-report-evidence-v7" as const;
export const PAID_REPORT_SEGMENTS = ["intro", "dynamics", "action"] as const;
export type PaidReportSegmentName = (typeof PAID_REPORT_SEGMENTS)[number];

const STRING_ARRAY = { type: "array", items: { type: "string" } } as const;

function objectSchema(properties: Record<string, unknown>) {
  return { type: "object", additionalProperties: false, properties, required: Object.keys(properties) } as const;
}

const PERSON_SCHEMA = objectSchema({
  overallProfile: { type: "string" },
  elementAnalysis: { type: "string" },
  relationshipNeeds: { type: "string" },
  strengths: STRING_ARRAY,
  cautions: STRING_ARRAY,
});

const INTRO_SCHEMA = objectSchema({
  overview: objectSchema({ headline: { type: "string" }, detailedSummary: { type: "string" } }),
  personA: PERSON_SCHEMA,
  personB: PERSON_SCHEMA,
  keyTakeaways: objectSchema({ ch0: STRING_ARRAY, ch1: STRING_ARRAY }),
});

const PARTNER_DEEP_DIVE_SCHEMA = objectSchema({
  outerInnerContrast: { type: "string" },
  comfortTriggers: STRING_ARRAY,
  sensitiveTriggers: STRING_ARRAY,
  preferredInteraction: STRING_ARRAY,
  observableScenes: {
    type: "array",
    items: objectSchema({
      situation: { type: "string" },
      likelyReaction: { type: "string" },
      considerateResponse: { type: "string" },
    }),
  },
  profileTags: STRING_ARRAY,
});

const PARTNER_INNER_MIND_HERO_SCHEMA = objectSchema({
  headline: { type: "string" },
  innerVoice: { type: "string" },
  sceneTranslation: { type: "string" },
  sajuBasis: { type: "string" },
});

const PERSONAL_LEVERAGE_SCHEMA = objectSchema({
  topStrengths: {
    type: "array",
    items: objectSchema({ title: { type: "string" }, whyItWorks: { type: "string" }, howToUse: { type: "string" } }),
  },
  conversationScripts: {
    type: "array",
    items: objectSchema({ situation: { type: "string" }, say: { type: "string" }, avoid: { type: "string" } }),
  },
  backfireHabits: {
    type: "array",
    items: objectSchema({ habit: { type: "string" }, correction: { type: "string" } }),
  },
});

const DYNAMICS_SCHEMA = objectSchema({
  chemistry: objectSchema({
    overview: { type: "string" },
    dayMaster: { type: "string" },
    dayBranch: { type: "string" },
    yinYang: { type: "string" },
    elements: { type: "string" },
  }),
  bondAndFriction: objectSchema({
    overview: { type: "string" },
    positiveInteractions: STRING_ARRAY,
    frictionInteractions: STRING_ARRAY,
    realLifeManifestations: STRING_ARRAY,
  }),
  directionalImpact: objectSchema({
    overview: { type: "string" },
    aToB: { type: "string" },
    bToA: { type: "string" },
    beneficialSupply: { type: "string" },
    burdenSupply: { type: "string" },
    asymmetry: { type: "string" },
  }),
  partnerDeepDive: PARTNER_DEEP_DIVE_SCHEMA,
  partnerInnerMindHero: PARTNER_INNER_MIND_HERO_SCHEMA,
  personalLeverage: PERSONAL_LEVERAGE_SCHEMA,
  keyTakeaways: objectSchema({ ch2: STRING_ARRAY, ch3: STRING_ARRAY }),
});

const ACTION_SCHEMA = objectSchema({
  relationshipFlow: objectSchema({
    overview: { type: "string" },
    roles: { type: "string" },
    initiative: { type: "string" },
    intimacy: { type: "string" },
    conflictScenarios: {
      type: "array",
      items: objectSchema({ situation: { type: "string" }, likelyPattern: { type: "string" }, response: { type: "string" } }),
    },
  }),
  relationshipSpecific: objectSchema({
    overview: { type: "string" },
    points: {
      type: "array",
      items: objectSchema({ title: { type: "string" }, detail: { type: "string" } }),
    },
  }),
  strengthsAndRisks: objectSchema({
    strengths: STRING_ARRAY,
    repeatedFrictions: STRING_ARRAY,
    redFlag: { type: "string" },
    warning: { type: "string" },
  }),
  practicalManual: objectSchema({
    do: STRING_ARRAY,
    dont: STRING_ARRAY,
    conflictProtocol: STRING_ARRAY,
    recommendedActivities: STRING_ARRAY,
  }),
  keyTakeaways: objectSchema({
    ch4: STRING_ARRAY, ch5: STRING_ARRAY, ch6: STRING_ARRAY,
    ch7: STRING_ARRAY, ch8: STRING_ARRAY, ch9: STRING_ARRAY,
  }),
});

export type IntroSegment = Pick<DetailedReportContent, "overview" | "personA" | "personB"> & {
  keyTakeaways: { ch0: string[]; ch1: string[] };
};
export type DynamicsSegment = Pick<DetailedReportContent, "chemistry" | "bondAndFriction" | "directionalImpact"> & {
  partnerDeepDive: PartnerDeepDive;
  partnerInnerMindHero: PartnerInnerMindHero;
  personalLeverage: PersonalLeverage;
  keyTakeaways: { ch2: string[]; ch3: string[] };
};
type CoreActionSegment = Pick<DetailedReportContent, "relationshipFlow" | "relationshipSpecific" | "strengthsAndRisks" | "practicalManual"> & {
  keyTakeaways: { ch4: string[]; ch5: string[]; ch6: string[]; ch7: string[]; ch8: string[]; ch9: string[] };
};
export type ActionSegment = CoreActionSegment & {
  situationStrategy: SituationStrategy;
  actionPlan30: ActionPlan30;
};
export type PaidReportSegmentContent = IntroSegment | DynamicsSegment | ActionSegment;

export function mergePaidReportSegmentContents(contents: PaidReportSegmentContent[]): EnhancedDetailedReportContent {
  const merged = Object.assign({}, ...contents) as DetailedReportContent;
  const keyTakeaways = Object.assign({}, ...contents.map((content) => content.keyTakeaways ?? {}));
  return { ...merged, keyTakeaways };
}

export type PaidReportSegmentMeta = {
  provider: "anthropic";
  model: string;
  promptVersion: typeof PAID_REPORT_V7_PROMPT_VERSION;
  payloadVersion: typeof PAID_REPORT_V7_PAYLOAD_VERSION;
  evidencePackVersion: typeof REPORT_EVIDENCE_PACK_VERSION;
  relationshipEditorialVersion: typeof RELATIONSHIP_EDITORIAL_VERSION;
  attempt: number;
  qualityCharacters: number;
  qualityWarnings: string[];
  usage: NarrativeUsage | null;
  payloadBytes: number;
};

export type PaidReportSegmentResult = {
  segment: PaidReportSegmentName;
  content: PaidReportSegmentContent;
  facts: PaidReportFacts;
  meta: PaidReportSegmentMeta;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function hasString(value: unknown, key: string) {
  return isObject(value) && typeof value[key] === "string";
}
function hasArray(value: unknown, key: string) {
  return isObject(value) && Array.isArray(value[key]);
}
function compactLength(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, child) => sum + compactLength(child), 0);
  if (isObject(value)) return Object.values(value).reduce<number>((sum, child) => sum + compactLength(child), 0);
  return 0;
}
function validKeyTakeaways(value: unknown, keys: string[]) {
  return isObject(value) && keys.every((key) => Array.isArray(value[key]) && (value[key] as unknown[]).length === 2);
}
function validPerson(value: unknown) {
  return hasString(value, "overallProfile") && hasString(value, "elementAnalysis") && hasString(value, "relationshipNeeds")
    && hasArray(value, "strengths") && hasArray(value, "cautions");
}
function validIntro(value: unknown): value is IntroSegment {
  if (!isObject(value) || !isObject(value.overview)) return false;
  return hasString(value.overview, "headline") && hasString(value.overview, "detailedSummary")
    && validPerson(value.personA) && validPerson(value.personB) && validKeyTakeaways(value.keyTakeaways, ["ch0", "ch1"]);
}
function validDynamics(value: unknown): value is DynamicsSegment {
  if (!isObject(value)) return false;
  return ["overview", "dayMaster", "dayBranch", "yinYang", "elements"].every((key) => hasString(value.chemistry, key))
    && ["overview"].every((key) => hasString(value.bondAndFriction, key))
    && hasArray(value.bondAndFriction, "positiveInteractions") && hasArray(value.bondAndFriction, "frictionInteractions")
    && hasArray(value.bondAndFriction, "realLifeManifestations")
    && ["overview", "aToB", "bToA", "beneficialSupply", "burdenSupply", "asymmetry"].every((key) => hasString(value.directionalImpact, key))
    && isObject(value.partnerDeepDive) && isObject(value.partnerInnerMindHero) && isObject(value.personalLeverage)
    && validKeyTakeaways(value.keyTakeaways, ["ch2", "ch3"]);
}
function validCoreAction(value: unknown): value is CoreActionSegment {
  if (!isObject(value)) return false;
  return ["overview", "roles", "initiative", "intimacy"].every((key) => hasString(value.relationshipFlow, key))
    && hasArray(value.relationshipFlow, "conflictScenarios")
    && hasString(value.relationshipSpecific, "overview") && hasArray(value.relationshipSpecific, "points")
    && hasArray(value.strengthsAndRisks, "strengths") && hasArray(value.strengthsAndRisks, "repeatedFrictions")
    && hasString(value.strengthsAndRisks, "redFlag") && hasString(value.strengthsAndRisks, "warning")
    && hasArray(value.practicalManual, "do") && hasArray(value.practicalManual, "dont") && hasArray(value.practicalManual, "conflictProtocol")
    && validKeyTakeaways(value.keyTakeaways, ["ch4", "ch5", "ch6", "ch7", "ch8", "ch9"]);
}

function introIssues(value: IntroSegment) {
  const length = compactLength(value);
  const issues: string[] = [];
  if (length < 1_050) issues.push("INTRO_SHORT");
  if (length > 1_500) issues.push("INTRO_LONG");
  if (value.overview.detailedSummary.length < 220) issues.push("SUMMARY_SHORT");
  if (compactLength(value.personA) < 260) issues.push("PERSON_A_SHORT");
  if (compactLength(value.personB) < 260) issues.push("PERSON_B_SHORT");
  return issues;
}
function dynamicsIssues(value: DynamicsSegment) {
  const length = compactLength(value);
  const issues: string[] = [];
  if (length < 1_450) issues.push("DYNAMICS_SHORT");
  if (length > 2_050) issues.push("DYNAMICS_LONG");
  if (compactLength(value.chemistry) < 700) issues.push("CHEMISTRY_SHORT");
  if (compactLength(value.directionalImpact) < 420) issues.push("DIRECTIONAL_SHORT");
  return issues;
}
function actionIssues(value: CoreActionSegment) {
  const length = compactLength(value);
  const issues: string[] = [];
  if (length < 1_250) issues.push("ACTION_SHORT");
  if (length > 2_000) issues.push("ACTION_LONG");
  if (!isObject(value.relationshipFlow) || !Array.isArray(value.relationshipFlow.conflictScenarios) || value.relationshipFlow.conflictScenarios.length < 3) issues.push("CONFLICT_CASES_SHORT");
  if (!isObject(value.relationshipSpecific) || !Array.isArray(value.relationshipSpecific.points) || value.relationshipSpecific.points.length < 4) issues.push("RELATION_SPECIFIC_SHORT");
  return issues;
}

function buildActionCompatibilityExtensions(value: CoreActionSegment): Pick<ActionSegment, "situationStrategy" | "actionPlan30"> {
  const points = value.relationshipSpecific.points;
  const conflictSteps = value.practicalManual.conflictProtocol;
  const actions = value.practicalManual.do;
  const cautions = value.practicalManual.dont;
  const weekSource = [
    points[0]?.detail ?? actions[0] ?? value.relationshipFlow.initiative,
    points[1]?.detail ?? actions[1] ?? value.relationshipFlow.intimacy,
    points[2]?.detail ?? actions[2] ?? value.relationshipFlow.roles,
    points[3]?.detail ?? actions[3] ?? value.relationshipSpecific.overview,
  ];

  return {
    situationStrategy: {
      priority: value.relationshipSpecific.overview,
      stepByStep: weekSource.slice(0, 3).map((action, index) => ({
        step: `${index + 1}단계`,
        action,
        watchFor: conflictSteps[index] ?? cautions[index] ?? value.strengthsAndRisks.warning,
      })),
      progressSignals: value.strengthsAndRisks.strengths,
      stopSignals: value.strengthsAndRisks.repeatedFrictions,
    },
    actionPlan30: {
      weeks: weekSource.map((action, index) => ({
        week: index + 1,
        goal: points[index]?.title ?? `${index + 1}주차 관계 점검`,
        action,
        check: conflictSteps[index] ?? value.strengthsAndRisks.warning,
      })),
      monthlyDont: cautions,
    },
  };
}

const BASE_RULES = [
  "당신은 우리사주의 친근한 관계 해설자입니다. 어렵고 낡은 점집 말투 대신 정확하고 자연스러운 현대 한국어로 두 사람의 관계를 직접 설명하세요.",
  "사용자에게 보이는 모든 문장은 친근한 반말로 씁니다. '~습니다', '~해요', 명령조 보고서 문체를 쓰지 말고 '~야', '~해', '~보여', '~할 수 있어'처럼 자연스럽게 끝내세요.",
  "화면에 보이는 사람 이름은 서버가 {{SELF}}, {{PARTNER}}, {{BOTH}}를 사용자가 입력한 별칭으로 치환합니다. A, B, 나, 상대방 같은 대체 호칭을 사용자 문장에 쓰지 마세요.",
  "모든 관계 판단은 제공된 사주 원국과 궁합 계산 근거에서 출발해야 합니다. 일상 언어로 결론을 먼저 말한 뒤, 같은 문단 안에서 일간·일지·오행 균형·천간/지지 상호작용 등 실제 제공된 근거가 왜 그런 결론으로 이어지는지 자연스럽게 연결하세요.",
  "전문 용어가 필요하면 먼저 일상 언어로 뜻을 설명하고 괄호나 다음 문장에서 용어를 붙이세요. '지지 형충파해', '오행 상보성', '천간 합충' 같은 말을 설명 없이 문장 첫머리에 두지 마세요.",
  "'항목 점수', '가중치에 반영', '근거를 사용', '계산상 높은 편'처럼 기계가 평가표를 읽는 문장을 쓰지 마세요. 현실 장면과 두 사람의 체감으로 번역하세요.",
  "'서버 계산상', 'AI가 분석한', 'payload', 'evidence', '내부 점수', '정책상' 같은 시스템 구현 문구를 결과에 노출하지 마세요.",
  "제공되지 않은 점수, 확률, 용신 확정, 미래 사건, 숨은 심리 사실을 새로 만들지 마세요. 점수와 순위는 절대 수정하지 마세요.",
  "두 사람의 심리를 단정적으로 발명하지 마세요. 사주에서 읽히는 관계 반응은 '이런 장면에서 이렇게 반응하기 쉽다'는 현실 장면과 근거로 설명하세요.",
  "같은 결론을 여러 장에서 반복해 분량을 채우지 마세요. 각 장은 다른 질문에 답해야 합니다.",
  "문장은 짧게 끊되 내용은 얕게 줄이지 마세요. 한 카드 안에서 결론→현실 장면→사주 근거→실제 의미가 이어지도록 2~4문장 단락을 사용하세요.",
  "이름 토큰이나 사람 이름에 붙은 조사(과·와·은·는·이·가·을·를·에게·의) 뒤에서 문장을 끝내지 마세요. 특히 '뚜렷하게 {{SELF}}와.' 같은 미완성 문장을 절대 쓰지 말고 서술어까지 완결하세요.",
  "짝사랑은 호감과 거리 조절, 썸은 속도와 확신, 연인은 반복 패턴과 회복, 친구는 친밀감과 경계, 직장동료는 신뢰와 역할 조율을 중심으로 해석하세요.",
  "친구와 직장동료에는 연애·성적 표현을 넣지 마세요. 짝사랑과 썸에는 이미 교제 중이라는 전제를 넣지 마세요.",
  "전체 세 세그먼트의 사용자 노출 본문이 공백 제외 약 5,000자, 허용 4,000~6,000자 안에 들어오도록 작성하세요. 짧은 샘플 카드 수준으로 축약하지 마세요.",
].join("\n");

function paidEditorialFacts(facts: PaidReportFacts): PaidEditorialFactsPayload {
  const person = (value: PaidReportFacts["A"]) => {
    const dayPillarCharacter = getDayPillarCharacter(value.pillars.day.korean);
    return {
      birthTimeKnown: value.birthTimeKnown,
      dayPillar: value.pillars.day,
      dayPillarCharacter: dayPillarCharacter ? {
        title: dayPillarCharacter.title,
        tagline: dayPillarCharacter.tagline,
        strengths: dayPillarCharacter.strengths,
        watchOut: dayPillarCharacter.watchOut,
        relationshipCue: dayPillarCharacter.relationshipCue,
      } : null,
    };
  };
  return { A: person(facts.A), B: person(facts.B) };
}

function paidEditorialEvidence(snapshot: CompatibilityCalculationSnapshot, input: OneToOneReportInput) {
  const evidence = buildReportEvidencePack(snapshot, input);
  const person = (value: typeof evidence.persons.A) => ({
    birthTimeKnown: value.birthTimeKnown,
    dayMaster: value.dayMaster,
    elementBalance: {
      dominantElements: value.elementBalance.strongest,
      lighterElements: value.elementBalance.weakest,
    },
    usefulSignal: value.usefulSignal,
  });
  const directionalSignals = Object.fromEntries(
    Object.entries(evidence.directionalSignals).filter(([key]) => key !== "aRoleSupply" && key !== "bRoleSupply"),
  );
  const dimensions = Object.fromEntries(Object.entries(evidence.dimensions).map(([dimension, item]) => [dimension, {
    normalizedScore: item.normalizedScore,
    evidence: dimension === "spouseStarRealization" ? { policy: "RELATIONSHIP_ROLE_SCORE_ONLY" } : item.evidence,
  }]));
  return {
    payloadVersion: evidence.payloadVersion,
    relationshipType: evidence.relationshipType,
    profile: evidence.profile,
    overall: evidence.overall,
    persons: { A: person(evidence.persons.A), B: person(evidence.persons.B) },
    dimensions,
    interactionEvidence: {
      dayMaster: dimensions.dayMaster?.evidence ?? null,
      dayBranch: dimensions.dayBranch?.evidence ?? null,
      elementComplementarity: dimensions.elementComplementarity?.evidence ?? null,
      heavenlyStemInteraction: dimensions.heavenlyStemInteraction?.evidence ?? null,
      earthlyBranchInteraction: dimensions.earthlyBranchInteraction?.evidence ?? null,
    },
    directionalSignals,
    strengths: evidence.strengths,
    adjustmentPoints: evidence.adjustmentPoints,
    timingSupport: evidence.timingSupport,
    aiBoundary: evidence.aiBoundary,
  };
}

function payloadFor(snapshot: CompatibilityCalculationSnapshot, input: OneToOneReportInput) {
  const facts = buildPaidReportFacts(input);
  return {
    facts,
    aiPayload: {
      payloadVersion: PAID_REPORT_V7_PAYLOAD_VERSION,
      facts: paidEditorialFacts(facts),
      evidence: paidEditorialEvidence(snapshot, input),
      editorialContext: buildReportEditorialContext(input),
    },
  };
}

async function generateIntro(apiKey: string, model: string, payloadText: string, relationshipRules: string) {
  return requestStructuredSegment<IntroSegment>({
    apiKey, model, schema: INTRO_SCHEMA,
    maxTokens: 3_000, retryMaxTokens: 3_800, timeoutMs: 85_000,
    preferStructured: true, label: "INTRO", validate: validIntro, qualityIssues: introIssues,
    system: `${BASE_RULES}\n\n${relationshipRules}\n\n[첫인상과 두 사람의 관계 성향]\n- 이 세그먼트는 공백 제외 1,050~1,400자를 목표로 합니다.\n- overview.headline은 화면 최상단에 한 줄만 노출합니다. 35~65자의 자연스러운 결론 한 문장으로 쓰고 점수를 다시 읽거나 전문 용어를 나열하지 마세요.\n- overview.detailedSummary는 280~420자. 관계의 핵심 결론, 가장 큰 장점, 가장 중요한 주의점, 두 사람의 사주 근거를 3~5문장으로 연결하세요.\n- personA/personB.overallProfile은 각각 220~320자. 각 별칭의 관계 성향을 현실 장면과 일주·일간·오행 근거가 함께 읽히게 작성하세요.\n- personA/personB.relationshipNeeds는 각각 70~120자. 카드 제목처럼 직접적인 결론 문장으로 쓰세요.\n- elementAnalysis, strengths, cautions는 저장 호환용 보조 필드입니다. 반복을 피하고 짧게 작성하세요.\n- keyTakeaways는 각각 정확히 2개, 32자 이내.`,
    user: `다음 비식별 사주 계산 근거만 사용해 1:1 리포트의 첫 부분을 작성하세요.\n${payloadText}`,
  });
}

async function generateDynamics(apiKey: string, model: string, payloadText: string, relationshipRules: string) {
  return requestStructuredSegment<DynamicsSegment>({
    apiKey, model, schema: DYNAMICS_SCHEMA,
    maxTokens: 4_000, retryMaxTokens: 5_000, timeoutMs: 110_000,
    preferStructured: true, label: "DYNAMICS", validate: validDynamics, qualityIssues: dynamicsIssues,
    system: `${BASE_RULES}\n\n${relationshipRules}\n\n[둘 사이 케미와 관계 구조]\n- 이 세그먼트는 공백 제외 1,450~1,900자를 목표로 합니다.\n- chemistry.overview는 220~320자. 왜 서로 끌리고 함께 있을 때 어떤 시너지가 생기는지 하나의 흐름으로 설명하세요.\n- chemistry.dayMaster/dayBranch/elements/yinYang은 각각 140~220자. 먼저 일상 장면에서 체감되는 결론을 말하고, 뒤에서 해당 사주 근거를 풀어 주세요.\n- directionalImpact.aToB/bToA/asymmetry는 각각 170~240자. {{SELF}}→{{PARTNER}}, {{PARTNER}}→{{SELF}} 방향 차이를 분명히 쓰세요.\n- bondAndFriction.overview는 180~260자로 관계 구조의 핵심을 설명하세요. 나머지 배열과 partnerDeepDive/personalLeverage는 저장 호환용 보조 자료이므로 핵심을 반복하지 말고 짧게 작성하세요.\n- '끌리는 이유'와 '함께 있을 때 좋은 이유'를 별도 장으로 반복하지 말고 chemistry 안에서 통합하세요.\n- keyTakeaways는 각각 정확히 2개, 32자 이내.`,
    user: `다음 비식별 사주 계산 근거만 사용해 두 사람의 끌림, 시너지와 관계 구조를 깊게 작성하세요.\n${payloadText}`,
  });
}

async function generateAction(apiKey: string, model: string, payloadText: string, relationshipRules: string) {
  const generated = await requestStructuredSegment<CoreActionSegment>({
    apiKey, model, schema: ACTION_SCHEMA,
    maxTokens: 5_200, retryMaxTokens: 6_200, timeoutMs: 125_000,
    preferStructured: true, label: "ACTION", validate: validCoreAction, qualityIssues: actionIssues,
    system: `${BASE_RULES}\n\n${relationshipRules}\n\n[관계 성향 + 반복 장면 + 지금 중요한 질문]\n- 이 세그먼트는 공백 제외 1,250~1,900자를 목표로 합니다.\n- relationshipFlow.overview/roles/initiative/intimacy는 각각 90~150자로 관계 성향을 설명하되 다른 장과 중복하지 마세요.\n- conflictScenarios는 정확히 3개. 각 항목은 situation 35~70자, likelyPattern 120~190자, response 90~150자로 작성하세요. 고정된 단계 목록이 아니라 실제로 반복될 수 있는 한 장면과 풀리는 실마리로 쓰세요.\n- relationshipSpecific.overview는 180~280자, points는 정확히 4개이며 각 detail은 120~200자. 각 title은 '지금 확인할 건 이거야'처럼 뜻이 바로 보이는 짧은 문장으로 쓰세요. 사용자의 mostCurious가 있으면 마지막 point에서 계산 근거 범위 안에서 직접 답하세요.\n- strengthsAndRisks와 practicalManual은 이전 저장 형식과의 호환을 위한 필드이며 새 화면에는 표시하지 않습니다. 다른 본문을 반복하지 말고 배열은 비워도 됩니다. redFlag와 warning만 짧은 한 문장으로 채우세요.\n- keyTakeaways.ch4~ch9는 각각 정확히 2개, 32자 이내.`,
    user: `다음 비식별 사주 계산 근거만 사용해 관계 성향, 반복될 수 있는 갈등 장면, 현재 관계에서 중요한 질문을 작성하세요.\n${payloadText}`,
  });
  const core = generated.best.value;
  return {
    ...generated,
    best: {
      ...generated.best,
      value: { ...core, ...buildActionCompatibilityExtensions(core) },
    },
  };
}

export async function generatePaidReportSegmentV7(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
  segment: PaidReportSegmentName,
): Promise<PaidReportSegmentResult> {
  if (process.env.REPORT_NARRATIVE_MODE !== "anthropic") throw new Error("PAID_REPORT_SEGMENT_FAILED_MODE_NOT_ANTHROPIC");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("PAID_REPORT_SEGMENT_FAILED_API_KEY_MISSING");
  const model = resolveReportModel();
  const payload = payloadFor(snapshot, input);
  const payloadText = JSON.stringify(payload.aiPayload);
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");
  const relationshipRules = relationshipPromptRules(input.relationshipType, input.coworkerHierarchy ?? null);

  try {
    const generated = segment === "intro"
      ? await generateIntro(apiKey, model, payloadText, relationshipRules)
      : segment === "dynamics"
        ? await generateDynamics(apiKey, model, payloadText, relationshipRules)
        : await generateAction(apiKey, model, payloadText, relationshipRules);
    const usage = combineAnthropicUsage(generated.allUsage);
    console.info("[woorigunghap:paid-report-v8-segment]", JSON.stringify({
      segment, model, relationshipType: input.relationshipType,
      relationshipEditorialVersion: RELATIONSHIP_EDITORIAL_VERSION,
      attempt: generated.attempts,
      qualityCharacters: generated.best.characters,
      qualityWarnings: generated.best.qualityIssues,
      usage,
    }));
    return {
      segment,
      content: generated.best.value,
      facts: payload.facts,
      meta: {
        provider: "anthropic", model,
        promptVersion: PAID_REPORT_V7_PROMPT_VERSION,
        payloadVersion: PAID_REPORT_V7_PAYLOAD_VERSION,
        evidencePackVersion: REPORT_EVIDENCE_PACK_VERSION,
        relationshipEditorialVersion: RELATIONSHIP_EDITORIAL_VERSION,
        attempt: generated.attempts,
        qualityCharacters: generated.best.characters,
        qualityWarnings: generated.best.qualityIssues,
        usage, payloadBytes,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    console.warn("[woorigunghap:paid-report-v8-segment-failed]", JSON.stringify({ segment, model, relationshipType: input.relationshipType, reason }));
    throw new Error(`PAID_REPORT_SEGMENT_FAILED_${segment.toUpperCase()}_${reason}`);
  }
}
