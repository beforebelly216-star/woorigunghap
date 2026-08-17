import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { OneToOneReportInput } from "@/lib/report-input";
import {
  DEFAULT_REPORT_MODEL,
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
  PersonalLeverage,
  SituationStrategy,
} from "@/lib/narrative/report-deep-content";
import {
  combineAnthropicUsage,
  requestStructuredSegment,
} from "@/lib/narrative/report-engine-v6-request";
import {
  RELATIONSHIP_EDITORIAL_VERSION,
  relationshipPromptRules,
} from "@/lib/relationship-editorial";

export const PAID_REPORT_V7_PROMPT_VERSION = "paid-report-v7-editorial-v5-deep" as const;
export const PAID_REPORT_V7_PAYLOAD_VERSION = "paid-report-evidence-v3" as const;
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

const PERSONAL_LEVERAGE_SCHEMA = objectSchema({
  topStrengths: {
    type: "array",
    items: objectSchema({
      title: { type: "string" },
      whyItWorks: { type: "string" },
      howToUse: { type: "string" },
    }),
  },
  conversationScripts: {
    type: "array",
    items: objectSchema({
      situation: { type: "string" },
      say: { type: "string" },
      avoid: { type: "string" },
    }),
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
  personalLeverage: PERSONAL_LEVERAGE_SCHEMA,
});

const SITUATION_STRATEGY_SCHEMA = objectSchema({
  priority: { type: "string" },
  stepByStep: {
    type: "array",
    items: objectSchema({ step: { type: "string" }, action: { type: "string" }, watchFor: { type: "string" } }),
  },
  progressSignals: STRING_ARRAY,
  stopSignals: STRING_ARRAY,
});

const ACTION_PLAN_30_SCHEMA = objectSchema({
  weeks: {
    type: "array",
    items: objectSchema({
      week: { type: "number" },
      goal: { type: "string" },
      action: { type: "string" },
      check: { type: "string" },
    }),
  },
  monthlyDont: STRING_ARRAY,
});

const ACTION_SCHEMA = objectSchema({
  relationshipFlow: objectSchema({
    overview: { type: "string" },
    roles: { type: "string" },
    initiative: { type: "string" },
    intimacy: { type: "string" },
    conflictScenarios: {
      type: "array",
      items: objectSchema({
        situation: { type: "string" },
        likelyPattern: { type: "string" },
        response: { type: "string" },
      }),
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
  situationStrategy: SITUATION_STRATEGY_SCHEMA,
  actionPlan30: ACTION_PLAN_30_SCHEMA,
});

export type IntroSegment = Pick<DetailedReportContent, "overview" | "personA" | "personB">;
export type DynamicsSegment = Pick<DetailedReportContent, "chemistry" | "bondAndFriction" | "directionalImpact"> & {
  partnerDeepDive: PartnerDeepDive;
  personalLeverage: PersonalLeverage;
};
export type ActionSegment = Pick<DetailedReportContent, "relationshipFlow" | "relationshipSpecific" | "strengthsAndRisks" | "practicalManual"> & {
  situationStrategy: SituationStrategy;
  actionPlan30: ActionPlan30;
};
export type PaidReportSegmentContent = IntroSegment | DynamicsSegment | ActionSegment;

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
function hasString(obj: Record<string, unknown>, key: string) {
  return typeof obj[key] === "string";
}
function hasArray(obj: Record<string, unknown>, key: string) {
  return Array.isArray(obj[key]);
}
function validPerson(value: unknown) {
  if (!isObject(value)) return false;
  return hasString(value, "overallProfile")
    && hasString(value, "elementAnalysis")
    && hasString(value, "relationshipNeeds")
    && hasArray(value, "strengths")
    && hasArray(value, "cautions");
}
function validPartnerDeepDive(value: unknown): value is PartnerDeepDive {
  if (!isObject(value)) return false;
  return hasString(value, "outerInnerContrast")
    && hasArray(value, "comfortTriggers")
    && hasArray(value, "sensitiveTriggers")
    && hasArray(value, "preferredInteraction")
    && hasArray(value, "observableScenes")
    && hasArray(value, "profileTags");
}
function validPersonalLeverage(value: unknown): value is PersonalLeverage {
  if (!isObject(value)) return false;
  return hasArray(value, "topStrengths")
    && hasArray(value, "conversationScripts")
    && hasArray(value, "backfireHabits");
}
function validSituationStrategy(value: unknown): value is SituationStrategy {
  if (!isObject(value)) return false;
  return hasString(value, "priority")
    && hasArray(value, "stepByStep")
    && hasArray(value, "progressSignals")
    && hasArray(value, "stopSignals");
}
function validActionPlan30(value: unknown): value is ActionPlan30 {
  if (!isObject(value)) return false;
  return hasArray(value, "weeks") && hasArray(value, "monthlyDont");
}
function validIntro(value: unknown): value is IntroSegment {
  if (!isObject(value) || !isObject(value.overview)) return false;
  return hasString(value.overview, "headline")
    && hasString(value.overview, "detailedSummary")
    && validPerson(value.personA)
    && validPerson(value.personB);
}
function validDynamics(value: unknown): value is DynamicsSegment {
  if (!isObject(value) || !isObject(value.chemistry) || !isObject(value.bondAndFriction) || !isObject(value.directionalImpact)) return false;
  return ["overview", "dayMaster", "dayBranch", "yinYang", "elements"].every((key) => hasString(value.chemistry as Record<string, unknown>, key))
    && hasString(value.bondAndFriction, "overview")
    && hasArray(value.bondAndFriction, "positiveInteractions")
    && hasArray(value.bondAndFriction, "frictionInteractions")
    && hasArray(value.bondAndFriction, "realLifeManifestations")
    && ["overview", "aToB", "bToA", "beneficialSupply", "burdenSupply", "asymmetry"].every((key) => hasString(value.directionalImpact as Record<string, unknown>, key))
    && validPartnerDeepDive(value.partnerDeepDive)
    && validPersonalLeverage(value.personalLeverage);
}
function validAction(value: unknown): value is ActionSegment {
  if (!isObject(value) || !isObject(value.relationshipFlow) || !isObject(value.relationshipSpecific) || !isObject(value.strengthsAndRisks) || !isObject(value.practicalManual)) return false;
  return ["overview", "roles", "initiative", "intimacy"].every((key) => hasString(value.relationshipFlow as Record<string, unknown>, key))
    && hasArray(value.relationshipFlow, "conflictScenarios")
    && hasString(value.relationshipSpecific, "overview")
    && hasArray(value.relationshipSpecific, "points")
    && hasArray(value.strengthsAndRisks, "strengths")
    && hasArray(value.strengthsAndRisks, "repeatedFrictions")
    && hasString(value.strengthsAndRisks, "redFlag")
    && hasString(value.strengthsAndRisks, "warning")
    && hasArray(value.practicalManual, "do")
    && hasArray(value.practicalManual, "dont")
    && hasArray(value.practicalManual, "conflictProtocol")
    && hasArray(value.practicalManual, "recommendedActivities")
    && validSituationStrategy(value.situationStrategy)
    && validActionPlan30(value.actionPlan30);
}

function compactLength(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, child) => sum + compactLength(child), 0);
  if (isObject(value)) return Object.values(value).reduce<number>((sum, child) => sum + compactLength(child), 0);
  return 0;
}
function introIssues(value: IntroSegment) {
  const issues: string[] = [];
  if (compactLength(value) < 1700) issues.push("INTRO_SHORT");
  if (value.overview.detailedSummary.length < 260) issues.push("SUMMARY_SHORT");
  if (compactLength(value.personA) < 620) issues.push("PERSON_A_SHORT");
  if (compactLength(value.personB) < 620) issues.push("PERSON_B_SHORT");
  return issues;
}
function dynamicsIssues(value: DynamicsSegment) {
  const issues: string[] = [];
  if (compactLength(value) < 3600) issues.push("DYNAMICS_SHORT");
  if (compactLength(value.partnerDeepDive) < 1200) issues.push("PARTNER_DEEP_DIVE_SHORT");
  if (compactLength(value.personalLeverage) < 900) issues.push("PERSONAL_LEVERAGE_SHORT");
  if (value.bondAndFriction.realLifeManifestations.length < 3) issues.push("REAL_LIFE_CASES_SHORT");
  if (value.partnerDeepDive.observableScenes.length < 3) issues.push("PARTNER_SCENES_SHORT");
  if (value.personalLeverage.topStrengths.length < 3) issues.push("LEVERAGE_TOP3_SHORT");
  if (value.personalLeverage.conversationScripts.length < 2) issues.push("CONVERSATION_SCRIPTS_SHORT");
  return issues;
}
function actionIssues(value: ActionSegment) {
  const issues: string[] = [];
  if (compactLength(value) < 3600) issues.push("ACTION_SHORT");
  if (value.relationshipFlow.conflictScenarios.length < 2) issues.push("CONFLICT_CASES_SHORT");
  if (value.relationshipSpecific.points.length < 4) issues.push("RELATION_SPECIFIC_SHORT");
  if (value.practicalManual.do.length < 4 || value.practicalManual.conflictProtocol.length < 4) issues.push("MANUAL_SHORT");
  if (value.situationStrategy.stepByStep.length < 4) issues.push("STRATEGY_STEPS_SHORT");
  if (value.situationStrategy.progressSignals.length < 2 || value.situationStrategy.stopSignals.length < 2) issues.push("STRATEGY_SIGNALS_SHORT");
  if (value.actionPlan30.weeks.length !== 4) issues.push("ACTION_PLAN_30_WEEKS_INVALID");
  return issues;
}

const BASE_RULES = [
  "당신은 '우리궁합'의 1,000원 유료 관계 사주 리포트를 쓰는 한국어 전문 편집자입니다.",
  "말투는 차분하고 다정하지만 단정적 예언이나 과장 없이, 친한 상담가가 핵심을 또렷하게 짚어 주는 어조로 씁니다.",
  "문장 첫머리에 결론을 먼저 제시하고, 바로 계산 근거와 관계 장면을 덧붙이세요. 뜬구름 잡는 미사여구·운명론·기계적인 교과서 말투는 피하세요.",
  "서버 계산값만 근거로 쓰고 새로운 점수·합충·용신·미래 시기·상대의 속마음을 만들어내지 마세요.",
  "사주 용어를 쓰면 바로 쉬운 한국어 의미를 붙이세요. WEAK, STRONG, soft signal, confidence 같은 내부 용어는 출력하지 마세요.",
  "A와 B라는 개발자 표기를 사용자 문장에 쓰지 말고 '나', '상대', '두 사람'처럼 자연스럽게 표현하세요.",
  "짧은 카드 문구처럼 끝내지 말고 계산 사실 → 관계에서의 체감 → 실제 장면 또는 행동 기준 순서로 충분히 풀어 쓰세요.",
  "한 문장으로 끝낼 수 있는 내용도 근거와 체감이 다르면 두세 문장으로 나누어 설명하세요. 단, 같은 말을 반복해서 분량만 늘리지 마세요.",
  "각 문단은 이 조합에만 해당하는 계산 근거를 최소 하나 포함해야 하며, 다른 사람에게 그대로 붙여도 되는 일반론만으로 채우지 마세요.",
  "오행의 겉개수와 지장간까지 반영한 실질 세력 비중을 구분하고 단순 개수만으로 좋고 나쁨을 단정하지 마세요.",
  "대운·세운·특정 연도·월의 관계 타이밍은 작성하지 마세요.",
  "상대의 행동을 '반드시', '항상'처럼 단정하지 말고, 계산상 나타나는 경향과 두 사람이 확인할 행동 신호를 구분해 쓰세요.",
  "상대 분석은 독심술이 아니라 '계산 근거 → 관찰 가능한 반응 → 배려할 수 있는 대응' 구조로 쓰세요.",
  "조언은 '더 잘해 보세요'로 끝내지 말고 누가·언제·어떤 말이나 행동을 하면 좋은지 한 번에 실행할 수 있게 쓰세요.",
].join("\n");

function payloadFor(snapshot: CompatibilityCalculationSnapshot, input: OneToOneReportInput) {
  return {
    payloadVersion: PAID_REPORT_V7_PAYLOAD_VERSION,
    facts: buildPaidReportFacts(input),
    evidence: buildReportEvidencePack(snapshot, input),
  };
}

async function generateIntro(apiKey: string, model: string, payloadText: string, relationshipRules: string) {
  return requestStructuredSegment<IntroSegment>({
    apiKey,
    model,
    schema: INTRO_SCHEMA,
    maxTokens: 4400,
    timeoutMs: 90_000,
    preferStructured: false,
    label: "INTRO",
    validate: validIntro,
    qualityIssues: introIssues,
    system: `${BASE_RULES}\n\n${relationshipRules}\n\n[담당 범위: CH0~CH1 기본 진단]\n- overview.detailedSummary: 5~7개의 완결된 문장. 강점, 마찰, 양방향 영향, 실제 관계에서의 핵심 조언을 모두 포함하세요.\n- personA.overallProfile / personB.overallProfile: 각각 5~7문장. 일간 성향과 전체 세력 구조를 관계 행동으로 연결하세요. 두 사람의 문장 구조를 복사하지 마세요.\n- elementAnalysis: 각각 4~6문장. 겉오행 개수와 실질 세력 비중을 구분하고, 과잉·부족이 관계에서 어떤 체감으로 이어지는지 설명하세요.\n- relationshipNeeds: 각각 3~5문장. 필요한 기운이 상대와의 관계에서 어떻게 채워지거나 부담이 되는지 설명하세요.\n- strengths / cautions: 각각 최소 3개. 항목 하나당 한두 문장 분량의 구체적인 관계 행동으로 쓰세요.`,
    user: `다음 계산 근거만 사용해 기본 진단과 두 사람의 기본판을 작성하세요.\n${payloadText}`,
  });
}

async function generateDynamics(apiKey: string, model: string, payloadText: string, relationshipRules: string) {
  return requestStructuredSegment<DynamicsSegment>({
    apiKey,
    model,
    schema: DYNAMICS_SCHEMA,
    maxTokens: 7000,
    timeoutMs: 110_000,
    preferStructured: false,
    label: "DYNAMICS",
    validate: validDynamics,
    qualityIssues: dynamicsIssues,
    system: `${BASE_RULES}\n\n${relationshipRules}\n\n[담당 범위: CH2 상대 해부 + CH3 나의 강점 + 기본 케미]\n- chemistry.overview는 4~5문장, dayMaster/dayBranch/yinYang/elements는 각각 3~4문장으로 계산 의미와 현실 체감을 연결하세요.\n- bondAndFriction.overview는 4~5문장. positiveInteractions와 frictionInteractions는 실제 evidence가 있는 것만 최소 2개씩 우선 작성하고 각 항목을 충분히 풀이하세요.\n- realLifeManifestations는 최소 3개이며 연락, 약속, 감정표현, 의사결정처럼 이 관계 유형에서 실제로 관찰할 장면으로 쓰세요.\n- directionalImpact의 overview/aToB/bToA/beneficialSupply/burdenSupply/asymmetry는 각각 3~5문장. 나→상대와 상대→나를 반드시 구분하고 같은 문장을 뒤집어 쓰지 마세요.\n- partnerDeepDive.outerInnerContrast는 최소 5문장. 겉으로 보이는 반응과 가까운 관계에서 중요해지는 욕구의 차이를 근거와 연결하세요. 숨은 마음을 확정하지 마세요.\n- partnerDeepDive.comfortTriggers / sensitiveTriggers / preferredInteraction은 각각 최소 3개. 항목마다 '어떤 상황에서 → 어떤 반응이 관찰될 수 있는지 → 어떻게 배려할지'가 읽히게 쓰세요.\n- partnerDeepDive.observableScenes는 최소 3개. situation, likelyReaction, considerateResponse를 모두 구체적으로 쓰고 likelyReaction은 가능성 표현을 사용하세요.\n- partnerDeepDive.profileTags는 4~6개, 짧지만 이 조합의 근거와 일치하는 표현만 쓰세요.\n- personalLeverage.topStrengths는 정확히 3개를 우선하세요. whyItWorks와 howToUse를 각각 2~4문장으로 써서 '왜 이 상대에게 통하는지'가 분명해야 합니다.\n- conversationScripts는 최소 2개, 가능하면 3개. 실제로 말할 수 있는 짧은 문장과 피해야 할 말투를 함께 제시하세요. 조종·압박 문구는 금지합니다.\n- backfireHabits는 최소 3개. 내 강점을 과하게 썼을 때의 역효과와 교정 행동을 한 쌍으로 작성하세요.`,
    user: `다음 계산 근거만 사용해 상대 해부, 나의 강점, 두 사람의 케미를 상세 작성하세요.\n${payloadText}`,
  });
}

async function generateAction(apiKey: string, model: string, payloadText: string, relationshipRules: string) {
  return requestStructuredSegment<ActionSegment>({
    apiKey,
    model,
    schema: ACTION_SCHEMA,
    maxTokens: 7000,
    timeoutMs: 110_000,
    preferStructured: false,
    label: "ACTION",
    validate: validAction,
    qualityIssues: actionIssues,
    system: `${BASE_RULES}\n\n${relationshipRules}\n\n[담당 범위: CH4 관계별 전략 + 갈등/미래 조건 + CH8 실행 계획]\n- relationshipFlow.overview/roles/initiative/intimacy는 각각 3~5문장. 위 관계 유형에서 실제로 성립한 관계 단계만 전제로 설명하세요.\n- conflictScenarios는 최소 2개, 가능하면 3개. situation, likelyPattern, response를 충분히 구체화해 상황→반복 패턴→대응 순서가 읽히게 하세요.\n- relationshipSpecific.overview는 4~6문장, points는 최소 4개이며 각 detail은 3~5문장으로 해당 관계 유형에서만 유효한 분석을 쓰세요.\n- situationStrategy.priority는 지금 이 관계에서 가장 먼저 볼 한 가지를 3~4문장으로 설명하세요.\n- situationStrategy.stepByStep은 최소 4단계, 짝사랑/썸은 최대 5단계 권장. 각 단계의 action은 사용자가 실제로 할 행동, watchFor는 상대의 관찰 가능한 반응이어야 합니다.\n- progressSignals와 stopSignals는 각각 최소 2개, 가능하면 3개. 호감·의도·감정을 확정하지 말고 행동 기준으로 작성하세요.\n- strengthsAndRisks.strengths와 repeatedFrictions는 각각 최소 3개. redFlag와 warning은 과장 없이 3~4문장으로 쓰세요.\n- practicalManual.do는 최소 4개, dont는 최소 3개, conflictProtocol은 최소 4단계, recommendedActivities는 최소 3개를 목표로 하세요.\n- actionPlan30.weeks는 반드시 1~4주차 정확히 4개. 각 주차마다 goal, 실행 가능한 action, 스스로 확인할 check를 구체적으로 작성하세요. monthlyDont는 최소 3개입니다.\n- 짝사랑에서는 상대 호감을 확정하거나 연인처럼 갈등 해결을 전제하지 마세요. 썸에서는 교제·독점성을 전제하지 마세요. 친구와 직장동료에는 연애·성적 문구를 넣지 마세요. 직장동료의 활동은 협업 방식·회의·업무 루틴으로 작성하세요.`,
    user: `다음 계산 근거만 사용해 관계별 전략과 실전 행동 계획을 상세 작성하세요.\n${payloadText}`,
  });
}

export async function generatePaidReportSegmentV7(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
  segment: PaidReportSegmentName,
): Promise<PaidReportSegmentResult> {
  if (process.env.REPORT_NARRATIVE_MODE !== "anthropic") {
    throw new Error("PAID_REPORT_SEGMENT_FAILED_MODE_NOT_ANTHROPIC");
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("PAID_REPORT_SEGMENT_FAILED_API_KEY_MISSING");
  const model = process.env.ANTHROPIC_NARRATIVE_MODEL || DEFAULT_REPORT_MODEL;
  const payload = payloadFor(snapshot, input);
  const payloadText = JSON.stringify(payload);
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");
  const relationshipRules = relationshipPromptRules(input.relationshipType);

  try {
    const generated = segment === "intro"
      ? await generateIntro(apiKey, model, payloadText, relationshipRules)
      : segment === "dynamics"
        ? await generateDynamics(apiKey, model, payloadText, relationshipRules)
        : await generateAction(apiKey, model, payloadText, relationshipRules);

    const usage = combineAnthropicUsage(generated.allUsage);

    console.info("[woorigunghap:paid-report-v7-segment]", JSON.stringify({
      segment,
      model,
      relationshipType: input.relationshipType,
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
        provider: "anthropic",
        model,
        promptVersion: PAID_REPORT_V7_PROMPT_VERSION,
        payloadVersion: PAID_REPORT_V7_PAYLOAD_VERSION,
        evidencePackVersion: REPORT_EVIDENCE_PACK_VERSION,
        relationshipEditorialVersion: RELATIONSHIP_EDITORIAL_VERSION,
        attempt: generated.attempts,
        qualityCharacters: generated.best.characters,
        qualityWarnings: generated.best.qualityIssues,
        usage,
        payloadBytes,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    console.warn("[woorigunghap:paid-report-v7-segment-failed]", JSON.stringify({ segment, model, relationshipType: input.relationshipType, reason }));
    throw new Error(`PAID_REPORT_SEGMENT_FAILED_${segment.toUpperCase()}_${reason}`);
  }
}
