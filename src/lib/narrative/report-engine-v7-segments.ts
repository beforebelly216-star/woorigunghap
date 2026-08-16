import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { OneToOneReportInput } from "@/lib/report-input";
import {
  DEFAULT_REPORT_MODEL,
  REPORT_EVIDENCE_PACK_VERSION,
  buildReportEvidencePack,
  calculateAnthropicUsageCost,
  type NarrativeUsage,
} from "@/lib/narrative/report-engine";
import {
  buildPaidReportFacts,
  type DetailedReportContent,
  type PaidReportFacts,
} from "@/lib/narrative/report-engine-v5";

export const PAID_REPORT_V7_PROMPT_VERSION = "paid-report-v7-resumable-segments" as const;
export const PAID_REPORT_V7_PAYLOAD_VERSION = "paid-report-evidence-v4" as const;
export type PaidReportSegmentName = "intro" | "dynamics" | "action";

export type IntroSegment = Pick<DetailedReportContent, "overview" | "personA" | "personB">;
export type DynamicsSegment = Pick<DetailedReportContent, "chemistry" | "bondAndFriction" | "directionalImpact">;
export type ActionSegment = Pick<DetailedReportContent, "relationshipFlow" | "relationshipSpecific" | "strengthsAndRisks" | "practicalManual">;
export type PaidReportSegment = IntroSegment | DynamicsSegment | ActionSegment;

export type PaidReportSegmentMeta = {
  provider: "anthropic";
  model: string;
  promptVersion: typeof PAID_REPORT_V7_PROMPT_VERSION;
  payloadVersion: typeof PAID_REPORT_V7_PAYLOAD_VERSION;
  evidencePackVersion: typeof REPORT_EVIDENCE_PACK_VERSION;
  segment: PaidReportSegmentName;
  characters: number;
  usage: NarrativeUsage | null;
  payloadBytes: number;
};

export type PaidReportSegmentResult = {
  segment: PaidReportSegmentName;
  content: PaidReportSegment;
  facts: PaidReportFacts;
  meta: PaidReportSegmentMeta;
};

type AnthropicUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type AnthropicBody = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: AnthropicUsage;
  error?: { type?: string; message?: string };
  stop_reason?: string | null;
};

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
    overview: { type: "string" }, dayMaster: { type: "string" }, dayBranch: { type: "string" },
    yinYang: { type: "string" }, elements: { type: "string" },
  }),
  bondAndFriction: objectSchema({
    overview: { type: "string" }, positiveInteractions: STRING_ARRAY,
    frictionInteractions: STRING_ARRAY, realLifeManifestations: STRING_ARRAY,
  }),
  directionalImpact: objectSchema({
    overview: { type: "string" }, aToB: { type: "string" }, bToA: { type: "string" },
    beneficialSupply: { type: "string" }, burdenSupply: { type: "string" }, asymmetry: { type: "string" },
  }),
});
const ACTION_SCHEMA = objectSchema({
  relationshipFlow: objectSchema({
    overview: { type: "string" }, roles: { type: "string" }, initiative: { type: "string" }, intimacy: { type: "string" },
    conflictScenarios: {
      type: "array",
      items: objectSchema({ situation: { type: "string" }, likelyPattern: { type: "string" }, response: { type: "string" } }),
    },
  }),
  relationshipSpecific: objectSchema({
    overview: { type: "string" },
    points: { type: "array", items: objectSchema({ title: { type: "string" }, detail: { type: "string" } }) },
  }),
  strengthsAndRisks: objectSchema({
    strengths: STRING_ARRAY, repeatedFrictions: STRING_ARRAY, redFlag: { type: "string" }, warning: { type: "string" },
  }),
  practicalManual: objectSchema({
    do: STRING_ARRAY, dont: STRING_ARRAY, conflictProtocol: STRING_ARRAY, recommendedActivities: STRING_ARRAY,
  }),
});

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function hasString(obj: Record<string, unknown>, key: string) { return typeof obj[key] === "string" && (obj[key] as string).trim().length > 0; }
function hasArray(obj: Record<string, unknown>, key: string) { return Array.isArray(obj[key]); }
function validPerson(value: unknown) {
  return isObject(value) && hasString(value, "overallProfile") && hasString(value, "elementAnalysis") && hasString(value, "relationshipNeeds") && hasArray(value, "strengths") && hasArray(value, "cautions");
}
function validIntro(value: unknown): value is IntroSegment {
  return isObject(value) && isObject(value.overview) && hasString(value.overview, "headline") && hasString(value.overview, "detailedSummary") && validPerson(value.personA) && validPerson(value.personB);
}
function validDynamics(value: unknown): value is DynamicsSegment {
  if (!isObject(value) || !isObject(value.chemistry) || !isObject(value.bondAndFriction) || !isObject(value.directionalImpact)) return false;
  return ["overview", "dayMaster", "dayBranch", "yinYang", "elements"].every((key) => hasString(value.chemistry as Record<string, unknown>, key))
    && hasString(value.bondAndFriction, "overview") && hasArray(value.bondAndFriction, "positiveInteractions") && hasArray(value.bondAndFriction, "frictionInteractions") && hasArray(value.bondAndFriction, "realLifeManifestations")
    && ["overview", "aToB", "bToA", "beneficialSupply", "burdenSupply", "asymmetry"].every((key) => hasString(value.directionalImpact as Record<string, unknown>, key));
}
function validAction(value: unknown): value is ActionSegment {
  if (!isObject(value) || !isObject(value.relationshipFlow) || !isObject(value.relationshipSpecific) || !isObject(value.strengthsAndRisks) || !isObject(value.practicalManual)) return false;
  return ["overview", "roles", "initiative", "intimacy"].every((key) => hasString(value.relationshipFlow as Record<string, unknown>, key))
    && hasArray(value.relationshipFlow, "conflictScenarios")
    && hasString(value.relationshipSpecific, "overview") && hasArray(value.relationshipSpecific, "points")
    && hasArray(value.strengthsAndRisks, "strengths") && hasArray(value.strengthsAndRisks, "repeatedFrictions") && hasString(value.strengthsAndRisks, "redFlag") && hasString(value.strengthsAndRisks, "warning")
    && hasArray(value.practicalManual, "do") && hasArray(value.practicalManual, "dont") && hasArray(value.practicalManual, "conflictProtocol") && hasArray(value.practicalManual, "recommendedActivities");
}

function collectCharacters(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, child) => sum + collectCharacters(child), 0);
  if (isObject(value)) return Object.values(value).reduce<number>((sum, child) => sum + collectCharacters(child), 0);
  return 0;
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  try {
    return JSON.parse(unfenced);
  } catch {
    const first = unfenced.indexOf("{");
    const last = unfenced.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(unfenced.slice(first, last + 1));
    throw new Error("AI_FORMAT_INVALID_JSON");
  }
}

function safeErrorType(body: AnthropicBody | null) {
  return body?.error?.type?.replace(/[^A-Z0-9_-]/gi, "_").toUpperCase() ?? "UNKNOWN";
}

function baseRules() {
  return [
    "당신은 '우리궁합'의 1,000원 유료 관계 사주 리포트를 쓰는 한국어 전문 편집자입니다.",
    "서버 계산값만 근거로 쓰고 새로운 점수, 합충, 용신, 미래 시기, 상대 속마음을 만들어내지 마세요.",
    "WEAK, STRONG, soft signal, confidence, A/B 같은 내부 표현을 사용자 문장에 쓰지 마세요.",
    "사주 용어를 쓸 때는 바로 쉬운 한국어 뜻을 붙이세요.",
    "짧은 카드 문구가 아니라 계산 사실 → 실제 관계에서 체감되는 의미 → 행동 기준 순서로 충분히 설명하세요.",
    "오행 겉개수와 지장간까지 반영한 실질 세력 비중은 서로 다른 정보이며 단순 개수만으로 좋고 나쁨을 단정하지 마세요.",
    "대운·세운·특정 연도·월의 관계 타이밍은 작성하지 마세요.",
  ].join("\n");
}

function segmentSpec(segment: PaidReportSegmentName) {
  if (segment === "intro") return {
    schema: INTRO_SCHEMA,
    maxTokens: 3800,
    minChars: 1200,
    instructions: "첫 화면 총평과 두 사람 각각의 관계 원국을 작성하세요. detailedSummary는 4~5문장. 나와 상대의 개인 해설은 각각 기본 성향, 오행 과부족 의미, 관계에서 필요한 기운, 장점과 주의점을 충분한 문단으로 작성하세요. 두 사람 문장을 복사하지 마세요.",
    validate: validIntro as (value: unknown) => value is PaidReportSegment,
  };
  if (segment === "dynamics") return {
    schema: DYNAMICS_SCHEMA,
    maxTokens: 3800,
    minChars: 1100,
    instructions: "두 사람의 기본 케미, 실제 결속과 마찰, 양방향 영향을 작성하세요. 일간·일지·음양·오행 각각의 계산 의미와 현실 체감을 연결하고, 합충형해파·귀인 신호는 evidence에 실제 있는 것만 사용하세요. 나→상대와 상대→나는 반드시 따로 설명하고 실제 생활 장면을 최소 2개 포함하세요.",
    validate: validDynamics as (value: unknown) => value is PaidReportSegment,
  };
  return {
    schema: ACTION_SCHEMA,
    maxTokens: 4600,
    minChars: 1400,
    instructions: "관계 흐름, 관계유형 전용 분석, 강점·위험신호, 실전 매뉴얼을 작성하세요. 현실 갈등 시나리오 최소 2개를 상황→반복 패턴→대응 순서로 쓰고, 관계유형 전용 포인트 최소 3개, 하면 좋은 것 최소 3개, 피할 것 최소 2개, 갈등 해결 단계 최소 3개, 추천 활동 최소 3개를 구체적으로 제시하세요.",
    validate: validAction as (value: unknown) => value is PaidReportSegment,
  };
}

function buildPayload(snapshot: CompatibilityCalculationSnapshot, input: OneToOneReportInput) {
  return {
    payloadVersion: PAID_REPORT_V7_PAYLOAD_VERSION,
    facts: buildPaidReportFacts(input),
    evidence: buildReportEvidencePack(snapshot, input),
  };
}

export async function generatePaidReportSegmentV7(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
  segment: PaidReportSegmentName,
): Promise<PaidReportSegmentResult> {
  if (process.env.REPORT_NARRATIVE_MODE !== "anthropic") throw new Error("AI_MODE_NOT_ANTHROPIC");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");
  const model = process.env.ANTHROPIC_NARRATIVE_MODEL || DEFAULT_REPORT_MODEL;
  const payload = buildPayload(snapshot, input);
  const payloadText = JSON.stringify(payload);
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");
  const spec = segmentSpec(segment);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);
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
        max_tokens: spec.maxTokens,
        system: `${baseRules()}\n\n[이번 요청 범위]\n${spec.instructions}\n\n[JSON 출력 규칙]\n아래 JSON Schema와 같은 키 구조의 JSON 객체 하나만 출력하세요. 마크다운 코드펜스와 앞뒤 설명은 쓰지 마세요. 각 문자열은 충분히 자세한 한국어로 작성하세요.\n${JSON.stringify(spec.schema)}`,
        messages: [{ role: "user", content: `다음 계산 근거만 사용해 ${segment} 구간을 작성하세요.\n${payloadText}` }],
      }),
    });
    const body = await response.json().catch(() => null) as AnthropicBody | null;
    if (!response.ok) throw new Error(`ANTHROPIC_HTTP_${response.status}_${safeErrorType(body)}`);
    if (body?.stop_reason === "max_tokens") throw new Error("AI_OUTPUT_TRUNCATED");
    const text = body?.content?.find((item) => item.type === "text" && typeof item.text === "string")?.text;
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    const parsed = parseJsonObject(text);
    if (!spec.validate(parsed)) throw new Error("AI_FORMAT_SCHEMA_MISMATCH");
    const characters = collectCharacters(parsed);
    const usage = body?.usage ? calculateAnthropicUsageCost({
      input_tokens: body.usage.input_tokens ?? 0,
      output_tokens: body.usage.output_tokens ?? 0,
      cache_creation_input_tokens: body.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: body.usage.cache_read_input_tokens ?? 0,
    }) : null;

    console.info("[woorigunghap:paid-report-v7-segment]", JSON.stringify({ segment, model, characters, minChars: spec.minChars, payloadBytes, usage }));
    return {
      segment,
      content: parsed,
      facts: payload.facts,
      meta: {
        provider: "anthropic",
        model,
        promptVersion: PAID_REPORT_V7_PROMPT_VERSION,
        payloadVersion: PAID_REPORT_V7_PAYLOAD_VERSION,
        evidencePackVersion: REPORT_EVIDENCE_PACK_VERSION,
        segment,
        characters,
        usage,
        payloadBytes,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("API_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
