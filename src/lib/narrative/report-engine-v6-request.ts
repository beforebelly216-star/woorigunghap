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

// Progress-first policy: only defects that can leak implementation details or
// make a relationship-specific product materially wrong block generation.
// Editorial/tone issues are still collected below and surfaced as warnings.
const CRITICAL_QUALITY_ISSUES = new Set([
  "DEVELOPER_LABEL_A_B_EXPOSED",
  "INTERNAL_TERM_EXPOSED",
  "INTERNAL_METRIC_EXPOSED",
  "RELATIONSHIP_ROMANCE_LEAK",
]);

function safeError(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "UNKNOWN";
  const error = (body as { error?: unknown }).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return "UNKNOWN";
  const type = (error as { type?: unknown }).type;
  return typeof type === "string" ? type.replace(/[^A-Z0-9_-]/gi, "_").toUpperCase() : "UNKNOWN";
}

function safeErrorDetail(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const error = (body as { error?: unknown }).error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  const sanitized = message
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized ? sanitized.slice(0, 300) : null;
}

function isCreditBalanceLow(body: unknown) {
  const detail = safeErrorDetail(body);
  return typeof detail === "string"
    && /(credit balance is too low|purchase credits)/i.test(detail);
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

const INTRO_ELEMENT_LABELS: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

function parseAiPayloadFromUserPrompt(userPrompt: string) {
  const firstBrace = userPrompt.indexOf("{");
  if (firstBrace < 0) return null;
  try {
    const parsed = JSON.parse(userPrompt.slice(firstBrace));
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function introElementList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const labels = values
    .filter((item): item is string => typeof item === "string")
    .map((item) => INTRO_ELEMENT_LABELS[item] ?? item)
    .filter(Boolean);
  return labels.length ? labels.join("·") : "뚜렷한 단일 기운 없음";
}

function buildGroundedIntroPerson(payload: Record<string, unknown>, key: "A" | "B") {
  const factsRoot = isPlainObject(payload.facts) ? payload.facts : null;
  const fact = factsRoot && isPlainObject(factsRoot[key]) ? factsRoot[key] : null;
  const evidenceRoot = isPlainObject(payload.evidence) ? payload.evidence : null;
  const persons = evidenceRoot && isPlainObject(evidenceRoot.persons) ? evidenceRoot.persons : null;
  const evidence = persons && isPlainObject(persons[key]) ? persons[key] : null;
  if (!fact || !evidence) return null;

  const placeholder = key === "A" ? "{{SELF}}" : "{{PARTNER}}";
  const dayPillar = typeof fact.dayPillar === "string" ? fact.dayPillar : "일주 미확인";
  const birthTimeKnown = fact.birthTimeKnown === true;
  const dayMaster = isPlainObject(evidence.dayMaster) ? evidence.dayMaster : null;
  const dayMasterStem = dayMaster && typeof dayMaster.stem === "string" ? dayMaster.stem : null;
  const dayMasterElement = dayMaster && typeof dayMaster.element === "string"
    ? introElementList(dayMaster.element)
    : null;
  const balance = isPlainObject(evidence.elementBalance) ? evidence.elementBalance : null;
  const strongest = introElementList(balance?.strongest);
  const weakest = introElementList(balance?.weakest);
  const timeSentence = birthTimeKnown
    ? "출생시간까지 확인된 입력을 사용했으므로 현재 입력 범위 안에서 시주를 포함한 계산 결과를 참고할 수 있습니다."
    : "출생시간이 확인되지 않은 입력이므로 시주에 따라 달라질 수 있는 부분은 이 기본판에서 확정하지 않습니다.";
  const dayMasterSentence = dayMasterStem && dayMasterElement
    ? `일간은 ${dayMasterStem}(${dayMasterElement})로 계산되었습니다.`
    : "일간 정보는 서버가 제공한 계산 범위 안에서만 사용합니다.";

  return {
    overallProfile: `${placeholder}의 일주는 서버 계산상 ${dayPillar}입니다. ${dayMasterSentence} 이 값들은 출생정보를 사주 구조로 변환한 식별값이며 개인의 성향이나 관계 반응을 직접 확정하는 값이 아닙니다. ${timeSentence} 따라서 이 기본판은 계산된 구조와 입력 확실성만 설명하고, 실제 관계 행동은 두 사람이 현실에서 보이는 반응으로 확인해야 합니다. 뒤의 관계 해설에서도 사주 구조와 관찰 가능한 행동을 구분해 읽는 것이 기준입니다.`,
    elementAnalysis: `${placeholder}의 오행 분포에서는 ${strongest}이 상대적으로 강하고 ${weakest}이 상대적으로 약한 방향으로 계산되었습니다. 여기서 강함과 약함은 오행 사이의 상대적 배치에 대한 설명이며 개인의 성향이나 행동 수준을 평가하는 값이 아닙니다. 정확한 비율이나 개수를 새로 추정하지 않고 서버가 제공한 strongest/weakest 순위만 사용합니다. 두 사람의 오행을 비교할 때도 어느 한쪽이 다른 쪽의 결핍을 자동으로 채운다고 단정하지 않고, 구조상 겹치는 부분과 다른 부분을 관계 해설의 참고 신호로만 사용합니다.`,
    relationshipNeeds: `${placeholder}에게 필요한 관계 조건을 사주의 심리 진단으로 정하지 않습니다. 실제로 확인할 기준은 대화 속도, 약속을 정하는 방식, 의견이 다를 때 설명하는 방식, 각자가 편안하다고 말하는 경계입니다. 차이가 보이면 상대의 속마음을 추측하기보다 어떤 상황에서 어떤 반응이 반복되는지 먼저 확인합니다. 이후 조언은 이 관찰 결과와 서버 계산 근거가 함께 맞을 때 적용하는 것이 안전합니다.`,
    strengths: [
      `${placeholder}의 계산 구조는 두 사람의 차이를 설명할 때 비교 기준으로 활용할 수 있습니다. 단독으로 성격의 장점이라고 확정하지 않습니다.`,
      "일주와 오행의 상대적 배치를 서로의 구조와 나란히 보면 겹치는 지점과 다른 지점을 구분하기 쉽습니다. 실제 장점 여부는 관계 장면에서 확인합니다.",
      "출생시간 확인 여부를 함께 표시하므로 계산이 확실한 부분과 열어 두어야 할 부분을 구분할 수 있습니다. 불확실한 부분은 단정하지 않습니다.",
    ],
    cautions: [
      "구조의 상대적 강약을 개인의 특성에 대한 원인 설명으로 바꾸지 않습니다. 계산 구조와 사람 평가를 분리합니다.",
      "일주 하나만으로 상대의 속마음이나 미래 행동을 확정하지 않습니다. 실제 반응과 대화를 우선 확인합니다.",
      "출생시간이 없거나 계산 경계가 있는 경우 가능한 범위를 남겨 둡니다. 단일 해석을 사실처럼 고정하지 않습니다.",
    ],
  };
}

export function groundPaidIntroWithServerEvidence(value: unknown, userPrompt: string): unknown {
  if (!isPlainObject(value)) return value;
  const payload = parseAiPayloadFromUserPrompt(userPrompt);
  if (!payload) return value;
  const personA = buildGroundedIntroPerson(payload, "A");
  const personB = buildGroundedIntroPerson(payload, "B");
  if (!personA || !personB) return value;
  return { ...value, personA, personB };
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
  return value.replace(/\s+/g, " ").replace(/[“”‘’"']/g, "").trim();
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
  const psychology = "(?:공감(?:\\s*능력)?|감정(?:\\s*표현)?|불안(?:감)?|애착|사랑|마음|표현\\s*능력|상처|성욕|의지력?|심리|욕구)";
  const imbalance = "(?:약(?:해|해서|하니|한|하기)|부족(?:해|해서|하니|한|하기)|적(?:어|어서|으니|은|기)|강(?:해|해서|하니|한|하기)|많(?:아|아서|으니|은|기)|과다(?:해|해서|한|하기)|우세(?:해|해서|한|하기))";
  const causal = "(?:때문(?:에|이다)?|그래서|따라서|결과(?:로)?|원인(?:이|으로)?|이므로|라서|해서|하여)";
  const safeNegation = /(?:뜻|의미)하지\s*않|(?:뜻|의미)하는\s*것은\s*아니|단정할\s*수\s*없|연결하지\s*않|판단하지\s*않|1:1로\s*대응하지\s*않/;
  const directAttribution = new RegExp(`${element}(?:이|가|은|는)?[^.\n!?]{0,45}${imbalance}[^.\n!?]{0,55}${psychology}|${psychology}[^.\n!?]{0,55}${element}(?:이|가|은|는)?[^.\n!?]{0,45}${imbalance}`);
  const explicitCausality = new RegExp(`${element}[^.\n!?]{0,65}${causal}[^.\n!?]{0,65}${psychology}|${psychology}[^.\n!?]{0,65}${causal}[^.\n!?]{0,65}${element}`);
  return text
    .split(/[.\n!?]+/)
    .some((sentence) => {
      const clause = sentence.trim();
      if (!clause || safeNegation.test(clause)) return false;
      return directAttribution.test(clause) || explicitCausality.test(clause);
    });
}

function hasUnsupportedNumericPrescription(text: string) {
  return /(?:하루|주당|주)\s*\d+\s*(?:회|번)|\d+\s*(?:시간|분)\s*(?:뒤|후|간격)|\d+\s*일\s*(?:마다|간격)/.test(text);
}

/**
 * Output-only editorial diagnostics. Only CRITICAL_QUALITY_ISSUES block a
 * structurally valid report. Other findings remain visible in qualityWarnings.
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
  const minCharacters = label === "INTRO" ? 1200 : label === "DYNAMICS" || label === "ACTION" ? 1800 : 0;

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
    && /\d+개월(?:간)?[\s\S]{0,150}(?:유지된 것은|유지해 온 것은|유지한 것 자체|지탱해 온 것은|증명합니다|뜻이기도|뜻입니다|보여줍니다|알고 있다는|조화가[^.\n]{0,50}뜻)/.test(joined)
  ) {
    issues.push("DURATION_CAUSAL_OVERREACH");
  }

  if (label === "INTRO" && isPlainObject(value)) {
    const psychologyTerms = /(공감|감정|마음|애착|욕구|상처|불안|성욕|심리|의지력|표현 능력|유연함|적응 속도|신중함|배려심|진짜 생각|진정성)/;
    const hiddenStateTerms = /(무의식|내면|마음속|갈망|사랑받을 자격|심리 상태|진짜 생각|마음의 준비|의지가 (?:강|약)|욕구가 (?:강|약))/;
    for (const key of ["personA", "personB"] as const) {
      const person = value[key];
      if (!isPlainObject(person)) continue;
      const elementAnalysis = typeof person.elementAnalysis === "string" ? person.elementAnalysis : "";
      const overallProfile = typeof person.overallProfile === "string" ? person.overallProfile : "";
      const relationshipNeeds = typeof person.relationshipNeeds === "string" ? person.relationshipNeeds : "";
      const personLists = [person.strengths, person.cautions]
        .filter(Array.isArray)
        .flat()
        .filter((item): item is string => typeof item === "string")
        .join("\n");
      if (psychologyTerms.test(elementAnalysis)) issues.push("ELEMENT_PSYCHOLOGY_OVERREACH");
      if (hiddenStateTerms.test(`${overallProfile}\n${relationshipNeeds}\n${personLists}`)) issues.push("MIND_READING_CERTAINTY");
    }
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
  const currentCritical = criticalIssues(current.qualityIssues).length;
  const nextCritical = criticalIssues(next.qualityIssues).length;
  if (nextCritical < currentCritical) return next;
  if (nextCritical > currentCritical) return current;
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
    : `\n\n[JSON 출력 규칙]\n아래 JSON Schema와 정확히 같은 키 구조의 JSON 객체 하나만 출력하세요. 마크다운 코드펜스와 앞뒤 설명은 넣지 마세요. 문자열 값은 자연스럽고 구체적인 한국어로 작성하세요.\n${JSON.stringify(args.schema)}`;

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
  const isLongSegment = args.label === "DYNAMICS" || args.label === "ACTION";
  const requestedTimeoutMs = Math.max(args.timeoutMs ?? (isLongSegment ? 60_000 : 45_000), 30_000);
  const perAttemptTimeoutMs = Math.min(requestedTimeoutMs, isLongSegment ? 75_000 : 60_000);
  const totalBudgetMs = perAttemptTimeoutMs;
  const maxAttempts = 1;
  const startedAt = Date.now();
  const allUsage: AnthropicRawUsage[] = [];
  let lastFailure = "UNKNOWN";
  let lastQualityIssues: string[] = [];
  const autoStructuredHaiku45 = args.preferStructured === false
    && args.model.startsWith("claude-haiku-4-5");
  let structuredRejected = args.preferStructured !== true && !autoStructuredHaiku45;
  let bestQualityCandidate: SegmentAttempt<T> | null = null;
  const segmentSafetyRule = args.label === "DYNAMICS"
    ? [
        "[필수 출력 경계]",
        "역할 공급도, 배우자 역할 점수, 유용신 적합도, 범위값, aRoleSupply, bRoleSupply, weightedPoints, maxPoints 같은 내부 지표명은 출력하지 마세요.",
        "친구·직장동료 관계에서는 연애·성적 프레임을 섞지 마세요.",
      ].join("\n")
    : "";
  const baseSystem = segmentSafetyRule ? `${args.system}\n\n${segmentSafetyRule}` : args.system;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remainingBudgetMs = Math.max(1_000, totalBudgetMs - (Date.now() - startedAt));
    const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remainingBudgetMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
    try {
      const retryReason = lastFailure === "QUALITY_SHORTFALL"
        ? `직전 응답은 다음 출시 차단 이슈를 포함했습니다: ${lastQualityIssues.join(", ")}. JSON 구조를 유지하면서 개발자용 내부값과 관계 유형에 맞지 않는 문구만 제거하세요.`
        : "직전 응답을 사용할 수 없었습니다. JSON 구조를 정확히 지키고 완결된 객체를 출력하세요.";
      const expandedSystem = attempt === 1 ? baseSystem : `${baseSystem}\n\n[재시도 지시] ${retryReason}`;
      const firstAttemptMaxTokens = args.label === "INTRO"
        ? Math.min(args.maxTokens, 4_400)
        : args.label === "DYNAMICS" || args.label === "ACTION"
          ? Math.min(args.maxTokens, 5_000)
          : args.maxTokens;
      const attemptMaxTokens = firstAttemptMaxTokens;

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

      if (!result.response.ok && isCreditBalanceLow(result.body)) {
        throw new Error("ANTHROPIC_CREDIT_BALANCE_LOW");
      }

      if (!result.response.ok && result.response.status === 400 && !structuredRejected) {
        structuredRejected = true;
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
        if (isCreditBalanceLow(body)) throw new Error("ANTHROPIC_CREDIT_BALANCE_LOW");
        lastFailure = `HTTP_${response.status}_${safeError(body)}`;
        console.warn("[woorigunghap:v6-segment-http]", JSON.stringify({
          label: args.label,
          attempt,
          status: response.status,
          reason: safeError(body),
          detail: safeErrorDetail(body),
        }));
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

      const normalizedValue = normalizeNarrativeNameTokenDensity(parsed) as T;
      const candidateValue = (args.label === "INTRO"
        ? groundPaidIntroWithServerEvidence(normalizedValue, args.user)
        : normalizedValue) as T;
      const issues = [...new Set([
        ...args.qualityIssues(candidateValue),
        ...collectPaidNarrativeQualityIssues(candidateValue, args.label, args.user),
      ])];
      const candidate: SegmentAttempt<T> = {
        value: candidateValue,
        usage: body?.usage ?? null,
        characters: collectCharacters(candidateValue),
        qualityIssues: issues,
      };
      const critical = criticalIssues(issues);

      if (issues.length) {
        console.warn("[woorigunghap:v6-segment-quality-warning]", JSON.stringify({
          label: args.label,
          attempt,
          characters: candidate.characters,
          issues,
          critical,
        }));
      }

      if (critical.length === 0) {
        return { best: candidate, attempts: attempt, allUsage };
      }

      bestQualityCandidate = betterCandidate(bestQualityCandidate, candidate);
      lastFailure = "QUALITY_SHORTFALL";
      lastQualityIssues = critical;
      if (attempt < maxAttempts) continue;
      throw new Error(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_CRITICAL_${critical.join("_")}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "ANTHROPIC_CREDIT_BALANCE_LOW") throw error;
      if (message.startsWith(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_CRITICAL_`)) throw error;
      lastFailure = error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "REQUEST_FAILED";
      console.warn("[woorigunghap:v6-segment-request]", JSON.stringify({
        label: args.label,
        attempt,
        reason: lastFailure,
        timeoutMs: attemptTimeoutMs,
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (bestQualityCandidate) {
    const critical = criticalIssues(bestQualityCandidate.qualityIssues);
    if (critical.length === 0) return { best: bestQualityCandidate, attempts: maxAttempts, allUsage };
    throw new Error(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_CRITICAL_${critical.join("_")}`);
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
