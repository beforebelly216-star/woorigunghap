import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";

export const NARRATIVE_PROMPT_VERSION = "narrative-prompt-v2-claude" as const;
export const NARRATIVE_PAYLOAD_VERSION = "narrative-payload-v1" as const;
export const DEFAULT_NARRATIVE_MODEL = "claude-haiku-4-5-20251001" as const;
export const DEFAULT_USD_KRW_COST_RATE = 1450;

const HAIKU_INPUT_USD_PER_MTOK = 1;
const HAIKU_OUTPUT_USD_PER_MTOK = 5;
const MAX_EVIDENCE_DIMENSIONS = 4;
const MAX_EVIDENCE_ARRAY_ITEMS = 6;
const MAX_EVIDENCE_OBJECT_KEYS = 8;
const MAX_EVIDENCE_STRING_LENGTH = 120;

export type CompatibilityNarrative = {
  headline: string;
  summary: string;
  flow: {
    primary: string;
    secondary: string;
    caution: string;
  };
  strengths: {
    first: string;
    second: string;
  };
  adjustments: {
    first: string;
    second: string;
  };
  practicalGuide: {
    first: string;
    second: string;
    third: string;
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
    promptVersion: typeof NARRATIVE_PROMPT_VERSION;
    payloadVersion: typeof NARRATIVE_PAYLOAD_VERSION;
    fallbackReason: string | null;
    usage: NarrativeUsage | null;
    payloadBytes: number;
  };
};

type NarrativeMode = "template" | "anthropic";

type CompactDimension = {
  normalizedScore: number;
  maxPoints: number;
  weightedPoints: number;
};

export type NarrativeAiPayload = {
  payloadVersion: typeof NARRATIVE_PAYLOAD_VERSION;
  relationshipType: CompatibilityCalculationSnapshot["relationshipType"];
  profile: CompatibilityCalculationSnapshot["profile"];
  overall: {
    score: number;
    confidence: CompatibilityCalculationSnapshot["confidence"];
    uncertaintyRange: CompatibilityCalculationSnapshot["uncertaintyRange"];
  };
  dimensions: Record<CompatibilityDimension, CompactDimension>;
  strengths: CompatibilityDimension[];
  adjustmentPoints: CompatibilityDimension[];
  keyEvidence: Partial<Record<CompatibilityDimension, unknown>>;
  aiBoundary: CompatibilityCalculationSnapshot["aiBoundary"];
};

const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "기본 기운의 호흡",
  dayBranch: "생활·정서 리듬",
  usefulGodFit: "필요한 기운의 보완",
  elementComplementarity: "오행 상보성",
  heavenlyStemInteraction: "겉으로 드러나는 결속과 긴장",
  earthlyBranchInteraction: "반복되는 결속·마찰 신호",
  specialStars: "귀인 신호",
  spouseStarRealization: "관계 역할의 맞물림",
  luckCycleAlignment: "대운 동조",
};

const NARRATIVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    flow: {
      type: "object",
      additionalProperties: false,
      properties: {
        primary: { type: "string" },
        secondary: { type: "string" },
        caution: { type: "string" },
      },
      required: ["primary", "secondary", "caution"],
    },
    strengths: {
      type: "object",
      additionalProperties: false,
      properties: {
        first: { type: "string" },
        second: { type: "string" },
      },
      required: ["first", "second"],
    },
    adjustments: {
      type: "object",
      additionalProperties: false,
      properties: {
        first: { type: "string" },
        second: { type: "string" },
      },
      required: ["first", "second"],
    },
    practicalGuide: {
      type: "object",
      additionalProperties: false,
      properties: {
        first: { type: "string" },
        second: { type: "string" },
        third: { type: "string" },
      },
      required: ["first", "second", "third"],
    },
  },
  required: ["headline", "summary", "flow", "strengths", "adjustments", "practicalGuide"],
} as const;

const FORBIDDEN_AI_KEYS = new Set([
  "displayName",
  "birthDate",
  "birthTime",
  "paymentId",
  "orderId",
  "input",
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
  if (depth >= 3) return undefined;

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

function uniqueKeyDimensions(snapshot: CompatibilityCalculationSnapshot) {
  const ordered = [...snapshot.strengths, ...snapshot.adjustmentPoints];
  return ordered.filter((dimension, index) => ordered.indexOf(dimension) === index)
    .slice(0, MAX_EVIDENCE_DIMENSIONS);
}

export function buildNarrativeAiPayload(
  snapshot: CompatibilityCalculationSnapshot,
): NarrativeAiPayload {
  const dimensions = {} as Record<CompatibilityDimension, CompactDimension>;
  for (const [dimension, result] of Object.entries(snapshot.dimensions) as Array<[
    CompatibilityDimension,
    CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension],
  ]>) {
    dimensions[dimension] = {
      normalizedScore: result.normalizedScore,
      maxPoints: result.maxPoints,
      weightedPoints: result.weightedPoints,
    };
  }

  const keyEvidence: Partial<Record<CompatibilityDimension, unknown>> = {};
  for (const dimension of uniqueKeyDimensions(snapshot)) {
    keyEvidence[dimension] = compactEvidence(snapshot.representativeEvidence[dimension]);
  }

  const payload: NarrativeAiPayload = {
    payloadVersion: NARRATIVE_PAYLOAD_VERSION,
    relationshipType: snapshot.relationshipType,
    profile: snapshot.profile,
    overall: {
      score: snapshot.score,
      confidence: snapshot.confidence,
      uncertaintyRange: snapshot.uncertaintyRange,
    },
    dimensions,
    strengths: snapshot.strengths,
    adjustmentPoints: snapshot.adjustmentPoints,
    keyEvidence,
    aiBoundary: snapshot.aiBoundary,
  };

  if (containsForbiddenKey(payload)) {
    throw new Error("AI 전달용 compact payload에 금지된 개인정보 키가 포함되어 있습니다.");
  }
  return payload;
}

function relationshipLabel(snapshot: CompatibilityCalculationSnapshot) {
  const labels: Record<CompatibilityCalculationSnapshot["relationshipType"], string> = {
    crush: "짝사랑",
    flirting: "썸",
    lover: "연인",
    friend: "친구",
    coworker: "직장동료",
  };
  return labels[snapshot.relationshipType];
}

function confidenceCopy(snapshot: CompatibilityCalculationSnapshot) {
  if (snapshot.confidence === "high") return "현재 입력에서는 점수 변동폭이 작아 방향성이 비교적 선명해요.";
  if (snapshot.confidence === "medium") return "출생시간 등 입력 불확실성 때문에 세부 강도는 조금 달라질 수 있어요.";
  return "입력 불확실성이 커서 세부 해석은 단정하기보다 방향성 중심으로 보는 게 좋아요.";
}

export function buildTemplateNarrative(
  snapshot: CompatibilityCalculationSnapshot,
): CompatibilityNarrative {
  const firstStrength = snapshot.strengths[0];
  const secondStrength = snapshot.strengths[1] ?? firstStrength;
  const firstAdjustment = snapshot.adjustmentPoints[0];
  const secondAdjustment = snapshot.adjustmentPoints[1] ?? firstAdjustment;
  const relation = relationshipLabel(snapshot);

  return {
    headline: `${relation} 관계에서 강점과 조율 포인트가 함께 보이는 궁합이에요.`,
    summary: `종합적으로는 ${snapshot.score}점으로 계산됐어요. ${DIMENSION_LABELS[firstStrength]}과 ${DIMENSION_LABELS[secondStrength]}이 상대적인 강점으로 잡혔고, ${DIMENSION_LABELS[firstAdjustment]}은 조금 더 의식해서 맞춰갈 필요가 있어요. ${confidenceCopy(snapshot)}`,
    flow: {
      primary: `${DIMENSION_LABELS[firstStrength]}이 두 사람 관계의 가장 편한 축이에요. 이 부분에서 자연스럽게 통하는 방식을 실제 관계에서 자주 활용해 보세요.`,
      secondary: `${DIMENSION_LABELS[secondStrength]}도 강점으로 잡혀요. 잘 맞는 방식이 무엇인지 구체적인 행동으로 확인할수록 장점을 살리기 쉬워요.`,
      caution: `${DIMENSION_LABELS[firstAdjustment]}은 상대적으로 조율이 필요한 영역이에요. 낮은 점수는 관계의 실패를 뜻하지 않고 차이가 반복될 수 있다는 신호로 봐요.`,
    },
    strengths: {
      first: `${DIMENSION_LABELS[firstStrength]}에서 두 사람의 호흡이 상대적으로 좋아요.`,
      second: `${DIMENSION_LABELS[secondStrength]}도 관계를 편하게 만드는 보조 강점이에요.`,
    },
    adjustments: {
      first: `${DIMENSION_LABELS[firstAdjustment]}에서는 상대의 방식을 내 기준으로 단정하기보다 실제 행동을 확인하는 게 좋아요.`,
      second: `${DIMENSION_LABELS[secondAdjustment]}에서 차이가 느껴질 때는 성격 평가보다 구체적인 상황과 기대치를 말로 맞춰 보세요.`,
    },
    practicalGuide: {
      first: "잘 맞는 영역은 당연하게 넘기지 말고 두 사람이 편했던 행동 패턴을 반복해 보세요.",
      second: "조율이 필요한 영역에서는 연락 빈도, 역할, 약속처럼 구체적인 기준을 먼저 맞추는 편이 좋아요.",
      third: "이 결과는 관계의 성공 여부를 예언하는 값이 아니라 서로의 차이를 이해하기 위한 참고 지표로 활용해 주세요.",
    },
  };
}

function isNarrative(value: unknown): value is CompatibilityNarrative {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const root = value as Record<string, unknown>;
  const hasString = (obj: unknown, key: string) => (
    !!obj && typeof obj === "object" && !Array.isArray(obj) &&
    typeof (obj as Record<string, unknown>)[key] === "string"
  );

  return (
    typeof root.headline === "string" &&
    typeof root.summary === "string" &&
    hasString(root.flow, "primary") &&
    hasString(root.flow, "secondary") &&
    hasString(root.flow, "caution") &&
    hasString(root.strengths, "first") &&
    hasString(root.strengths, "second") &&
    hasString(root.adjustments, "first") &&
    hasString(root.adjustments, "second") &&
    hasString(root.practicalGuide, "first") &&
    hasString(root.practicalGuide, "second") &&
    hasString(root.practicalGuide, "third")
  );
}

type AnthropicUsageShape = {
  input_tokens?: unknown;
  output_tokens?: unknown;
  cache_creation_input_tokens?: unknown;
  cache_read_input_tokens?: unknown;
};

function positiveInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
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

  // 현재 우리궁합 요청은 prompt caching을 사용하지 않는다. 따라서 표준 입력/출력 토큰만 비용에 반영한다.
  // cache token이 생기는 구조로 바뀌면 해당 시점에 cache 전용 단가를 별도로 추가한다.
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
    if (candidate.type === "text" && typeof candidate.text === "string") {
      texts.push(candidate.text);
    }
  }
  return texts.length ? texts.join("") : null;
}

async function generateWithAnthropic(snapshot: CompatibilityCalculationSnapshot) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY_MISSING");

  const model = process.env.ANTHROPIC_NARRATIVE_MODEL?.trim() || DEFAULT_NARRATIVE_MODEL;
  const payload = buildNarrativeAiPayload(snapshot);
  const payloadText = JSON.stringify(payload);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

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
        max_tokens: 900,
        system: [
          "당신은 우리궁합 리포트의 한국어 편집자입니다.",
          "입력으로 주어진 compact compatibility payload의 계산값과 근거만 사용하세요.",
          "새 점수, 새 순위, 새로운 사주 사실을 만들지 마세요.",
          "점수의 좋고 나쁨을 과장하거나 관계 성공/실패를 단정적으로 예언하지 마세요.",
          "confidence가 낮거나 uncertaintyRange가 넓으면 해석 강도를 낮추세요.",
          "강점과 조정 포인트의 keyEvidence가 있으면 이를 우선 활용하되 없는 사실을 추측하지 마세요.",
          "사용자에게 읽기 쉬운 자연스러운 한국어로 쓰고, 같은 표현을 반복하지 마세요.",
          "출력 JSON에는 숫자 점수 필드를 새로 만들지 마세요. 점수는 서버 UI가 별도로 표시합니다.",
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

    if (!response.ok) {
      throw new Error(`ANTHROPIC_HTTP_${response.status}`);
    }

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

    console.info("[woorigunghap:narrative-cost]", JSON.stringify({
      provider: "anthropic",
      model,
      promptVersion: NARRATIVE_PROMPT_VERSION,
      payloadVersion: NARRATIVE_PAYLOAD_VERSION,
      payloadBytes: Buffer.byteLength(payloadText, "utf8"),
      usage,
    }));

    return {
      narrative: parsed,
      model,
      usage,
      payloadBytes: Buffer.byteLength(payloadText, "utf8"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCompatibilityNarrative(
  snapshot: CompatibilityCalculationSnapshot,
  options?: { modeOverride?: NarrativeMode },
): Promise<NarrativeGenerationResult> {
  const configuredMode = process.env.REPORT_NARRATIVE_MODE === "anthropic"
    ? "anthropic"
    : "template";
  const mode = options?.modeOverride ?? configuredMode;
  const payloadBytes = Buffer.byteLength(JSON.stringify(buildNarrativeAiPayload(snapshot)), "utf8");

  if (mode === "template") {
    return {
      narrative: buildTemplateNarrative(snapshot),
      meta: {
        mode: "template",
        provider: "template",
        model: null,
        promptVersion: NARRATIVE_PROMPT_VERSION,
        payloadVersion: NARRATIVE_PAYLOAD_VERSION,
        fallbackReason: null,
        usage: null,
        payloadBytes,
      },
    };
  }

  try {
    const generated = await generateWithAnthropic(snapshot);
    return {
      narrative: generated.narrative,
      meta: {
        mode: "anthropic",
        provider: "anthropic",
        model: generated.model,
        promptVersion: NARRATIVE_PROMPT_VERSION,
        payloadVersion: NARRATIVE_PAYLOAD_VERSION,
        fallbackReason: null,
        usage: generated.usage,
        payloadBytes: generated.payloadBytes,
      },
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : "ANTHROPIC_UNKNOWN_ERROR";
    return {
      narrative: buildTemplateNarrative(snapshot),
      meta: {
        mode: "template",
        provider: "template",
        model: null,
        promptVersion: NARRATIVE_PROMPT_VERSION,
        payloadVersion: NARRATIVE_PAYLOAD_VERSION,
        fallbackReason,
        usage: null,
        payloadBytes,
      },
    };
  }
}
