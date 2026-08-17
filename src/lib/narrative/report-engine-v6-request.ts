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

type JsonSchemaShape = {
  type?: unknown;
  properties?: unknown;
  required?: unknown;
  additionalProperties?: unknown;
  items?: unknown;
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
  try {
    return JSON.parse(unfenced);
  } catch {
    const first = unfenced.indexOf("{");
    const last = unfenced.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(unfenced.slice(first, last + 1));
    throw new Error("INVALID_JSON");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Lightweight recursive validator for the JSON-Schema subset used by the paid report.
 * It intentionally validates on our server even when Claude is asked for plain JSON,
 * so malformed nested arrays/objects can never reach the React renderer.
 */
export function matchesJsonSchema(value: unknown, schema: unknown): boolean {
  if (!isPlainObject(schema)) return false;
  const shape = schema as JsonSchemaShape;

  if (shape.type === "string") return typeof value === "string";
  if (shape.type === "number") return typeof value === "number" && Number.isFinite(value);

  if (shape.type === "array") {
    if (!Array.isArray(value) || !shape.items) return false;
    return value.every((item) => matchesJsonSchema(item, shape.items));
  }

  if (shape.type === "object") {
    if (!isPlainObject(value) || !isPlainObject(shape.properties)) return false;
    const properties = shape.properties;
    const required = Array.isArray(shape.required)
      ? shape.required.filter((key): key is string => typeof key === "string")
      : [];

    if (!required.every((key) => Object.prototype.hasOwnProperty.call(value, key))) return false;

    if (shape.additionalProperties === false) {
      const allowed = new Set(Object.keys(properties));
      if (Object.keys(value).some((key) => !allowed.has(key))) return false;
    }

    for (const [key, child] of Object.entries(value)) {
      const childSchema = properties[key];
      if (childSchema === undefined) {
        if (shape.additionalProperties === false) return false;
        continue;
      }
      if (!matchesJsonSchema(child, childSchema)) return false;
    }
    return true;
  }

  return false;
}

function collectCharacters(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + collectCharacters(item), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + collectCharacters(item), 0);
  }
  return 0;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

function normalizeForDuplicateCheck(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[“”‘’"']/g, "")
    .trim();
}

function hasStandaloneDeveloperLabel(text: string) {
  return /(^|[^A-Za-z0-9])[AB](?=(?:은|는|이|가|을|를|와|과|에게|의|도|만|쪽)|[^A-Za-z가-힣0-9]|$)/.test(text);
}

function relationshipFromPrompt(user: string) {
  return user.match(/"relationshipType":"(crush|flirting|lover|friend|coworker)"/)?.[1] ?? null;
}

function coworkerHierarchyFromPrompt(user: string) {
  return user.match(/"coworkerHierarchy":"(boss|peer|subordinate)"/)?.[1] ?? null;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

/**
 * Output-only quality gate. This does not invent new content; it decides whether a
 * structurally valid Claude response is good enough to keep or should trigger the
 * existing one-time regeneration path.
 */
export function collectPaidNarrativeQualityIssues(
  value: unknown,
  label: string,
  userPrompt = "",
) {
  const issues: string[] = [];
  const strings = collectStrings(value);
  const joined = strings.join("\n");
  const characters = collectCharacters(value);
  const minCharacters = label === "INTRO" ? 2600 : label === "DYNAMICS" || label === "ACTION" ? 5200 : 0;

  if (minCharacters > 0 && characters < minCharacters) issues.push(`${label}_TOTAL_DENSITY_SHORT`);

  const duplicateCounts = new Map<string, number>();
  for (const source of strings) {
    const normalized = normalizeForDuplicateCheck(source);
    if (normalized.length < 40) continue;
    duplicateCounts.set(normalized, (duplicateCounts.get(normalized) ?? 0) + 1);
  }
  if ([...duplicateCounts.values()].some((count) => count >= 2)) issues.push("EXACT_LONG_TEXT_DUPLICATE");

  if (hasStandaloneDeveloperLabel(joined)) issues.push("DEVELOPER_LABEL_A_B_EXPOSED");
  if (/\b(WEAK|STRONG|BALANCED|confidence)\b|soft signal/i.test(joined)) issues.push("INTERNAL_TERM_EXPOSED");
  if (/(무조건|100%|확실히|틀림없이|운명적으로 정해)/.test(joined)) issues.push("DETERMINISTIC_CERTAINTY");

  const relationshipType = relationshipFromPrompt(userPrompt);
  if ((relationshipType === "friend" || relationshipType === "coworker")
    && /(데이트|썸을|연인 관계|성적 긴장|결혼 상대|연애 감정)/.test(joined)) {
    issues.push("RELATIONSHIP_ROMANCE_LEAK");
  }
  if (relationshipType === "crush" && /(이미 교제|연인으로서|결혼 생활)/.test(joined)) {
    issues.push("CRUSH_STAGE_OVERREACH");
  }
  if (relationshipType === "flirting" && /(이미 교제 중|연인으로서|결혼 생활)/.test(joined)) {
    issues.push("FLIRTING_STAGE_OVERREACH");
  }

  if (relationshipType === "coworker" && label === "ACTION") {
    const hierarchy = coworkerHierarchyFromPrompt(userPrompt);
    const hierarchyTerms = hierarchy === "boss"
      ? ["보고", "이견", "요청", "피드백", "상사"]
      : hierarchy === "peer"
        ? ["합의", "역할", "책임", "일정", "피드백", "동급"]
        : hierarchy === "subordinate"
          ? ["위임", "지시", "체크인", "피드백", "심리적 안전", "부하"]
          : [];
    if (hierarchy && !includesAny(joined, hierarchyTerms)) issues.push("COWORKER_HIERARCHY_NOT_REFLECTED");
  }

  return [...new Set(issues)];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function betterCandidate<T>(current: SegmentAttempt<T> | null, next: SegmentAttempt<T>) {
  if (!current) return next;
  if (next.qualityIssues.length < current.qualityIssues.length) return next;
  if (next.qualityIssues.length === current.qualityIssues.length && next.characters > current.characters) return next;
  return current;
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
    : `\n\n[JSON 출력 규칙]\n아래 JSON Schema와 정확히 같은 키 구조의 JSON 객체 하나만 출력하세요. 마크다운 코드펜스와 앞뒤 설명은 넣지 마세요. 문자열 값은 충분히 자세한 한국어로 작성하세요.\n${JSON.stringify(args.schema)}`;

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
  preferStructured?: boolean;
  validate: (value: unknown) => value is T;
  qualityIssues: (value: T) => string[];
  label: string;
}): Promise<{ best: SegmentAttempt<T>; attempts: number; allUsage: AnthropicRawUsage[] }> {
  const timeoutMs = Math.max(args.timeoutMs ?? 60_000, 60_000);
  const allUsage: AnthropicRawUsage[] = [];
  let lastFailure = "UNKNOWN";
  let structuredRejected = args.preferStructured !== true;
  let bestQualityCandidate: SegmentAttempt<T> | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const retryReason = lastFailure === "QUALITY_SHORTFALL"
        ? "직전 응답은 JSON 구조는 맞았지만 내용 밀도, 반복·금지 표현 또는 관계 맥락 품질 기준을 충족하지 못했습니다. 같은 내용을 반복하지 말고 계산 근거·관계 장면·행동 기준을 더 구체적으로 작성하며 개발자 표기와 단정적 표현을 제거하세요."
        : "직전 응답을 사용할 수 없었습니다. JSON 구조를 정확히 지키고, 중간에 끊기지 않도록 완결된 객체를 출력하세요.";
      const expandedSystem = attempt === 1
        ? args.system
        : `${args.system}\n\n[재시도 지시] ${retryReason}`;
      const firstAttemptMaxTokens = args.label === "INTRO"
        ? Math.max(args.maxTokens, 7_000)
        : args.label === "DYNAMICS"
          ? Math.max(args.maxTokens, 16_000)
          : args.label === "ACTION"
            ? Math.max(args.maxTokens, 14_000)
            : args.maxTokens;
      const attemptMaxTokens = attempt === 1
        ? firstAttemptMaxTokens
        : Math.min(24_000, Math.ceil(firstAttemptMaxTokens * 1.25));

      let result = await callAnthropic({
        apiKey: args.apiKey,
        model: args.model,
        schema: args.schema,
        system: expandedSystem,
        user: args.user,
        maxTokens: attemptMaxTokens,
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
          maxTokens: attemptMaxTokens,
          signal: controller.signal,
          structured: false,
        });
      }

      const { response, body } = result;
      if (body?.usage) allUsage.push(body.usage);
      if (!response.ok) {
        lastFailure = `HTTP_${response.status}_${safeError(body)}`;
        console.warn("[woorigunghap:v6-segment-http]", JSON.stringify({ label: args.label, attempt, status: response.status, reason: safeError(body) }));
        if ((response.status === 429 || response.status === 529) && attempt < 2) {
          const retryAfterSeconds = Number(response.headers.get("retry-after"));
          const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? Math.min(8_000, retryAfterSeconds * 1000)
            : 2_000;
          await sleep(waitMs);
        }
        continue;
      }

      if (body?.stop_reason === "max_tokens") {
        lastFailure = "MAX_TOKENS";
        console.warn("[woorigunghap:v6-segment-truncated]", JSON.stringify({ label: args.label, attempt, maxTokens: attemptMaxTokens }));
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
      if (!matchesJsonSchema(parsed, args.schema) || !args.validate(parsed)) {
        lastFailure = "SCHEMA_MISMATCH";
        console.warn("[woorigunghap:v6-segment-schema]", JSON.stringify({ label: args.label, attempt }));
        continue;
      }

      const issues = [...new Set([
        ...args.qualityIssues(parsed),
        ...collectPaidNarrativeQualityIssues(parsed, args.label, args.user),
      ])];
      const candidate: SegmentAttempt<T> = {
        value: parsed,
        usage: body?.usage ?? null,
        characters: collectCharacters(parsed),
        qualityIssues: issues,
      };
      if (issues.length === 0) {
        return { best: candidate, attempts: attempt, allUsage };
      }

      bestQualityCandidate = betterCandidate(bestQualityCandidate, candidate);
      lastFailure = "QUALITY_SHORTFALL";
      console.warn("[woorigunghap:v6-segment-quality]", JSON.stringify({ label: args.label, attempt, characters: candidate.characters, issues }));
      if (attempt < 2) continue;
      return { best: bestQualityCandidate, attempts: attempt, allUsage };
    } catch (error) {
      lastFailure = error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "REQUEST_FAILED";
      console.warn("[woorigunghap:v6-segment-request]", JSON.stringify({ label: args.label, attempt, reason: lastFailure }));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (bestQualityCandidate) {
    return { best: bestQualityCandidate, attempts: 2, allUsage };
  }
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
