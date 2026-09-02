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
  "INTRO_DAY_PILLAR_MISMATCH",
  "INTRO_DAY_PILLAR_UNKNOWN_EXPOSED",
  "INTRO_ELEMENT_RANK_MISMATCH",
  "INTRO_UNSUPPORTED_NUMERIC_FACT",
  "GRAMMAR_DANGLING_PARTICLE",
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

export type PaidEditorialPillarFact = {
  korean: string;
  hanja: string;
  stem: string;
  branch: string;
};

export type PaidEditorialFactsPayload = Record<"A" | "B", {
  birthTimeKnown: boolean;
  dayPillar: PaidEditorialPillarFact;
}>;

export function formatPaidIntroDayPillar(value: unknown) {
  if (typeof value === "string") {
    const legacy = value.trim();
    return legacy || "일주 미확인";
  }
  if (!isPlainObject(value)) return "일주 미확인";
  const korean = typeof value.korean === "string" ? value.korean.trim() : "";
  const hanja = typeof value.hanja === "string" ? value.hanja.trim() : "";
  if (!korean) return "일주 미확인";
  return hanja ? `${korean}(${hanja})` : korean;
}

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

function expectedIntroElementLabels(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => INTRO_ELEMENT_LABELS[item] ?? item)
    .filter(Boolean);
}

function collectPaidIntroEvidenceIssues(value: unknown, userPrompt: string) {
  if (!isPlainObject(value)) return [];
  const payload = parseAiPayloadFromUserPrompt(userPrompt);
  if (!payload) return [];
  const factsRoot = isPlainObject(payload.facts) ? payload.facts : null;
  const evidenceRoot = isPlainObject(payload.evidence) ? payload.evidence : null;
  const persons = evidenceRoot && isPlainObject(evidenceRoot.persons) ? evidenceRoot.persons : null;
  const issues: string[] = [];

  for (const [factKey, personKey] of [["A", "personA"], ["B", "personB"]] as const) {
    const fact = factsRoot && isPlainObject(factsRoot[factKey]) ? factsRoot[factKey] : null;
    const evidence = persons && isPlainObject(persons[factKey]) ? persons[factKey] : null;
    const person = isPlainObject(value[personKey]) ? value[personKey] : null;
    if (!fact || !person) continue;

    const personText = collectStrings(person).join("\n");
    const dayPillar = isPlainObject(fact.dayPillar) ? fact.dayPillar : null;
    const korean = dayPillar && typeof dayPillar.korean === "string" ? dayPillar.korean.trim() : "";
    const hanja = dayPillar && typeof dayPillar.hanja === "string" ? dayPillar.hanja.trim() : "";
    const legacyDayPillar = typeof fact.dayPillar === "string" ? fact.dayPillar.trim() : "";
    const pillarMatches = legacyDayPillar
      ? personText.includes(legacyDayPillar)
      : Boolean(korean && personText.includes(korean) && (!hanja || personText.includes(hanja)));
    if (!pillarMatches) issues.push("INTRO_DAY_PILLAR_MISMATCH");

    const balance = evidence && isPlainObject(evidence.elementBalance) ? evidence.elementBalance : null;
    const strongest = expectedIntroElementLabels(balance?.dominantElements ?? balance?.strongest);
    const weakest = expectedIntroElementLabels(balance?.lighterElements ?? balance?.weakest);
    const elementAnalysis = typeof person.elementAnalysis === "string" ? person.elementAnalysis : "";
    if ((strongest.length && !strongest.some((label) => elementAnalysis.includes(label)))
      || (weakest.length && !weakest.some((label) => elementAnalysis.includes(label)))) {
      issues.push("INTRO_ELEMENT_RANK_MISMATCH");
    }

    if (/\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?\s*점/.test(personText)) {
      issues.push("INTRO_UNSUPPORTED_NUMERIC_FACT");
    }
  }

  return [...new Set(issues)];
}

function mapNarrativeStrings(value: unknown, transform: (text: string) => string): unknown {
  if (typeof value === "string") return transform(value);
  if (Array.isArray(value)) return value.map((item) => mapNarrativeStrings(item, transform));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, mapNarrativeStrings(item, transform)]),
  );
}

function sanitizeCriticalNarrativeText(text: string, relationshipType: string | null) {
  let sanitized = text
    .replace(/(^|[^A-Za-z0-9])A(?=(?:은|는|이|가|을|를|와|과|에게|의|도|만|쪽)|[^A-Za-z가-힣0-9]|$)/g, "$1{{SELF}}")
    .replace(/(^|[^A-Za-z0-9])B(?=(?:은|는|이|가|을|를|와|과|에게|의|도|만|쪽)|[^A-Za-z가-힣0-9]|$)/g, "$1{{PARTNER}}")
    .replace(/\bSTRONG\b/gi, "강한 흐름")
    .replace(/\bWEAK\b/gi, "가벼운 흐름")
    .replace(/\bBALANCED\b/gi, "균형 흐름")
    .replace(/\b(?:strongest|dominantElements)\b/gi, "두드러지는 기운")
    .replace(/\b(?:weakest|lighterElements)\b/gi, "가벼운 기운")
    .replace(/\bconfidence\b/gi, "해석 신뢰도")
    .replace(/\b(?:payload|evidence)\b/gi, "계산 근거")
    .replace(/soft signal/gi, "보조 흐름")
    .replace(/서버(?:에서)?\s*(?:계산상|가\s*제공한|에서\s*제공한)/g, "궁합 흐름상")
    .replace(/참고\s*(?:신호|값)/g, "관계 흐름")
    .replace(/역할 공급도|배우자 역할 점수|유용신 적합도|범위값|aRoleSupply|bRoleSupply|weightedPoints|maxPoints/g, "관계 영향")
    .replace(
      /(뚜렷|분명|확실|선명)하게\s+(?:\{\{(?:SELF|PARTNER|BOTH)\}\}|[가-힣A-Za-z0-9_-]{1,24}님)(?:과|와)\s*([.!?])/g,
      (_match, stem: string, punctuation: string) => `${stem}해${punctuation}`,
    );

  if (relationshipType === "friend" || relationshipType === "coworker") {
    sanitized = sanitized
      .replace(/데이트/g, "함께하는 시간")
      .replace(/썸을/g, "관계를")
      .replace(/연인 관계/g, "가까운 관계")
      .replace(/성적 긴장/g, "관계 긴장")
      .replace(/결혼 상대/g, "장기적인 관계 상대")
      .replace(/연애 감정/g, relationshipType === "coworker" ? "업무상 신뢰" : "친밀감");
  }
  if (relationshipType === "crush" || relationshipType === "flirting") {
    sanitized = sanitized
      .replace(/이미 교제 중?/g, "아직 관계를 확인하는 중")
      .replace(/연인으로서/g, "서로를 알아가는 사이로서")
      .replace(/결혼 생활/g, "장기적인 관계");
  }
  return sanitized.replace(/\s{2,}/g, " ").trim();
}

/**
 * Preserves AI prose while deterministically restoring facts that the server
 * already owns. This runs only as a final recovery after the model's retry.
 */
export function groundPaidIntroWithServerEvidence(value: unknown, userPrompt: string): unknown {
  if (!isPlainObject(value)) return value;
  const payload = parseAiPayloadFromUserPrompt(userPrompt);
  if (!payload) return value;
  const factsRoot = isPlainObject(payload.facts) ? payload.facts : null;
  const evidenceRoot = isPlainObject(payload.evidence) ? payload.evidence : null;
  const persons = evidenceRoot && isPlainObject(evidenceRoot.persons) ? evidenceRoot.persons : null;
  const grounded: Record<string, unknown> = { ...value };

  for (const [factKey, personKey] of [["A", "personA"], ["B", "personB"]] as const) {
    const fact = factsRoot && isPlainObject(factsRoot[factKey]) ? factsRoot[factKey] : null;
    const evidence = persons && isPlainObject(persons[factKey]) ? persons[factKey] : null;
    const sourcePerson = isPlainObject(value[personKey]) ? value[personKey] : null;
    if (!fact || !sourcePerson) continue;

    const person = mapNarrativeStrings(sourcePerson, (text) => text
      .replace(/\d+(?:\.\d+)?\s*%/g, "구체적인 비율")
      .replace(/\d+(?:\.\d+)?\s*점/g, "구체적인 점수")) as Record<string, unknown>;
    const dayPillar = formatPaidIntroDayPillar(fact.dayPillar);
    const personText = collectStrings(person).join("\n");
    if (dayPillar !== "일주 미확인" && !personText.includes(dayPillar)) {
      const profile = typeof person.overallProfile === "string" ? person.overallProfile : "";
      person.overallProfile = `${dayPillar} 일주의 기본 결을 바탕으로 보면, ${profile}`.trim();
    }
    if (dayPillar !== "일주 미확인") {
      person.overallProfile = String(person.overallProfile ?? "").replace(/일주\s*(?:는|가)?\s*미확인|일주\s*미확인/g, dayPillar);
    }

    const balance = evidence && isPlainObject(evidence.elementBalance) ? evidence.elementBalance : null;
    const strongest = expectedIntroElementLabels(balance?.dominantElements ?? balance?.strongest);
    const weakest = expectedIntroElementLabels(balance?.lighterElements ?? balance?.weakest);
    const analysis = typeof person.elementAnalysis === "string" ? person.elementAnalysis : "";
    const hasStrongest = strongest.length === 0 || strongest.some((label) => analysis.includes(label));
    const hasWeakest = weakest.length === 0 || weakest.some((label) => analysis.includes(label));
    if (!hasStrongest || !hasWeakest) {
      const strongText = strongest.length ? `${strongest.join("·")} 기운이 상대적으로 두드러지고` : "두드러지는 기운이 한쪽으로 쏠리지 않고";
      const weakText = weakest.length ? `${weakest.join("·")} 기운은 상대적으로 가볍습니다.` : "가벼운 기운도 뚜렷하지 않습니다.";
      person.elementAnalysis = `${strongText} ${weakText} ${analysis}`.trim();
    }
    grounded[personKey] = person;
  }

  return grounded;
}

export function repairPaidNarrativeForRelease(value: unknown, label: string, userPrompt: string): unknown {
  const relationshipType = relationshipFromPrompt(userPrompt);
  const sanitized = mapNarrativeStrings(value, (text) => sanitizeCriticalNarrativeText(text, relationshipType));
  return label === "INTRO" ? groundPaidIntroWithServerEvidence(sanitized, userPrompt) : sanitized;
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

export function describeJsonSchemaMismatch(value: unknown, schema: unknown, path = "$", limit = 8): string[] {
  const issues: string[] = [];
  const visit = (candidate: unknown, candidateSchema: unknown, candidatePath: string) => {
    if (issues.length >= limit || !isPlainObject(candidateSchema)) return;
    const shape = candidateSchema as JsonSchemaShape;
    if (shape.type === "string") {
      if (typeof candidate !== "string") issues.push(`${candidatePath}:expected_string`);
      return;
    }
    if (shape.type === "number") {
      if (typeof candidate !== "number" || !Number.isFinite(candidate)) issues.push(`${candidatePath}:expected_number`);
      return;
    }
    if (shape.type === "array") {
      if (!Array.isArray(candidate)) {
        issues.push(`${candidatePath}:expected_array`);
        return;
      }
      candidate.forEach((item, index) => visit(item, shape.items, `${candidatePath}[${index}]`));
      return;
    }
    if (shape.type !== "object") return;
    if (!isPlainObject(candidate) || !isPlainObject(shape.properties)) {
      issues.push(`${candidatePath}:expected_object`);
      return;
    }
    const required = Array.isArray(shape.required)
      ? shape.required.filter((key): key is string => typeof key === "string")
      : [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(candidate, key)) issues.push(`${candidatePath}.${key}:missing`);
      if (issues.length >= limit) return;
    }
    if (shape.additionalProperties === false) {
      const allowed = new Set(Object.keys(shape.properties));
      for (const key of Object.keys(candidate)) {
        if (!allowed.has(key)) issues.push(`${candidatePath}.${key}:unexpected`);
        if (issues.length >= limit) return;
      }
    }
    for (const [key, childSchema] of Object.entries(shape.properties)) {
      if (Object.prototype.hasOwnProperty.call(candidate, key)) visit(candidate[key], childSchema, `${candidatePath}.${key}`);
      if (issues.length >= limit) return;
    }
  };
  visit(value, schema, path);
  return issues;
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

function duplicateLongTextSamples(value: unknown) {
  const seen = new Map<string, number>();
  for (const source of collectStrings(value)) {
    const normalized = normalizeForDuplicateCheck(source);
    if (normalized.length < 40) continue;
    seen.set(normalized, (seen.get(normalized) ?? 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, count]) => count >= 2)
    .map(([text]) => text.slice(0, 120))
    .slice(0, 3);
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
  const minCharacters = label === "INTRO"
    ? 650
    : label === "DYNAMICS"
      ? 900
      : label === "ACTION"
        ? 1_050
        : 0;

  if (label === "INTRO") {
    issues.push(...collectPaidIntroEvidenceIssues(value, userPrompt));
    if (/일주\s*(?:는|가)?\s*미확인|일주\s*미확인/.test(joined)) issues.push("INTRO_DAY_PILLAR_UNKNOWN_EXPOSED");
  }
  if (minCharacters > 0 && characters < minCharacters) issues.push(`${label}_TOTAL_DENSITY_SHORT`);

  const duplicateCounts = new Map<string, number>();
  for (const source of strings) {
    const normalized = normalizeForDuplicateCheck(source);
    if (normalized.length < 40) continue;
    duplicateCounts.set(normalized, (duplicateCounts.get(normalized) ?? 0) + 1);
  }
  if ([...duplicateCounts.values()].some((count) => count >= 2)) issues.push("EXACT_LONG_TEXT_DUPLICATE");

  if (hasStandaloneDeveloperLabel(joined)) issues.push("DEVELOPER_LABEL_A_B_EXPOSED");
  if (/\b(WEAK|STRONG|BALANCED|confidence|strongest|weakest|dominantElements|lighterElements|payload|evidence)\b|soft signal|서버 계산상|서버가 제공한|서버에서 제공한|참고 신호|참고값/i.test(joined)) issues.push("INTERNAL_TERM_EXPOSED");
  if (/(역할 공급도|배우자 역할 점수|유용신 적합도|범위값|aRoleSupply|bRoleSupply|weightedPoints|maxPoints)/.test(joined)) issues.push("INTERNAL_METRIC_EXPOSED");
  const hedgingCount = joined.match(/(?:일 수 있습니다|가능성이 있습니다|보일 수 있습니다|느낄 수 있습니다|수도 있습니다)/g)?.length ?? 0;
  if (hedgingCount >= 5) issues.push("HEDGING_LANGUAGE_REPEATED");
  if (/(무조건|100%|확실히|틀림없이|반드시|운명적으로 정해|자동(?:으로|적)|확률이 높(?:아|습니다)|증명합니다|즉시[^.\n]{0,40}전환|바로[^.\n]{0,60}만듭니다)/.test(joined)) {
    issues.push("DETERMINISTIC_CERTAINTY");
  }
  if (/(무의식적|무의식적으로|내부적으로|내면화|내면에|내면은|갈망|사랑받을 자격|마음속에서|마음이 한 번 닫|상처에서 벗어나|선천적(?:으로)?|실제로는 감정|공감\s*능력|표현\s*능력[^.\n]{0,30}(?:제한|부족)|존재감[^.\n]{0,30}느끼|불안감[^.\n]{0,30}(?:낮아|높아)|심리 상태(?:입니다|다)|정말로[^.\n]{0,50}해서가 아니라)/.test(joined)) {
    issues.push("MIND_READING_CERTAINTY");
  }
  if (hasElementPsychologyOverreach(joined)) issues.push("ELEMENT_PSYCHOLOGY_OVERREACH");
  if (hasUnsupportedNumericPrescription(joined)) issues.push("UNSUPPORTED_NUMERIC_PRESCRIPTION");
  if (/(?:\{\{(?:SELF|PARTNER|BOTH)\}\}|[가-힣A-Za-z0-9_-]{1,24}님)(?:과|와|은|는|이|가|을|를|에게|의)\s*[.!?]/.test(joined)) {
    issues.push("GRAMMAR_DANGLING_PARTICLE");
  }
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

function isTransientAnthropicStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
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
    ...(args.model === "claude-sonnet-5" ? { thinking: { type: "disabled" } } : {}),
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
  retryMaxTokens?: number;
  timeoutMs?: number;
  preferStructured?: boolean;
  validate: (value: unknown) => value is T;
  qualityIssues: (value: T) => string[];
  label: string;
}): Promise<{ best: SegmentAttempt<T>; attempts: number; allUsage: AnthropicRawUsage[] }> {
  const perAttemptTimeoutMs = Math.max(args.timeoutMs ?? 75_000, 60_000);
  const totalBudgetMs = Math.min(240_000, perAttemptTimeoutMs * 2 + 10_000);
  const maxAttempts = 2;
  const startedAt = Date.now();
  const allUsage: AnthropicRawUsage[] = [];
  let lastFailure = "UNKNOWN";
  let lastQualityIssues: string[] = [];
  let lastDuplicateSamples: string[] = [];
  let lastSchemaIssues: string[] = [];
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
  const repairCandidate = (candidate: SegmentAttempt<T>) => {
    const repairedValue = repairPaidNarrativeForRelease(candidate.value, args.label, args.user) as T;
    const repairedIssues = [...new Set([
      ...args.qualityIssues(repairedValue),
      ...collectPaidNarrativeQualityIssues(repairedValue, args.label, args.user),
      "DETERMINISTIC_RELEASE_REPAIR_APPLIED",
    ])];
    return {
      ...candidate,
      value: repairedValue,
      characters: collectCharacters(repairedValue),
      qualityIssues: repairedIssues,
    };
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remainingBudgetMs = Math.max(1_000, totalBudgetMs - (Date.now() - startedAt));
    if (attempt > 1 && remainingBudgetMs < 30_000) break;
    const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remainingBudgetMs);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);
    const attemptStartedAt = Date.now();
    try {
      const duplicateDetail = lastDuplicateSamples.length
        ? ` 중복된 문장 예시: ${lastDuplicateSamples.map((item) => `[${item}]`).join(" / ")} 같은 문장을 다른 필드에 재사용하지 마세요.`
        : "";
      const retryReason = lastFailure === "QUALITY_SHORTFALL"
        ? `직전 응답은 다음 출시 차단 이슈를 포함했습니다: ${lastQualityIssues.join(", ")}.${duplicateDetail} JSON 구조를 유지하면서 해당 이슈를 제거하세요.`
        : lastFailure === "SCHEMA_MISMATCH" && lastSchemaIssues.length
          ? `직전 응답의 JSON 구조가 다음 위치에서 달랐습니다: ${lastSchemaIssues.join(", ")}. 스키마에 정의된 키와 타입만 사용하세요.`
          : "직전 응답을 사용할 수 없었습니다. JSON 구조를 정확히 지키고 완결된 객체를 출력하세요.";
      const expandedSystem = attempt === 1 ? baseSystem : `${baseSystem}\n\n[재시도 지시] ${retryReason}`;
      const retryMaxTokens = Math.max(args.maxTokens, args.retryMaxTokens ?? args.maxTokens);
      const attemptMaxTokens = attempt > 1 && lastFailure === "MAX_TOKENS"
        ? retryMaxTokens
        : args.maxTokens;

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
      const requestId = response.headers.get("request-id") ?? response.headers.get("x-request-id");
      if (!response.ok) {
        if (isCreditBalanceLow(body)) throw new Error("ANTHROPIC_CREDIT_BALANCE_LOW");
        lastFailure = `HTTP_${response.status}_${safeError(body)}`;
        console.warn("[woorigunghap:v6-segment-http]", JSON.stringify({
          label: args.label,
          attempt,
          status: response.status,
          reason: safeError(body),
          detail: safeErrorDetail(body),
          requestId,
          elapsedMs: Date.now() - attemptStartedAt,
        }));
        if (isTransientAnthropicStatus(response.status) && attempt < maxAttempts) {
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
        console.warn("[woorigunghap:v6-segment-truncated]", JSON.stringify({
          label: args.label,
          attempt,
          maxTokens: attemptMaxTokens,
          outputTokens: body.usage?.output_tokens ?? null,
          requestId,
          elapsedMs: Date.now() - attemptStartedAt,
        }));
        continue;
      }

      if (body?.stop_reason && body.stop_reason !== "end_turn") {
        lastFailure = `STOP_REASON_${body.stop_reason.replace(/[^A-Z0-9_-]/gi, "_").toUpperCase()}`;
        console.warn("[woorigunghap:v6-segment-stop-reason]", JSON.stringify({
          label: args.label,
          attempt,
          stopReason: body.stop_reason,
          outputTokens: body.usage?.output_tokens ?? null,
          requestId,
          elapsedMs: Date.now() - attemptStartedAt,
        }));
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
        console.warn("[woorigunghap:v6-segment-json]", JSON.stringify({
          label: args.label,
          attempt,
          responseCharacters: text.length,
          outputTokens: body?.usage?.output_tokens ?? null,
          requestId,
          elapsedMs: Date.now() - attemptStartedAt,
        }));
        continue;
      }
      const schemaIssues = describeJsonSchemaMismatch(parsed, args.schema);
      const customValid = args.validate(parsed);
      if (schemaIssues.length > 0 || !customValid) {
        lastFailure = "SCHEMA_MISMATCH";
        lastSchemaIssues = schemaIssues.length > 0 ? schemaIssues : ["$:custom_validator_rejected"];
        console.warn("[woorigunghap:v6-segment-schema]", JSON.stringify({
          label: args.label,
          attempt,
          schemaIssues: lastSchemaIssues,
          responseCharacters: text.length,
          outputTokens: body?.usage?.output_tokens ?? null,
          requestId,
          elapsedMs: Date.now() - attemptStartedAt,
        }));
        continue;
      }

      const normalizedValue = normalizeNarrativeNameTokenDensity(parsed) as T;
      const candidateValue = normalizedValue;
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
        console.info("[woorigunghap:v6-segment-attempt-complete]", JSON.stringify({
          label: args.label,
          attempt,
          maxTokens: attemptMaxTokens,
          outputTokens: body?.usage?.output_tokens ?? null,
          characters: candidate.characters,
          structured: !structuredRejected,
          requestId,
          elapsedMs: Date.now() - attemptStartedAt,
        }));
        return { best: candidate, attempts: attempt, allUsage };
      }

      bestQualityCandidate = betterCandidate(bestQualityCandidate, candidate);
      lastFailure = "QUALITY_SHORTFALL";
      lastQualityIssues = critical;
      lastDuplicateSamples = critical.includes("EXACT_LONG_TEXT_DUPLICATE")
        ? duplicateLongTextSamples(candidateValue)
        : [];
      if (attempt < maxAttempts) continue;
      const repairedCandidate = repairCandidate(candidate);
      const repairedCritical = criticalIssues(repairedCandidate.qualityIssues);
      console.warn("[woorigunghap:v6-segment-release-repair]", JSON.stringify({
        label: args.label,
        attempt,
        originalCritical: critical,
        remainingCritical: repairedCritical,
        characters: repairedCandidate.characters,
      }));
      if (repairedCritical.length === 0) {
        return { best: repairedCandidate, attempts: attempt, allUsage };
      }
      throw new Error(`ANTHROPIC_SEGMENT_${args.label}_QUALITY_CRITICAL_${repairedCritical.join("_")}`);
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
    const repairedCandidate = repairCandidate(bestQualityCandidate);
    const critical = criticalIssues(repairedCandidate.qualityIssues);
    console.warn("[woorigunghap:v6-segment-release-repair]", JSON.stringify({
      label: args.label,
      attempt: maxAttempts,
      originalCritical: criticalIssues(bestQualityCandidate.qualityIssues),
      remainingCritical: critical,
      characters: repairedCandidate.characters,
    }));
    if (critical.length === 0) return { best: repairedCandidate, attempts: maxAttempts, allUsage };
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
