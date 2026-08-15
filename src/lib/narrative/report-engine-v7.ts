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
import { requestStructuredSegment } from "@/lib/narrative/report-engine-v6-request";

export const PAID_REPORT_V7_PROMPT_VERSION = "paid-report-v7-resumable-segments" as const;
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
});

export type IntroSegment = Pick<DetailedReportContent, "overview" | "personA" | "personB">;
export type DynamicsSegment = Pick<DetailedReportContent, "chemistry" | "bondAndFriction" | "directionalImpact">;
export type ActionSegment = Pick<DetailedReportContent, "relationshipFlow" | "relationshipSpecific" | "strengthsAndRisks" | "practicalManual">;
export type PaidReportSegmentContent = IntroSegment | DynamicsSegment | ActionSegment;

export type PaidReportSegmentMeta = {
  provider: "anthropic";
  model: string;
  promptVersion: typeof PAID_REPORT_V7_PROMPT_VERSION;
  payloadVersion: typeof PAID_REPORT_V7_PAYLOAD_VERSION;
  evidencePackVersion: typeof REPORT_EVIDENCE_PACK_VERSION;
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
    && ["overview", "aToB", "bToA", "beneficialSupply", "burdenSupply", "asymmetry"].every((key) => hasString(value.directionalImpact as Record<string, unknown>, key));
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
    && hasArray(value.practicalManual, "recommendedActivities");
}

function compactLength(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, child) => sum + compactLength(child), 0);
  if (isObject(value)) return Object.values(value).reduce<number>((sum, child) => sum + compactLength(child), 0);
  return 0;
}
function introIssues(value: IntroSegment) {
  const issues: string[] = [];
  if (compactLength(value) < 1300) issues.push("INTRO_SHORT");
  if (value.overview.detailedSummary.length < 220) issues.push("SUMMARY_SHORT");
  if (compactLength(value.personA) < 480) issues.push("PERSON_A_SHORT");
  if (compactLength(value.personB) < 480) issues.push("PERSON_B_SHORT");
  return issues;
}
function dynamicsIssues(value: DynamicsSegment) {
  const issues: string[] = [];
  if (compactLength(value) < 1200) issues.push("DYNAMICS_SHORT");
  if (value.bondAndFriction.realLifeManifestations.length < 2) issues.push("REAL_LIFE_CASES_SHORT");
  return issues;
}
function actionIssues(value: ActionSegment) {
  const issues: string[] = [];
  if (compactLength(value) < 1400) issues.push("ACTION_SHORT");
  if (value.relationshipFlow.conflictScenarios.length < 2) issues.push("CONFLICT_CASES_SHORT");
  if (value.relationshipSpecific.points.length < 3) issues.push("RELATION_SPECIFIC_SHORT");
  if (value.practicalManual.do.length < 3 || value.practicalManual.conflictProtocol.length < 3) issues.push("MANUAL_SHORT");
  return issues;
}

const BASE_RULES = [
  "당신은 '우리궁합'의 1,000원 유료 관계 사주 리포트를 쓰는 한국어 전문 편집자입니다.",
  "서버 계산값만 근거로 쓰고 새로운 점수·합충·용신·미래 시기·상대의 속마음을 만들어내지 마세요.",
  "사주 용어를 쓰면 바로 쉬운 한국어 의미를 붙이세요. WEAK, STRONG, soft signal, confidence 같은 내부 용어는 출력하지 마세요.",
  "A와 B라는 개발자 표기를 사용자 문장에 쓰지 말고 '나', '상대', '두 사람'처럼 자연스럽게 표현하세요.",
  "짧은 카드 문구처럼 끝내지 말고 계산 사실 → 관계에서의 체감 → 실제 장면 또는 행동 기준 순서로 충분히 풀어 쓰세요.",
  "오행의 겉개수와 지장간까지 반영한 실질 세력 비중을 구분하고 단순 개수만으로 좋고 나쁨을 단정하지 마세요.",
  "대운·세운·특정 연도·월의 관계 타이밍은 작성하지 마세요.",
].join("\n");

function payloadFor(snapshot: CompatibilityCalculationSnapshot, input: OneToOneReportInput) {
  return {
    payloadVersion: PAID_REPORT_V7_PAYLOAD_VERSION,
    facts: buildPaidReportFacts(input),
    evidence: buildReportEvidencePack(snapshot, input),
  };
}

async function generateIntro(apiKey: string, model: string, payloadText: string) {
  return requestStructuredSegment<IntroSegment>({
    apiKey,
    model,
    schema: INTRO_SCHEMA,
    maxTokens: 3200,
    timeoutMs: 90_000,
    preferStructured: false,
    label: "INTRO",
    validate: validIntro,
    qualityIssues: introIssues,
    system: `${BASE_RULES}\n\n[담당 범위] 첫 화면 총평과 두 사람 각각의 관계 원국을 작성합니다. 총평은 4~5개의 완결된 문장으로 강점·마찰·양방향 영향·실전 의미를 연결하세요. 나와 상대의 개인 해설은 각각 기본 성향, 오행 과부족의 의미, 관계에서 필요한 기운, 장점과 주의점을 합쳐 충분한 단락으로 작성하세요. 두 사람의 문장 구조를 복사하지 마세요.`,
    user: `다음 계산 근거만 사용해 리포트의 1~3장을 작성하세요.\n${payloadText}`,
  });
}

async function generateDynamics(apiKey: string, model: string, payloadText: string) {
  return requestStructuredSegment<DynamicsSegment>({
    apiKey,
    model,
    schema: DYNAMICS_SCHEMA,
    maxTokens: 3200,
    timeoutMs: 90_000,
    preferStructured: false,
    label: "DYNAMICS",
    validate: validDynamics,
    qualityIssues: dynamicsIssues,
    system: `${BASE_RULES}\n\n[담당 범위] 두 사람의 기본 케미, 실제 결속과 마찰, 양방향 영향을 작성합니다. 일간·일지·음양·오행은 각각 계산 의미와 현실 체감을 연결하세요. 천간·지지의 합충형해파 및 귀인 신호는 evidence에 실제로 있는 것만 언급하고 대화·생활리듬·약속·감정표현·의사결정 중 어디서 드러날 수 있는지 구체화하세요. 나→상대와 상대→나는 반드시 따로 설명하세요.`,
    user: `다음 계산 근거만 사용해 리포트의 4~6장을 작성하세요.\n${payloadText}`,
  });
}

async function generateAction(apiKey: string, model: string, payloadText: string) {
  return requestStructuredSegment<ActionSegment>({
    apiKey,
    model,
    schema: ACTION_SCHEMA,
    maxTokens: 4200,
    timeoutMs: 90_000,
    preferStructured: false,
    label: "ACTION",
    validate: validAction,
    qualityIssues: actionIssues,
    system: `${BASE_RULES}\n\n[담당 범위] 관계 흐름, 관계유형 전용 분석, 강점·위험신호, 실전 매뉴얼을 작성합니다. 최소 2개의 현실 갈등 시나리오를 상황→반복 패턴→대응 순서로 쓰세요. 관계유형 전용 포인트는 최소 3개, 하면 좋은 것은 최소 3개, 피할 것은 최소 2개, 갈등 해결 단계는 최소 3개, 추천 활동은 최소 3개를 구체적으로 제시하세요.`,
    user: `다음 계산 근거만 사용해 리포트의 7~10장을 작성하세요.\n${payloadText}`,
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

  try {
    const generated = segment === "intro"
      ? await generateIntro(apiKey, model, payloadText)
      : segment === "dynamics"
        ? await generateDynamics(apiKey, model, payloadText)
        : await generateAction(apiKey, model, payloadText);

    const usage = generated.best.usage
      ? (await import("@/lib/narrative/report-engine")).calculateAnthropicUsageCost(generated.best.usage)
      : null;

    console.info("[woorigunghap:paid-report-v7-segment]", JSON.stringify({
      segment,
      model,
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
        attempt: generated.attempts,
        qualityCharacters: generated.best.characters,
        qualityWarnings: generated.best.qualityIssues,
        usage,
        payloadBytes,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "UNKNOWN";
    console.warn("[woorigunghap:paid-report-v7-segment-failed]", JSON.stringify({ segment, model, reason }));
    throw new Error(`PAID_REPORT_SEGMENT_FAILED_${segment.toUpperCase()}_${reason}`);
  }
}
