import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";

export const NARRATIVE_PROMPT_VERSION = "narrative-prompt-v1" as const;
export const DEFAULT_NARRATIVE_MODEL = "gpt-5-mini" as const;

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

export type NarrativeGenerationResult = {
  narrative: CompatibilityNarrative;
  meta: {
    mode: "template" | "openai";
    model: string | null;
    promptVersion: typeof NARRATIVE_PROMPT_VERSION;
    fallbackReason: string | null;
  };
};

type NarrativeMode = "template" | "openai";

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
]);

function containsForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_AI_KEYS.has(key) || containsForbiddenKey(child)
  ));
}

export function buildNarrativeAiPayload(snapshot: CompatibilityCalculationSnapshot) {
  const payload: CompatibilityCalculationSnapshot = structuredClone(snapshot);
  if (containsForbiddenKey(payload)) {
    throw new Error("AI 전달용 calculationSnapshot에 금지된 개인정보 키가 포함되어 있습니다.");
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

function extractResponseText(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const output = (value as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object" || Array.isArray(part)) continue;
      const candidate = part as { type?: unknown; text?: unknown };
      if (candidate.type === "output_text" && typeof candidate.text === "string") {
        texts.push(candidate.text);
      }
    }
  }
  return texts.length ? texts.join("") : null;
}

async function generateWithOpenAi(snapshot: CompatibilityCalculationSnapshot) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const model = process.env.OPENAI_NARRATIVE_MODEL?.trim() || DEFAULT_NARRATIVE_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 900,
        instructions: [
          "당신은 우리궁합 리포트의 한국어 편집자입니다.",
          "입력으로 주어진 calculationSnapshot의 계산값과 근거만 사용하세요.",
          "새 점수, 새 순위, 새로운 사주 사실을 만들지 마세요.",
          "점수의 좋고 나쁨을 과장하거나 관계 성공/실패를 단정적으로 예언하지 마세요.",
          "confidence가 낮거나 uncertaintyRange가 넓으면 해석 강도를 낮추세요.",
          "사용자에게 읽기 쉬운 자연스러운 한국어로 쓰되 뜬구름 잡는 일반론을 피하세요.",
          "출력 JSON에는 숫자 점수 필드를 만들지 마세요. 점수는 서버 UI가 별도로 표시합니다.",
        ].join("\n"),
        input: JSON.stringify(buildNarrativeAiPayload(snapshot)),
        text: {
          format: {
            type: "json_schema",
            name: "woorigunghap_narrative_v1",
            description: "우리궁합 1:1 결과 화면용 자연어 서술",
            strict: true,
            schema: NARRATIVE_SCHEMA,
          },
          verbosity: "low",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OPENAI_HTTP_${response.status}`);
    }

    const body: unknown = await response.json();
    const outputText = extractResponseText(body);
    if (!outputText) throw new Error("OPENAI_EMPTY_OUTPUT");

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error("OPENAI_INVALID_JSON");
    }
    if (!isNarrative(parsed)) throw new Error("OPENAI_SCHEMA_MISMATCH");

    return { narrative: parsed, model };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateCompatibilityNarrative(
  snapshot: CompatibilityCalculationSnapshot,
  options?: { modeOverride?: NarrativeMode },
): Promise<NarrativeGenerationResult> {
  const configuredMode = process.env.REPORT_NARRATIVE_MODE === "openai" ? "openai" : "template";
  const mode = options?.modeOverride ?? configuredMode;

  if (mode === "template") {
    return {
      narrative: buildTemplateNarrative(snapshot),
      meta: {
        mode: "template",
        model: null,
        promptVersion: NARRATIVE_PROMPT_VERSION,
        fallbackReason: null,
      },
    };
  }

  try {
    const generated = await generateWithOpenAi(snapshot);
    return {
      narrative: generated.narrative,
      meta: {
        mode: "openai",
        model: generated.model,
        promptVersion: NARRATIVE_PROMPT_VERSION,
        fallbackReason: null,
      },
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : "OPENAI_UNKNOWN_ERROR";
    return {
      narrative: buildTemplateNarrative(snapshot),
      meta: {
        mode: "template",
        model: null,
        promptVersion: NARRATIVE_PROMPT_VERSION,
        fallbackReason,
      },
    };
  }
}
