import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import { prepareCompatibilityPerson } from "@/lib/compatibility/simple-dimensions";
import type { FiveElement } from "@/lib/compatibility/types";
import type { OneToOneReportInput } from "@/lib/report-input";
import {
  DEFAULT_REPORT_MODEL,
  REPORT_EVIDENCE_PACK_VERSION,
  buildReportEvidencePack,
  calculateAnthropicUsageCost,
  type NarrativeUsage,
} from "@/lib/narrative/report-engine";

export const PAID_REPORT_PROMPT_VERSION = "paid-report-v5-longform" as const;
export const PAID_REPORT_PAYLOAD_VERSION = "paid-report-evidence-v2" as const;

const ANTHROPIC_TIMEOUT_MS = 90_000;
const MAX_OUTPUT_TOKENS = 6500;
const ELEMENTS: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

const STEM_ELEMENT: Record<string, FiveElement> = {
  갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth",
  기: "earth", 경: "metal", 신: "metal", 임: "water", 계: "water",
};

const BRANCH_ELEMENT: Record<string, FiveElement> = {
  자: "water", 축: "earth", 인: "wood", 묘: "wood", 진: "earth", 사: "fire",
  오: "fire", 미: "earth", 신: "metal", 유: "metal", 술: "earth", 해: "water",
};

export type PillarFact = {
  korean: string;
  hanja: string;
  stem: string;
  branch: string;
};

export type BasicPersonFacts = {
  birthTimeKnown: boolean;
  pillars: {
    year: PillarFact | null;
    month: PillarFact | null;
    day: PillarFact;
    hour: PillarFact | null;
  };
  visibleElementCounts: Record<FiveElement, number>;
  visibleCharacterCount: number;
  weightedElementShares: Record<FiveElement, number>;
  countBasisNote: string;
};

export type PaidReportFacts = {
  A: BasicPersonFacts;
  B: BasicPersonFacts;
};

export type DetailedPersonChapter = {
  overallProfile: string;
  elementAnalysis: string;
  relationshipNeeds: string;
  strengths: string[];
  cautions: string[];
};

export type DetailedReportContent = {
  overview: {
    headline: string;
    detailedSummary: string;
  };
  personA: DetailedPersonChapter;
  personB: DetailedPersonChapter;
  chemistry: {
    overview: string;
    dayMaster: string;
    dayBranch: string;
    yinYang: string;
    elements: string;
  };
  bondAndFriction: {
    overview: string;
    positiveInteractions: string[];
    frictionInteractions: string[];
    realLifeManifestations: string[];
  };
  directionalImpact: {
    overview: string;
    aToB: string;
    bToA: string;
    beneficialSupply: string;
    burdenSupply: string;
    asymmetry: string;
  };
  relationshipFlow: {
    overview: string;
    roles: string;
    initiative: string;
    intimacy: string;
    conflictScenarios: Array<{
      situation: string;
      likelyPattern: string;
      response: string;
    }>;
  };
  relationshipSpecific: {
    overview: string;
    points: Array<{
      title: string;
      detail: string;
    }>;
  };
  strengthsAndRisks: {
    strengths: string[];
    repeatedFrictions: string[];
    redFlag: string;
    warning: string;
  };
  practicalManual: {
    do: string[];
    dont: string[];
    conflictProtocol: string[];
    recommendedActivities: string[];
  };
};

export type DetailedReportMeta = {
  provider: "anthropic";
  model: string;
  promptVersion: typeof PAID_REPORT_PROMPT_VERSION;
  payloadVersion: typeof PAID_REPORT_PAYLOAD_VERSION;
  evidencePackVersion: typeof REPORT_EVIDENCE_PACK_VERSION;
  attempts: number;
  qualityCharacters: number;
  usage: NarrativeUsage | null;
  payloadBytes: number;
};

export type DetailedReportGenerationResult = {
  content: DetailedReportContent;
  facts: PaidReportFacts;
  meta: DetailedReportMeta;
};

const STRING_ARRAY = { type: "array", items: { type: "string" } } as const;

const PERSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallProfile: { type: "string" },
    elementAnalysis: { type: "string" },
    relationshipNeeds: { type: "string" },
    strengths: STRING_ARRAY,
    cautions: STRING_ARRAY,
  },
  required: ["overallProfile", "elementAnalysis", "relationshipNeeds", "strengths", "cautions"],
} as const;

const PAID_REPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overview: objectSchema({ headline: { type: "string" }, detailedSummary: { type: "string" } }),
    personA: PERSON_SCHEMA,
    personB: PERSON_SCHEMA,
    chemistry: objectSchema({
      overview: { type: "string" }, dayMaster: { type: "string" }, dayBranch: { type: "string" },
      yinYang: { type: "string" }, elements: { type: "string" },
    }),
    bondAndFriction: objectSchema({
      overview: { type: "string" },
      positiveInteractions: STRING_ARRAY,
      frictionInteractions: STRING_ARRAY,
      realLifeManifestations: STRING_ARRAY,
    }),
    directionalImpact: objectSchema({
      overview: { type: "string" }, aToB: { type: "string" }, bToA: { type: "string" },
      beneficialSupply: { type: "string" }, burdenSupply: { type: "string" }, asymmetry: { type: "string" },
    }),
    relationshipFlow: {
      type: "object",
      additionalProperties: false,
      properties: {
        overview: { type: "string" }, roles: { type: "string" }, initiative: { type: "string" }, intimacy: { type: "string" },
        conflictScenarios: {
          type: "array",
          items: objectSchema({ situation: { type: "string" }, likelyPattern: { type: "string" }, response: { type: "string" } }),
        },
      },
      required: ["overview", "roles", "initiative", "intimacy", "conflictScenarios"],
    },
    relationshipSpecific: {
      type: "object",
      additionalProperties: false,
      properties: {
        overview: { type: "string" },
        points: { type: "array", items: objectSchema({ title: { type: "string" }, detail: { type: "string" } }) },
      },
      required: ["overview", "points"],
    },
    strengthsAndRisks: objectSchema({
      strengths: STRING_ARRAY,
      repeatedFrictions: STRING_ARRAY,
      redFlag: { type: "string" },
      warning: { type: "string" },
    }),
    practicalManual: objectSchema({
      do: STRING_ARRAY,
      dont: STRING_ARRAY,
      conflictProtocol: STRING_ARRAY,
      recommendedActivities: STRING_ARRAY,
    }),
  },
  required: [
    "overview", "personA", "personB", "chemistry", "bondAndFriction", "directionalImpact",
    "relationshipFlow", "relationshipSpecific", "strengthsAndRisks", "practicalManual",
  ],
} as const;

function objectSchema(properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  } as const;
}

function round(value: number, digits = 1) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function pillarFact(pillar: { korean: string; hanja: string; heavenlyStem: string; earthlyBranch: string } | null): PillarFact | null {
  if (!pillar) return null;
  return {
    korean: pillar.korean,
    hanja: pillar.hanja,
    stem: pillar.heavenlyStem,
    branch: pillar.earthlyBranch,
  };
}

function emptyCounts(): Record<FiveElement, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

function visibleCounts(pillars: BasicPersonFacts["pillars"]) {
  const counts = emptyCounts();
  let visibleCharacterCount = 0;
  for (const pillar of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    if (!pillar) continue;
    const stemElement = STEM_ELEMENT[pillar.stem];
    const branchElement = BRANCH_ELEMENT[pillar.branch];
    if (stemElement) { counts[stemElement] += 1; visibleCharacterCount += 1; }
    if (branchElement) { counts[branchElement] += 1; visibleCharacterCount += 1; }
  }
  return { counts, visibleCharacterCount };
}

function buildPersonFacts(input: OneToOneReportInput["personA"]): BasicPersonFacts {
  const prepared = prepareCompatibilityPerson(input);
  const pillars: BasicPersonFacts["pillars"] = {
    year: pillarFact(prepared.snapshot.pillars.year),
    month: pillarFact(prepared.snapshot.pillars.month),
    day: pillarFact(prepared.snapshot.pillars.day)!,
    hour: pillarFact(prepared.snapshot.pillars.hour),
  };
  const visible = visibleCounts(pillars);
  const weightedElementShares = Object.fromEntries(ELEMENTS.map((element) => [
    element,
    round(prepared.elementShares[element] * 100, 1),
  ])) as Record<FiveElement, number>;
  return {
    birthTimeKnown: input.birthTimeKnown,
    pillars,
    visibleElementCounts: visible.counts,
    visibleCharacterCount: visible.visibleCharacterCount,
    weightedElementShares,
    countBasisNote: input.birthTimeKnown
      ? "오행 개수는 사주 8글자의 겉오행 기준이며, 실제 해석은 지장간까지 반영한 세력 비중을 함께 봅니다."
      : `출생시간 미상으로 시주를 제외한 확정 ${visible.visibleCharacterCount}글자의 겉오행 개수입니다. 실제 해석은 시간 미상 시나리오와 지장간 세력을 함께 봅니다.`,
  };
}

export function buildPaidReportFacts(input: OneToOneReportInput): PaidReportFacts {
  return { A: buildPersonFacts(input.personA), B: buildPersonFacts(input.personB) };
}

function buildPayload(snapshot: CompatibilityCalculationSnapshot, input: OneToOneReportInput) {
  return {
    payloadVersion: PAID_REPORT_PAYLOAD_VERSION,
    facts: buildPaidReportFacts(input),
    evidence: buildReportEvidencePack(snapshot, input),
  };
}

function systemPrompt(strictExpansion: boolean) {
  return [
    "당신은 '우리궁합'의 1,000원 유료 관계 사주 리포트를 쓰는 한국어 전문 편집자입니다.",
    "목표는 짧은 점수 설명이 아니라, 사용자가 '우리 둘의 이야기'라고 느낄 정도로 구체적이고 읽을 가치가 있는 상세 리포트입니다.",
    "서버가 이미 점수와 명리 근거를 계산했습니다. payload 밖의 새로운 합충, 용신, 점수, 순위, 미래 시기, 상대의 속마음을 만들어내지 마세요.",
    "facts.pillars와 오행 개수는 기본 정보 표시용입니다. 새로운 점수를 계산하는 근거로 임의 확장하지 말고 evidence의 계산 근거와 연결해 설명하세요.",
    "전체 출력은 보통 한국어 4,500~7,000자 정도의 충분한 분량을 목표로 하세요. 카드 한 줄짜리 요약문을 반복하면 안 됩니다.",
    "overview.detailedSummary는 반드시 4~5개의 완결된 문장으로 작성하고, 강점·마찰·양방향 영향·실전 의미가 한 흐름으로 이어져야 합니다.",
    "personA와 personB는 각각 overallProfile, elementAnalysis, relationshipNeeds를 합쳐 최소 8~12문장 수준의 읽을 거리가 되게 하세요. 두 사람의 문장 구조를 복사하지 마세요.",
    "오행은 '개수'와 '실질 세력 비중'을 구분하세요. 개수만으로 신강약이나 좋고 나쁨을 단정하지 마세요.",
    "chemistry는 일간·일지·음양·오행마다 '계산상 무엇이 보이는지 → 실제 관계에서 어떻게 체감될 수 있는지'를 쉬운 말로 연결하세요.",
    "bondAndFriction은 합(서로 묶이는 흐름), 충(서로 부딪히는 흐름), 형·해·파 등 evidence에 실제로 있는 근거만 사용하고, 대화·생활리듬·약속·감정표현·의사결정에서 어떻게 드러날 수 있는지 설명하세요.",
    "directionalImpact는 A→B와 B→A를 절대 합치지 마세요. 누가 누구의 필요한 기운을 채우는지, 반대로 어떤 기운은 부담으로 작용할 수 있는지 비대칭을 설명하세요.",
    "relationshipFlow는 역할, 주도권, 친밀해졌을 때의 변화와 최소 2개의 현실 갈등 시나리오를 작성하세요. 각 시나리오는 상황 → 반복 패턴 → 대응 순서가 있어야 합니다.",
    "relationshipSpecific은 relationshipType에 정확히 맞추고 최소 3개의 상세 포인트를 작성하세요. 친구라면 우정·약속·연락·공동활동, 연인이라면 애정표현·연락·데이트·갈등, 직장동료라면 역할·속도·의사결정·협업처럼 현실 항목을 다루세요.",
    "strengthsAndRisks는 핵심 강점 최소 2개, 반복 마찰 최소 2개, 레드 플래그와 과장 없는 경고를 작성하세요.",
    "practicalManual은 하면 좋은 것 최소 3개, 피할 것 최소 2개, 갈등 해결 순서 최소 3단계, 관계유형에 맞는 추천 활동 최소 3개를 제안하세요.",
    "세운·대운·특정 연도·월의 관계 타이밍은 절대 작성하지 마세요. 이번 상품에는 타이밍 예측 섹션이 없습니다.",
    "WEAK, STRONG, BALANCED, soft signal, confidence, medium/high/low, payload, engine 같은 내부 개발 용어를 사용자 문장에 노출하지 마세요.",
    "명리 용어를 쓰면 곧바로 쉬운 한국어 뜻을 붙이세요. 전문용어 자체보다 관계에서의 체감과 행동을 우선하세요.",
    "근거가 약한 것은 '그럴 수 있습니다', '가능성이 있습니다'처럼 표현하고 관계 성공/실패, 결혼, 상대의 마음을 확정적으로 예언하지 마세요.",
    "같은 조언을 여러 챕터에서 반복하지 말고 각 챕터에 새로운 정보와 새로운 상황 예시를 넣으세요.",
    strictExpansion
      ? "이 요청은 품질 재시도입니다. 이전 결과가 지나치게 짧았습니다. 모든 챕터를 충분히 확장하고 구체적인 상황·이유·행동법을 빠짐없이 써서 반드시 상세 리포트 분량을 확보하세요."
      : "첫 생성부터 완성된 유료 상세 리포트 수준으로 충분히 작성하세요.",
  ].join("\n");
}

function safeAnthropicError(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const root = body as { error?: unknown };
  if (!root.error || typeof root.error !== "object" || Array.isArray(root.error)) return null;
  const error = root.error as { type?: unknown; message?: unknown };
  return {
    type: typeof error.type === "string" ? error.type : "unknown",
    message: typeof error.message === "string" ? error.message.slice(0, 300) : "unknown",
  };
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

async function requestAnthropic(payloadText: string, apiKey: string, model: string, strictExpansion: boolean) {
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
        temperature: 0.5,
        system: systemPrompt(strictExpansion),
        messages: [{ role: "user", content: `다음 계산 결과만 근거로 유료 상세 궁합 리포트를 작성하세요.\n\n${payloadText}` }],
        output_config: { format: { type: "json_schema", schema: PAID_REPORT_SCHEMA } },
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const safeError = safeAnthropicError(body);
      console.warn("[woorigunghap:anthropic-v5-http-error]", JSON.stringify({ status: response.status, error: safeError }));
      throw new Error(`ANTHROPIC_HTTP_${response.status}${safeError ? `_${safeError.type}` : ""}`);
    }
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`ANTHROPIC_TIMEOUT_${ANTHROPIC_TIMEOUT_MS}`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isDetailedReport(value: unknown): value is DetailedReportContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as DetailedReportContent;
  return !!(
    r.overview && isString(r.overview.headline) && isString(r.overview.detailedSummary) &&
    r.personA && isString(r.personA.overallProfile) && isString(r.personA.elementAnalysis) && isString(r.personA.relationshipNeeds) && isStringArray(r.personA.strengths) && isStringArray(r.personA.cautions) &&
    r.personB && isString(r.personB.overallProfile) && isString(r.personB.elementAnalysis) && isString(r.personB.relationshipNeeds) && isStringArray(r.personB.strengths) && isStringArray(r.personB.cautions) &&
    r.chemistry && isString(r.chemistry.overview) && isString(r.chemistry.dayMaster) && isString(r.chemistry.dayBranch) && isString(r.chemistry.yinYang) && isString(r.chemistry.elements) &&
    r.bondAndFriction && isString(r.bondAndFriction.overview) && isStringArray(r.bondAndFriction.positiveInteractions) && isStringArray(r.bondAndFriction.frictionInteractions) && isStringArray(r.bondAndFriction.realLifeManifestations) &&
    r.directionalImpact && isString(r.directionalImpact.overview) && isString(r.directionalImpact.aToB) && isString(r.directionalImpact.bToA) && isString(r.directionalImpact.beneficialSupply) && isString(r.directionalImpact.burdenSupply) && isString(r.directionalImpact.asymmetry) &&
    r.relationshipFlow && isString(r.relationshipFlow.overview) && isString(r.relationshipFlow.roles) && isString(r.relationshipFlow.initiative) && isString(r.relationshipFlow.intimacy) && Array.isArray(r.relationshipFlow.conflictScenarios) &&
    r.relationshipSpecific && isString(r.relationshipSpecific.overview) && Array.isArray(r.relationshipSpecific.points) &&
    r.strengthsAndRisks && isStringArray(r.strengthsAndRisks.strengths) && isStringArray(r.strengthsAndRisks.repeatedFrictions) && isString(r.strengthsAndRisks.redFlag) && isString(r.strengthsAndRisks.warning) &&
    r.practicalManual && isStringArray(r.practicalManual.do) && isStringArray(r.practicalManual.dont) && isStringArray(r.practicalManual.conflictProtocol) && isStringArray(r.practicalManual.recommendedActivities)
  );
}

function collectStrings(value: unknown, output: string[] = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output));
  else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((item) => collectStrings(item, output));
  return output;
}

function qualityIssues(content: DetailedReportContent) {
  const totalCharacters = collectStrings(content).reduce((sum, text) => sum + text.replace(/\s/g, "").length, 0);
  const issues: string[] = [];
  if (totalCharacters < 3600) issues.push(`TOTAL_CHARS_${totalCharacters}`);
  if (content.overview.detailedSummary.length < 220) issues.push("OVERVIEW_TOO_SHORT");
  if (content.personA.overallProfile.length + content.personA.elementAnalysis.length + content.personA.relationshipNeeds.length < 520) issues.push("PERSON_A_TOO_SHORT");
  if (content.personB.overallProfile.length + content.personB.elementAnalysis.length + content.personB.relationshipNeeds.length < 520) issues.push("PERSON_B_TOO_SHORT");
  if (content.chemistry.overview.length < 160) issues.push("CHEMISTRY_TOO_SHORT");
  if (content.bondAndFriction.overview.length < 160) issues.push("BOND_TOO_SHORT");
  if (content.directionalImpact.overview.length < 160) issues.push("DIRECTION_TOO_SHORT");
  if (content.relationshipFlow.overview.length < 160) issues.push("FLOW_TOO_SHORT");
  if (content.relationshipFlow.conflictScenarios.length < 2) issues.push("CONFLICT_SCENARIOS_MISSING");
  if (content.relationshipSpecific.points.length < 3) issues.push("RELATIONSHIP_POINTS_MISSING");
  if (content.strengthsAndRisks.strengths.length < 2 || content.strengthsAndRisks.repeatedFrictions.length < 2) issues.push("STRENGTH_RISK_ITEMS_MISSING");
  if (content.practicalManual.do.length < 3 || content.practicalManual.dont.length < 2 || content.practicalManual.conflictProtocol.length < 3 || content.practicalManual.recommendedActivities.length < 3) issues.push("PRACTICAL_ITEMS_MISSING");
  return { totalCharacters, issues };
}

function usageFromBody(body: unknown): NarrativeUsage | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const usage = (body as { usage?: Parameters<typeof calculateAnthropicUsageCost>[0] }).usage;
  return usage ? calculateAnthropicUsageCost(usage) : null;
}

function combineUsage(usages: NarrativeUsage[]): NarrativeUsage | null {
  if (!usages.length) return null;
  const first = usages[0];
  const inputTokens = usages.reduce((sum, item) => sum + item.inputTokens, 0);
  const outputTokens = usages.reduce((sum, item) => sum + item.outputTokens, 0);
  const cacheCreationInputTokens = usages.reduce((sum, item) => sum + item.cacheCreationInputTokens, 0);
  const cacheReadInputTokens = usages.reduce((sum, item) => sum + item.cacheReadInputTokens, 0);
  const estimatedUsd = usages.reduce((sum, item) => sum + item.estimatedUsd, 0);
  const estimatedKrw = usages.reduce((sum, item) => sum + item.estimatedKrw, 0);
  return {
    inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens,
    estimatedUsd: round(estimatedUsd, 8), estimatedKrw: round(estimatedKrw, 2),
    usdKrwRate: first.usdKrwRate, pricing: first.pricing,
  };
}

export async function generateDetailedPaidReport(
  snapshot: CompatibilityCalculationSnapshot,
  input: OneToOneReportInput,
): Promise<DetailedReportGenerationResult> {
  if (process.env.REPORT_NARRATIVE_MODE !== "anthropic") throw new Error("REPORT_NARRATIVE_MODE_NOT_ANTHROPIC");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY_MISSING");
  const model = process.env.ANTHROPIC_NARRATIVE_MODEL?.trim() || DEFAULT_REPORT_MODEL;
  const payload = buildPayload(snapshot, input);
  const payloadText = JSON.stringify(payload);
  const payloadBytes = Buffer.byteLength(payloadText, "utf8");
  const facts = payload.facts;
  const usages: NarrativeUsage[] = [];
  let lastReason = "UNKNOWN";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const body = await requestAnthropic(payloadText, apiKey, model, attempt === 2);
      const usage = usageFromBody(body);
      if (usage) usages.push(usage);
      const outputText = extractAnthropicText(body);
      if (!outputText) throw new Error("ANTHROPIC_EMPTY_OUTPUT");
      let parsed: unknown;
      try { parsed = JSON.parse(outputText); } catch { throw new Error("ANTHROPIC_INVALID_JSON"); }
      if (!isDetailedReport(parsed)) throw new Error("ANTHROPIC_SCHEMA_MISMATCH");
      const quality = qualityIssues(parsed);
      if (quality.issues.length) {
        lastReason = `QUALITY_GATE_${quality.issues.join("|")}`;
        console.warn("[woorigunghap:paid-report-quality-retry]", JSON.stringify({ attempt, issues: quality.issues, totalCharacters: quality.totalCharacters }));
        if (attempt < 2) continue;
        throw new Error(lastReason);
      }
      const combinedUsage = combineUsage(usages);
      console.info("[woorigunghap:paid-report-v5-cost]", JSON.stringify({
        provider: "anthropic", model, promptVersion: PAID_REPORT_PROMPT_VERSION,
        payloadVersion: PAID_REPORT_PAYLOAD_VERSION, attempts: attempt,
        payloadBytes, qualityCharacters: quality.totalCharacters, usage: combinedUsage,
      }));
      return {
        content: parsed,
        facts,
        meta: {
          provider: "anthropic", model, promptVersion: PAID_REPORT_PROMPT_VERSION,
          payloadVersion: PAID_REPORT_PAYLOAD_VERSION, evidencePackVersion: REPORT_EVIDENCE_PACK_VERSION,
          attempts: attempt, qualityCharacters: quality.totalCharacters, usage: combinedUsage, payloadBytes,
        },
      };
    } catch (error) {
      lastReason = error instanceof Error ? error.message : "UNKNOWN";
      console.warn("[woorigunghap:paid-report-v5-attempt-failed]", JSON.stringify({ attempt, reason: lastReason, model }));
      if (attempt < 2) continue;
    }
  }

  throw new Error(`DETAILED_REPORT_GENERATION_FAILED_${lastReason}`);
}
