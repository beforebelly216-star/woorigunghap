import {
  calculateAnthropicUsageCost,
  type NarrativeUsage,
} from "@/lib/narrative/report-engine";
import { normalizeNarrativeNameTokenDensity } from "@/lib/narrative/name-personalization";

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

const CRITICAL_QUALITY_ISSUES = new Set([
  "DEVELOPER_LABEL_A_B_EXPOSED",
  "INTERNAL_TERM_EXPOSED",
  "INTERNAL_METRIC_EXPOSED",
  "DETERMINISTIC_CERTAINTY",
  "MIND_READING_CERTAINTY",
  "ELEMENT_PSYCHOLOGY_OVERREACH",
  "UNSUPPORTED_NUMERIC_PRESCRIPTION",
  "FUTURE_TIMING_LEAK",
  "DURATION_CAUSAL_OVERREACH",
  "NAME_TOKEN_OVERUSE",
  "RELATIONSHIP_ROMANCE_LEAK",
  "CRUSH_STAGE_OVERREACH",
  "FLIRTING_STAGE_OVERREACH",
  "COWORKER_HIERARCHY_NOT_REFLECTED",
]);

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

function countNameTokens(text: string) {
  return text.match(/\{\{(?:SELF|PARTNER|BOTH)\}\}/g)?.length ?? 0;
}

function hasElementPsychologyOverreach(text: string) {
  const element = "(?:목|화|토|금|수|나무|불|흙|금속|물|오행)";
  const psychology = "(?:공감(?:\s*능력)?|감정(?:\s*표현)?|불안(?:감)?|애착|사랑|마음|표현\s*능력|상처|성욕|의지력?|심리|욕구)";
  return new RegExp(`${element}.{0,100}${psychology}|${psychology}.{0,100}${element}`, "s").test(text);
}

function hasUnsupportedNumericPrescription(text: string) {
  return /(?:하루|주당|주)\s*\d+\s*(?:회|번)|\d+\s*(?:시간|분)\s*(?:뒤|후|간격)|\d+\s*일\s*(?:마다|간격)/.test(text);
}

/**
 * Output-only quality gate. This does not invent new content; it decides whether a
 * structurally valid Claude response is good enough to keep or should trigger a
 * fresh paid-generation request.
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
  if (/(역할 공급도|배우자 역할 점수|유용신 적합도|범위값|aRoleSupply|bRoleSupply|weightedPoints|maxPoints)/.test(joined)) issues.push("INTERNAL_METRIC_EXPOSED");
  if (/(무조건|100%|확실히|틀림없이|반드시|운명적으로 정해|자동(?:으로|적)|확률이 높(?:아|습니다)|증명합니다|즉시[^.\n]{0,40}전환|바로[^.\n]{0,60}만듭니다)/.test(joined)) {
    issues.push("DETERMINISTIC_CERTAINTY");
  }
  if (/(무의식적|무의식적으로|내부적으로|내면화|내면에|내면은|갈망|사랑받을 자격|마음속에서|마음이 한 번 닫|상처에서 벗어나|선천적(?:으로)?|실제로는 감정|공감\s*능력|표현\s*능력[^.\n]{0,30}(?:제한|부족)|존재감[^.\n]{0,30}느끼|불안감[^.\n]{0,30}(?:낮아|높아)|심리 상태(?:입니다|다)|정말로[^.\n]{0,50}해서가 아니라)/.test(joined)) {
    issues.push("MIND_READING_CERTAINTY");
  }
  if (hasElementPsychologyOverreach(joined)) issues.push("ELEMENT_PSYCHOLOGY_OVERREACH");
  if (hasUnsupportedNumericPrescription(joined)) issues.push("UNSUPPORTED_NUMERIC_PRESCRIPTION");
  if (/(20\d{2}년|\b대운\b|\b세운\b|월운)/.test(joined)) issues.push("FUTURE_TIMING_LEAK");

  const maxNameTokens = Math.max(12, Math.ceil(characters / 120));
  if (countNameTokens(joined) > maxNameTokens) issues.push("NAME_TOKEN_OVERUSE");

  const hasDurationContext = /"relationshipDurationMonths":\d+/.test(userPrompt);
  if (
    hasDurationContext
    && /\d+개월[\s\S]{0,120}(?:유지된 것은|유지해 온 것은|유지한 것 자체|증명합니다|조화가[^.\n]{0,50}뜻)/.test(joined)
  ) {
    issues.push("DURATION_CAUSAL_OVERREACH");
  }

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

function criticalIssues(issues: string[]) {
  return issues.filter((issue) => CRITICAL_QUALITY_ISSUES.has(issue));
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
  const requestedTimeoutMs = Math.max(args.timeoutMs ?? 60_000, 60_000);
  const isLongSegment = args.label === "DYNAMICS" || args.label === "ACTION";
  const perAttemptTimeoutMs = isLongSegment
    ? Math.max(requestedTimeoutMs, 205_000)
    : Math.max(requestedTimeoutMs, 120_000);
  const totalBudgetMs = isLongSegment ? 220_000 : 180_000;
  const maxAttempts = isLongSegment ? 1 : 2;
  const startedAt = Date.now();
  const allUsage: AnthropicRawUsage[] = [];
  let lastFailure = "UNKNOWN";
  let lastQualityIssues: string[] = [];
  const autoStructuredHaiku45 = args.preferStructured === false
    && args.model.startsWith("claude-haiku-4-5");
  let structuredRejected = args.preferStructured !== true && !autoStructuredHaiku45;
  let bestQualityCandidate: SegmentAttempt<T> | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remainingBudgetMs = Math.max(1_000, totalBudgetMs - (Date.now() - startedAt));
    const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remainingBudgetMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
    try {
      const retryReason = lastFailure === "QUALITY_SHORTFALL"
        ? `직전 응답은 JSON 구조는 맞았지만 다음 품질 기준을 위반했습니다: ${lastQualityIssues.join(", ")}. 계산 근거와 관찰 가능한 행동만 사용하고, 숨은 마음·미래 연도·내부 지표·과도한 이름 반복·단정 표현·오행과 심리 능력의 1:1 대응·서버 근거 없는 횟수나 시간 처방을 제거하세요. 관계 기간은 맥락일 뿐 궁합의 증거로 해석하지 마세요.`
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
        if ((response.status === 429 || response.status === 529) && attempt < maxAttempts) {
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

      const normalizedValue = normalizeNarrativeNameTokenDensity(parsed);
      const issues = [...new Set([
        ...args.qualityIssues(normalizedValue),
        ...collectPaidNarrativeQualityIssues(normalizedValue, args.label, args.user),
      ])];
      const candidate: SegmentAttempt<T> = {
        value: normalizedValue,
        usage: body?.usage ?? null,
        characters: collectCharacters(normalizedValue),
        qualityIssues: issues,
      };
      if (issues.length === 0) {
        return { best: candidate, attempts: attempt, allUsage };
      }

      bestQualityCandidate = betterCandidate(bestQualityCandidate, candidate);
      lastFailure = "QUALITY_SHORTFALL";
      lastQualityIssues = issues;
      console.warn("[woorigunghap:v6-segment-quality]", JSON.stringify({ label: args.label, attempt, characters: candidate.characters, issues }));

      if (isLongSegment) {
        throw new Error(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_RETRY_${issues.join("_")}`);
      }

      if (attempt < maxAttempts) continue;
      const critical = criticalIssues(issues);
      if (critical.length) {
        throw new Error(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_CRITICAL_${critical.join("_")}`);
      }
      return { best: candidate, attempts: attempt, allUsage };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_`)) throw error;
      lastFailure = error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "REQUEST_FAILED";
      console.warn("[woorigunghap:v6-segment-request]", JSON.stringify({ label: args.label, attempt, reason: lastFailure, timeoutMs: attemptTimeoutMs }));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (bestQualityCandidate) {
    const critical = criticalIssues(bestQualityCandidate.qualityIssues);
    if (critical.length) {
      throw new Error(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_CRITICAL_${critical.join("_")}`);
    }
    return { best: bestQualityCandidate, attempts: maxAttempts, allUsage };
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
