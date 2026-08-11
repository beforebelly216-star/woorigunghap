import {
  getRelationshipCalculationProfile,
  type RelationshipType,
} from "@/lib/report-input";

/**
 * AI는 이 파일의 입력만 받는다. 원본 생년월일시, 연락처, 결제정보는 절대 전달하지 않는다.
 * 만세력 계산과 점수 산출은 별도의 서버 전용 엔진이 담당한다.
 */

export const NARRATIVE_SECTION_IDS = [
  "bond",
  "attraction",
  "affection",
  "leadership",
  "intimacy",
  "marriage",
] as const;

export type NarrativeSectionId = (typeof NARRATIVE_SECTION_IDS)[number];
export type ReportNarrativeMode = "template" | "openai";

export type NarrativeCalculationSnapshot = {
  relationshipType: RelationshipType;
  reportType: "oneToOne" | "oneToMany";
  compatibilityEngineVersion: string;
  totalScore: number;
  scoreBand: "strong" | "good" | "neutral" | "caution";
  relationshipLabel: string;
  strengths: string[];
  adjustmentPoints: string[];
  scoreCards: Array<{ code: string; title: string; score: number; interpretation: string }>;
};

export type GeneratedNarratives = {
  provider: "template" | "openai";
  model: string | null;
  promptVersion: "report-narrative-v1";
  sections: Record<NarrativeSectionId, string>;
};

const sectionTitles: Record<NarrativeSectionId, string> = {
  bond: "우리는 인연일까?",
  attraction: "서로가 느끼는 매력",
  affection: "상대가 나를 더 좋아하게 만들려면",
  leadership: "연애 주도권 흐름",
  intimacy: "친밀 리듬 궁합",
  marriage: "두 사람이 결혼하면 어떤 모습일까?",
};

function sanitizeSnapshot(snapshot: NarrativeCalculationSnapshot) {
  return {
    relationshipType: snapshot.relationshipType,
    calculationProfile: getRelationshipCalculationProfile(snapshot.relationshipType),
    reportType: snapshot.reportType,
    compatibilityEngineVersion: snapshot.compatibilityEngineVersion,
    totalScore: snapshot.totalScore,
    scoreBand: snapshot.scoreBand,
    relationshipLabel: snapshot.relationshipLabel,
    strengths: snapshot.strengths.slice(0, 3),
    adjustmentPoints: snapshot.adjustmentPoints.slice(0, 3),
    scoreCards: snapshot.scoreCards.map(({ code, title, score, interpretation }) => ({ code, title, score, interpretation })),
  };
}

function templateNarratives(snapshot: NarrativeCalculationSnapshot): Record<NarrativeSectionId, string> {
  const strength = snapshot.strengths[0] ?? "서로의 다른 장점";
  const adjustment = snapshot.adjustmentPoints[0] ?? "표현과 기대의 기준";
  const isCaution = snapshot.scoreBand === "caution";

  return {
    bond: isCaution
      ? `${snapshot.relationshipLabel} 흐름에서는 서로를 느끼는 방식의 차이가 먼저 보일 수 있어요. 관계의 가능성을 단정하기보다 각자의 기준을 알아가는 과정이 중요합니다.`
      : `${snapshot.relationshipLabel}의 흐름이 보입니다. ${strength}을 함께 살릴수록 관계의 편안함과 신뢰가 더 선명해질 수 있어요.`,
    attraction: `서로에게서 익숙하지 않은 장점과 새로운 시선을 발견하기 쉬운 조합이에요. ${strength}이 자연스러운 매력 포인트가 될 수 있습니다.`,
    affection: `${adjustment}에 관한 바람을 추측하지 말고 짧고 구체적으로 표현해 보세요. 작은 확인과 꾸준한 약속이 호감을 안정감으로 바꿔줍니다.`,
    leadership: `상황에 따라 표현과 결정의 역할이 다르게 나타날 수 있어요. 한쪽에게 부담이 몰리지 않도록 중요한 선택은 이유와 기대를 함께 나눠보세요.`,
    intimacy: `가까워지는 속도와 휴식의 리듬을 서로 존중하는 것이 중요해요. 어떤 상황에서도 명확한 동의와 거절 신호를 가장 우선으로 해주세요.`,
    marriage: `결혼의 가능성이나 결과를 단정할 수는 없어요. 함께 살게 된다면 돈, 집안일, 휴식처럼 일상의 기준을 구체적으로 합의하는 것이 관계에 도움이 됩니다.`,
  };
}

function getMode(): ReportNarrativeMode {
  const configured = process.env.REPORT_NARRATIVE_MODE;
  return configured === "openai" ? "openai" : "template";
}

function responseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [...NARRATIVE_SECTION_IDS],
    properties: Object.fromEntries(NARRATIVE_SECTION_IDS.map((id) => [id, { type: "string", minLength: 80, maxLength: 260 }])),
  };
}

function parseSections(value: unknown): Record<NarrativeSectionId, string> | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const result = {} as Record<NarrativeSectionId, string>;
  for (const id of NARRATIVE_SECTION_IDS) {
    const section = candidate[id];
    if (typeof section !== "string" || section.trim().length < 20) return null;
    result[id] = section.trim();
  }
  return result;
}

export async function generateReportNarratives(snapshot: NarrativeCalculationSnapshot): Promise<GeneratedNarratives> {
  const calculationProfile = getRelationshipCalculationProfile(snapshot.relationshipType);
  if (calculationProfile !== "romance" || getMode() === "template") {
    return { provider: "template", model: null, promptVersion: "report-narrative-v1", sections: templateNarratives(snapshot) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) throw new Error("AI 리포트 설정이 비어 있습니다. OPENAI_API_KEY와 OPENAI_MODEL을 서버 환경변수에 입력해 주세요.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      instructions: [
        "당신은 한국어 관계 궁합 리포트의 서술 작가입니다.",
        "전달받은 계산 결과만 근거로 섹션별 문장을 작성하세요. 계산하거나 점수/확률을 새로 만들지 마세요.",
        "운명, 결혼 성패, 상대 마음을 확정적으로 단정하지 마세요. 의료·법률·금융 조언을 하지 마세요.",
        "친밀 섹션에서는 명확한 동의와 경계 존중을 우선으로 표현하세요.",
        "각 섹션은 자연스러운 한국어 2~3문장, 80~260자로 작성하세요. 이름·생년월일·개인식별정보를 요구하거나 만들지 마세요.",
      ].join("\n"),
      input: JSON.stringify({ task: "연애 관계 궁합 리포트 6개 섹션 작성", sectionTitles, calculationSnapshot: sanitizeSnapshot(snapshot) }),
      text: { format: { type: "json_schema", name: "relationship_report_sections", strict: true, schema: responseSchema() } },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`AI 리포트 생성 요청이 실패했습니다. (${response.status})`);

  const payload = (await response.json()) as { output_text?: unknown };
  if (typeof payload.output_text !== "string") throw new Error("AI 리포트 응답 형식이 올바르지 않습니다.");
  const sections = parseSections(JSON.parse(payload.output_text) as unknown);
  if (!sections) throw new Error("AI 리포트 섹션이 누락되었습니다.");
  return { provider: "openai", model, promptVersion: "report-narrative-v1", sections };
}
