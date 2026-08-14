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

function collectCharacters(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + collectCharacters(item), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce((sum, item) => sum + collectCharacters(item), 0);
  }
  return 0;
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
  const timeoutMs = args.timeoutMs ?? 90_000;
  let best: SegmentAttempt<T> | null = null;
  const allUsage: AnthropicRawUsage[] = [];
  let lastFailure = "UNKNOWN";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": args.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: args.model,
          max_tokens: args.maxTokens,
          system: attempt === 1
            ? args.system
            : `${args.system}\n\n[재작성 지시] 직전 생성이 목표 분량 또는 세부성에 부족했습니다. 같은 계산 근거 안에서 설명을 더 구체화하고, 실제 관계에서 체감되는 장면과 행동 기준을 충분히 풀어 쓰세요.`,
          messages: [{ role: "user", content: args.user }],
          output_config: { format: { type: "json_schema", schema: args.schema } },
        }),
      });
      const body = await response.json().catch(() => null) as AnthropicBody | null;
      if (body?.usage) allUsage.push(body.usage);
      if (!response.ok) {
        lastFailure = `HTTP_${response.status}_${safeError(body)}`;
        console.warn("[woorigunghap:v6-segment-http]", JSON.stringify({ label: args.label, attempt, status: response.status, reason: safeError(body) }));
        continue;
      }
      const text = body ? extractText(body) : null;
      if (!text) {
        lastFailure = `EMPTY_${body?.stop_reason ?? "UNKNOWN"}`;
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
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

  // 품질 게이트는 재생성 신호다. 스키마가 유효한 결과가 하나라도 있으면
  // 사용자가 결제 후 빈 에러 화면을 보는 것보다 가장 긴 결과를 제공한다.
  if (best) return { best, attempts: 2, allUsage };
  throw new Error(`ANTHROPIC_SEGMENT_${args.label}_${lastFailure}`);
}

export function combineAnthropicUsage(usages: AnthropicRawUsage[]): NarrativeUsage | null {
  if (!usages.length) return null;
  const sum = usages.reduce((acc, usage) => ({
    input_tokens: acc.input_tokens + (usage.input_tokens ?? 0),
    output_tokens: acc.output_tokens + (usage.output_tokens ?? 0),
    cache_creation_input_tokens: acc.cache_creation_input_tokens + (usage.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: acc.cache_read_input_tokens + (usage.cache_read_input_tokens ?? 0),
  }), { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
  return calculateAnthropicUsageCost(sum);
}
