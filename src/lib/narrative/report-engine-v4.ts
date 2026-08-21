import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { OneToOneReportInput } from "@/lib/report-input";
import {
  DEFAULT_REPORT_MODEL,
  REPORT_EVIDENCE_PACK_VERSION,
  buildReportEvidencePack,
  buildTemplateNarrative,
  calculateAnthropicUsageCost,
  type CompatibilityNarrative,
  type NarrativeGenerationResult,
} from "@/lib/narrative/report-engine";

export const REPORT_PROMPT_VERSION_V4 = "report-prompt-v4-paid-detailed" as const;

const ANTHROPIC_TIMEOUT_MS = 90_000;
const MAX_OUTPUT_TOKENS = 4_500;

const NARRATIVE_SCHEMA_V4 = {
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

function isStringRecord(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return keys.every((key) => typeof record[key] === "string" && record[key].trim().length > 0);
}

function isNarrative(value: unknown): value is CompatibilityNarrative {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const root = value as Record<string, unknown>;
  return (
    typeof root.headline === "string" && root.headline.trim().length > 0 &&
    typeof root.summary === "string" && root.summary.trim().length > 0 &&
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

function extractAnthropicText(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  return content
    .filter((block): block is { type: string; text: string } => (
      !!block && typeof block === "object" && !Array.isArray(block) &&
      (block as { type?: unknown }).type === "text" && typeof (block as { text?: unknown }).text === "string"
    ))
    .map((block) => block.text)
    .join("") || null;
}

function safeAnthropicError(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const root = body as { error?: unknown };
  if (!root.error || typeof root.error !== "object" || Array.isArray(root.error)) return null;
  const error = root.error as { type?: unknown; message?: unknown };
  const type = typeof error.type === "string" ? error.type : "unknown";
  const message = typeof error.message === "string" ? error.message.slice(0, 300) : "unknown";
  return { type, message };
}

function detailedSystemPrompt() {
  return [
    "당신은 '우리사주'의 1,000원 유료 1:1 관계 사주 리포트를 쓰는 전문 편집자입니다.",
    "점수 계산은 이미 서버 규칙 엔진이 끝냈습니다. ReportEvidencePack 밖의 새로운 사주 사실, 점수, 순위, 연도 예측을 만들지 마세요.",
    "이 리포트의 목표는 '점수 설명'이 아니라 사용자가 자기와 상대의 실제 관계를 이해하고 행동에 옮길 수 있게 하는 것입니다.",
    "아래 10개 콘텐츠가 모두 충분한 깊이로 느껴져야 하며, 어느 섹션도 점수 한 줄로 끝내지 마세요.",
    "1) 첫 화면: headline은 한 줄. summary는 반드시 자연스러운 4~5문장으로, 핵심 강점·핵심 마찰·양방향 영향·관계에서의 실전 의미를 연결하세요.",
    "2) A 개인 관계 원국: 기본 성향, 과잉/부족 기운, 관계에서 필요한 기운, 장점과 주의점을 서로 연결해 설명하세요. personA의 각 필드는 보통 2문장 안팎으로 씁니다.",
    "3) B 개인 관계 원국도 A와 같은 깊이로 쓰되 A와 문장 구조를 복사하지 마세요.",
    "4) 기본 케미: 일간·일지·음양·오행 각각에서 '무엇이 관찰됐는지 → 관계에서 어떻게 체감될지'를 1~2문장으로 설명하세요.",
    "5) 결속과 마찰: 천간 합충, 지지 형충파해, 귀인 신호를 가능한 경우 구체적인 관계명과 함께 설명하고, 대화·생활리듬·감정반응·약속·의사결정 중 어느 영역에서 드러날 수 있는지 연결하세요.",
    "6) 양방향 영향: A→B와 B→A를 반드시 분리하세요. 필요한 기운 보완과 부담 가능 기운을 비교해 누가 어느 상황에서 더 안정시키거나 자극하는지 설명하세요.",
    "7) 관계 흐름: 역할, 주도권, 친밀해졌을 때의 변화, 현실적인 갈등 장면을 포함하세요. 근거 없는 성격 단정은 금지하지만 실제 상황 예시는 제시하세요.",
    "8) 관계유형 전용 분석: relationshipType에 맞춰 짝사랑/썸/연인/친구/직장동료에서 실제로 중요한 행동과 판단 포인트를 구체화하세요.",
    "9) 강점과 위험신호: 핵심 강점 2개, 반복 마찰 2개, 레드 플래그 1개를 설명하되 공포를 조장하지 마세요.",
    "10) 실전 매뉴얼: '하면 좋은 것', '피할 것', '갈등 발생 시 순서', 그리고 관계유형에 맞는 구체적 활동·데이트·대화·업무 방식을 제안하세요.",
    "사용자에게 내부 구현용 단어를 노출하지 마세요. WEAK/STRONG/BALANCED, soft signal, confidence, medium/high/low 같은 영어 내부값을 그대로 쓰지 말고 쉬운 한국어로 번역하세요.",
    "예: 'WEAK soft signal 0.55'라고 쓰지 말고 '신약 쪽으로 기울지만 경계에 가까워 단정하기보다는 참고 신호로 보는 편이 좋습니다'처럼 씁니다.",
    "명리 용어를 쓸 때는 곧바로 쉬운 뜻을 붙이세요. 예: 충(서로 부딪히는 흐름), 합(서로 묶이는 흐름). 한문만 단독으로 쓰지 마세요.",
    "점수 자체를 문장마다 반복하지 마세요. 점수는 근거의 강도를 가늠하는 보조정보이고, 본문은 관계에서의 의미를 설명해야 합니다.",
    "같은 조언을 여러 섹션에서 반복하지 마세요. 각 섹션은 서로 다른 역할을 해야 합니다.",
    "A와 B가 바뀌면 문장도 달라져야 합니다. directionalSignals와 각자의 오행·용신 후보 차이를 적극 활용하세요.",
    "신강약과 용신은 확정판정이 아니라 보수적 신호입니다. 신뢰도가 낮거나 중화에 가까우면 표현 강도를 낮추세요.",
    "관계 성공/실패, 상대의 마음, 결혼 여부를 확정적으로 예언하지 마세요.",
    "timingSupport.luckCycleEngineAvailable=false이면 특정 연도·월을 만들지 말고 현재 버전에서는 정밀 시기 예측을 제공하지 않는다고 짧게 설명하세요.",
    "전체 문체는 20~30대가 읽기 쉬운 자연스러운 한국어로 쓰고, 설명은 구체적이되 과도하게 학술적이지 않게 하세요.",
  ].join("\n");
}

async function requestAnthropic(payloadText: string, apiKey: string, model: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
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
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.45,
        system: detailedSystemPrompt(),
        messages: [{
          role: "user",
          content: `다음 ReportEvidencePack만 근거로 유료 상세 리포트를 작성하세요.\n\n${payloadText}`,
        }],
        output_config: {
          format: {
            type: "json_schema",
            schema: NARRATIVE_SCHEMA_V4,
          },
        },
      }),
    });

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const safeError = safeAnthropicError(body);
      console.warn("[woorigunghap:anthropic-http-error]", JSON.stringify({
        status: response.status,
        error: safeError,
      }));
      throw new Error(`ANTHROPIC_HTTP_${response.status}${safeError ? `_${safeError.type}` : ""}`);
    }
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`ANTHROPIC_TIMEOUT_${ANTHROPIC_TIMEOUT_MS}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function improveFallbackLanguage(narrative: CompatibilityNarrative): CompatibilityNarrative {
  const replacements: Array<[RegExp, string]> = [
    [/WEAK 방향의 soft signal이며 신뢰도 ([0-9.]+)로 사용해요\./g, "신약 쪽으로 기울지만 경계 가능성을 감안해 참고 신호로 사용해요."],
    [/STRONG 방향의 soft signal이며 신뢰도 ([0-9.]+)로 사용해요\./g, "신강 쪽으로 기울지만 경계 가능성을 감안해 참고 신호로 사용해요."],
    [/BALANCED 방향의 soft signal이며 신뢰도 ([0-9.]+)로 사용해요\./g, "한쪽으로 강하게 치우치지 않은 편이라 신강·신약을 단정하지 않고 균형 신호로 사용해요."],
    [/계산 신뢰도는 high이며/g, "입력 조건의 계산 신뢰도는 높은 편이며"],
    [/계산 신뢰도는 medium이며/g, "입력 조건의 계산 신뢰도는 보통이며"],
    [/계산 신뢰도는 low이며/g, "입력 조건의 계산 신뢰도는 낮은 편이며"],
  ];
  const replaceText = (text: string) => replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
  const recurse = (value: unknown): unknown => {
    if (typeof value === "string") return replaceText(value);
    if (Array.isArray(value)) return value.map(recurse);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, recurse(child)]));
    }
    return value;
  };
  return recurse(narrative) as CompatibilityNarrative;
}

export async function generateCompatibilityNarrativeV4(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
): Promise<NarrativeGenerationResult> {
  const configuredMode = process.env.REPORT_NARRATIVE_MODE === "anthropic" ? "anthropic" : "template";
  const payload = buildReportEvidencePack(snapshot, input);
  const payloadText = JSON.stringify(payload);
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");

  if (configuredMode !== "anthropic") {
    return {
      narrative: improveFallbackLanguage(buildTemplateNarrative(snapshot, input)),
      meta: {
        mode: "template",
        provider: "template",
        model: null,
        promptVersion: REPORT_PROMPT_VERSION_V4 as never,
        payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
        fallbackReason: "REPORT_NARRATIVE_MODE_NOT_ANTHROPIC",
        usage: null,
        payloadBytes,
      },
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[woorigunghap:narrative-fallback]", JSON.stringify({ reason: "ANTHROPIC_API_KEY_MISSING" }));
    return {
      narrative: improveFallbackLanguage(buildTemplateNarrative(snapshot, input)),
      meta: {
        mode: "template",
        provider: "template",
        model: null,
        promptVersion: REPORT_PROMPT_VERSION_V4 as never,
        payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
        fallbackReason: "ANTHROPIC_API_KEY_MISSING",
        usage: null,
        payloadBytes,
      },
    };
  }

  const model = process.env.ANTHROPIC_NARRATIVE_MODEL?.trim() || DEFAULT_REPORT_MODEL;
  try {
    const body = await requestAnthropic(payloadText, apiKey, model);
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
      ? ((body as { usage?: Parameters<typeof calculateAnthropicUsageCost>[0] }).usage ?? {})
      : {};
    const usage = calculateAnthropicUsageCost(usageShape);

    console.info("[woorigunghap:report-cost]", JSON.stringify({
      provider: "anthropic",
      model,
      promptVersion: REPORT_PROMPT_VERSION_V4,
      payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
      payloadBytes,
      usage,
    }));

    return {
      narrative: parsed,
      meta: {
        mode: "anthropic",
        provider: "anthropic",
        model,
        promptVersion: REPORT_PROMPT_VERSION_V4 as never,
        payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
        fallbackReason: null,
        usage,
        payloadBytes,
      },
    };
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : "ANTHROPIC_UNKNOWN_ERROR";
    console.warn("[woorigunghap:narrative-fallback]", JSON.stringify({
      reason: fallbackReason,
      model,
      promptVersion: REPORT_PROMPT_VERSION_V4,
    }));
    return {
      narrative: improveFallbackLanguage(buildTemplateNarrative(snapshot, input)),
      meta: {
        mode: "template",
        provider: "template",
        model: null,
        promptVersion: REPORT_PROMPT_VERSION_V4 as never,
        payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
        fallbackReason,
        usage: null,
        payloadBytes,
      },
    };
  }
}
