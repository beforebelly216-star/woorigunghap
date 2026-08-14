import {
  calculateAnthropicUsageCost,
  type NarrativeUsage,
} from "@/lib/narrative/report-engine";

export type AnthropicRawUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

type AnthropicBody = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: AnthropicRawUsage;
  error?: { type?: string; message?: string };
  stop_reason?: string | null;
};

export type SegmentAttempt<T> = {
  value: T;
  usage: AnthropicRawUsage | null;
  characters: number;
  qualityIssues: string[];
};

function safeError(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "UNKNOWN";
  const error = (body as { error?: unknown }).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return "UNKNOWN";
  const type = (error as { type?: unknown }).type;
  return typeof type === "string" ? type.replace(/[^A-Z0-9_-]/gi, "_").toUpperCase() : "UNKNOWN";
}

function extractText(body: AnthropicBody) {
  return body.content?.find((item) => item.type === "text" && typeof item.text === "string")?.text ?? null;
}

function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  return JSON.parse(unfenced);
}

function collectCharacters(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + collectCharacters(item), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + collectCharacters(item), 0);
  }
  return 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAnthropic(args: {
  apiKey: string;
  model: string;
  schema: unknown;
  system: string;
  user: string;
  maxTokens: number;
  signal: AbortSignal;
  structured: boolean;
}) {
  const plainJsonRule = args.structured
    ? ""
    : `\n\n[JSON 출력 규칙] 아래 JSON Schema와 정확히 같은 구조의 JSON 객체만 출력하세요. 마크다운 코드펜스나 설명 문장은 넣지 마세요.\n${JSON.stringify(args.schema)}`;

  const requestBody: Record<string, unknown> = {
    model: args.model,
    max_tokens: args.maxTokens,
    system: `${args.system}${plainJsonRule}`,
    messages: [{ role: "user", content: args.user }],
  };
  if (args.structured) {
    requestBody.output_config = { format: { type: "json_schema", schema: args.schema } };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    signal: args.signal,
    body: JSON.stringify(requestBody),
  });
  const body = await response.json().catch(() => null) as AnthropicBody | null;
  return { response, body };
}

export async function requestStructuredSegment<T>(args: {
  apiKey: string;
  model: string;
  schema: unknown;
  system: string;
  user: string;
  maxTokens: number;
  timeoutMs?: number;
  validate: (value: unknown) => value is T;
  qualityIssues: (value: T) => string[];
  label: string;
}): Promise<{ best: SegmentAttempt<T>; attempts: number; allUsage: AnthropicRawUsage[] }> {
  const timeoutMs = args.timeoutMs ?? 45_000;
  let best: SegmentAttempt<T> | null = null;
  const allUsage: AnthropicRawUsage[] = [];
  let lastFailure = "UNKNOWN";
  let structuredRejected = false;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const expandedSystem = attempt === 1
        ? args.system
        : `${args.system}\n\n[재작성 지시] 직전 생성이 목표 분량 또는 세부성에 부족했습니다. 같은 계산 근거 안에서 설명을 더 구체화하고, 실제 관계에서 체감되는 장면과 행동 기준을 충분히 풀어 쓰세요.`;

      let result = await callAnthropic({
        apiKey: args.apiKey,
        model: args.model,
        schema: args.schema,
        system: expandedSystem,
        user: args.user,
        maxTokens: args.maxTokens,
        signal: controller.signal,
        structured: !structuredRejected,
      });

      if (!result.response.ok && result.response.status === 400 && !structuredRejected) {
        structuredRejected = true;
        console.warn("[woorigunghap:v6-structured-fallback]", JSON.stringify({ label: args.label, attempt, reason: safeError(result.body) }));
        result = await callAnthropic({
          apiKey: args.apiKey,
          model: args.model,
          schema: args.schema,
          system: expandedSystem,
          user: args.user,
          maxTokens: args.maxTokens,
          signal: controller.signal,
          structured: false,
        });
      }

      const { response, body } = result;
      if (body?.usage) allUsage.push(body.usage);
      if (!response.ok) {
        lastFailure = `HTTP_${response.status}_${safeError(body)}`;
        console.warn("[woorigunghap:v6-segment-http]", JSON.stringify({ label: args.label, attempt, status: response.status, reason: safeError(body), structured: !structuredRejected }));
        if ((response.status === 429 || response.status === 529) && attempt < 2) {
          const retryAfterSeconds = Number(response.headers.get("retry-after"));
          const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? Math.min(8_000, retryAfterSeconds * 1000)
            : 2_000 * attempt;
          await sleep(waitMs);
        }
        continue;
      }

      const text = body ? extractText(body) : null;
      if (!text) {
        lastFailure = `EMPTY_${body?.stop_reason ?? "UNKNOWN"}`;
        continue;
      }

      let parsed: unknown;
      try {
        parsed = parseJsonText(text);
      } catch {
        lastFailure = "INVALID_JSON";
        continue;
      }
      if (!args.validate(parsed)) {
        lastFailure = "SCHEMA_MISMATCH";
        continue;
      }

      const issues = args.qualityIssues(parsed);
      const candidate: SegmentAttempt<T> = {
        value: parsed,
        usage: body?.usage ?? null,
        characters: collectCharacters(parsed),
        qualityIssues: issues,
      };
      if (!best || candidate.characters > best.characters) best = candidate;
      if (issues.length === 0) return { best: candidate, attempts: attempt, allUsage };
      console.warn("[woorigunghap:v6-segment-quality]", JSON.stringify({ label: args.label, attempt, characters: candidate.characters, issues }));
    } catch (error) {
      lastFailure = error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "REQUEST_FAILED";
      console.warn("[woorigunghap:v6-segment-request]", JSON.stringify({ label: args.label, attempt, reason: lastFailure }));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (best) return { best, attempts: 2, allUsage };
  throw new Error(`ANTHROPIC_SEGMENT_${args.label}_${lastFailure}`);
}

export function combineAnthropicUsage(usages: AnthropicRawUsage[]): NarrativeUsage | null {
  if (!usages.length) return null;
  type UsageSum = Required<AnthropicRawUsage>;
  const sum = usages.reduce<UsageSum>((acc, usage) => ({
    input_tokens: acc.input_tokens + (usage.input_tokens ?? 0),
    output_tokens: acc.output_tokens + (usage.output_tokens ?? 0),
    cache_creation_input_tokens: acc.cache_creation_input_tokens + (usage.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: acc.cache_read_input_tokens + (usage.cache_read_input_tokens ?? 0),
  }), { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
  return calculateAnthropicUsageCost(sum);
}
