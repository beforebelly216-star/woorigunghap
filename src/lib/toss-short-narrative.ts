import type { calculateTossBasicResult } from "./toss-basic-result";
import type { FullbuyChapter } from "./fullbuy-contract";

type Result = ReturnType<typeof calculateTossBasicResult>;
export type TossShortNarrative = { title: string; paragraphs: [string, string]; action: string; evidenceIds: [string, string] };
const chapters: Record<FullbuyChapter, string> = { conversation: "대화의 리듬", strengths: "함께할 때의 강점", conflict: "서로 맞춰볼 부분" };
const text = (value: unknown, min: number, max: number): value is string => typeof value === "string" && value.trim() === value && value.length >= min && value.length <= max;
export function tossShortPayload(result: Result, chapter: FullbuyChapter) {
  if (!Object.hasOwn(chapters, chapter)) throw new Error("invalid_chapter");
  // Deliberate allowlist: no aliases, birth inputs, account/network/member IDs.
  return { chapter: chapters[chapter], relationship: result.relationshipLabel,
    timeUnknown: result.timeUnknown,
    dimensions: result.dimensions.map(({ id, label, score }) => ({ id, label, score })),
    strengths: result.strengths.map(({ id }) => id), adjustments: result.adjustments.map(({ id }) => id) };
}
export function parseTossShortNarrative(raw: string, result: Result): TossShortNarrative {
  if (typeof raw !== "string" || raw.length > 4000) throw new Error("invalid_short_narrative");
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "action,evidenceIds,paragraphs,title" ||
    !text(value.title, 4, 40) || !text(value.action, 30, 180) ||
    !Array.isArray(value.paragraphs) || value.paragraphs.length !== 2 || !value.paragraphs.every((item: unknown) => text(item, 60, 300)) ||
    !Array.isArray(value.evidenceIds) || value.evidenceIds.length !== 2 || new Set(value.evidenceIds).size !== 2 ||
    !value.evidenceIds.every((id: unknown) => typeof id === "string" && result.dimensions.some(item => item.id === id))) throw new Error("invalid_short_narrative");
  const prose = [value.title, ...value.paragraphs, value.action].join(" ");
  // No numeric predictions/scores, URLs, HTML, financial or medical promises.
  if (/[0-9<>]|https?:|확실히|반드시 성공|운명적|수익 보장|투자 추천|질병|진단/.test(prose) ||
    value.paragraphs[0] === value.paragraphs[1]) throw new Error("unsafe_short_narrative");
  return value;
}
export const TOSS_SHORT_OUTPUT_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: { title: { type: "string" }, paragraphs: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" } },
    action: { type: "string" }, evidenceIds: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" } } },
  required: ["title", "paragraphs", "action", "evidenceIds"],
};
export const TOSS_SHORT_SYSTEM = `한국어 관계 해설을 작성하세요. 입력은 사주 엔진의 계산 지표이며 실제 성격이나 미래를 증명하지 않습니다.
두 사람은 '두 사람', '서로'로만 지칭하세요. 이름, 생년월일, 점수 숫자, 예언, 감정 단정, 의학·금융 조언, URL, HTML을 쓰지 마세요.
요청한 항목에 대해 제목(4~40자), 서로 다른 두 문단(각 60~300자), 확인해볼 구체적인 대화 행동(30~180자)을 작성하세요.
각 문단은 계산 지표를 관계의 가능성으로 조심스럽게 해석하고, 실제 경험을 대화로 확인하도록 안내하세요.
근거로 사용한 서로 다른 dimension id 두 개를 evidenceIds에 넣으세요. JSON 객체만 반환하세요.`;

export async function generateTossShortNarrative(options: {
  apiKey: string; result: Result; chapter: FullbuyChapter; signal: AbortSignal;
  fetcher?: typeof fetch;
}) {
  if (!options.apiKey) throw new Error("short_narrative_not_configured");
  const body = JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1000, thinking: { type: "disabled" },
    system: TOSS_SHORT_SYSTEM, messages: [{ role: "user", content: JSON.stringify(tossShortPayload(options.result, options.chapter)) }],
    output_config: { format: { type: "json_schema", schema: TOSS_SHORT_OUTPUT_SCHEMA } } });
  const response = await (options.fetcher ?? fetch)("https://api.anthropic.com/v1/messages", {
    method: "POST", signal: AbortSignal.any([options.signal, AbortSignal.timeout(45000)]),
    headers: { "content-type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": options.apiKey }, body,
  });
  if (!response.ok) throw new Error("short_narrative_provider_failed");
  const reader = response.body?.getReader(); if (!reader) throw new Error("short_narrative_empty");
  let raw = "";
  try {
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 65536) { await reader.cancel(); throw new Error("short_narrative_body_limit"); } chunks.push(value); }
    raw = Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
  const envelope = JSON.parse(raw);
  if (envelope.stop_reason !== "end_turn" || !Array.isArray(envelope.content) || envelope.content.length !== 1 || envelope.content[0]?.type !== "text") throw new Error("short_narrative_incomplete");
  const content = envelope.content[0].text;
  parseTossShortNarrative(content, options.result);
  const input = envelope.usage?.input_tokens, output = envelope.usage?.output_tokens;
  if (!Number.isSafeInteger(input) || input < 0 || !Number.isSafeInteger(output) || output < 0 || output > 1000) throw new Error("short_narrative_usage_invalid");
  return { content, usage: { inputTokens: input, outputTokens: output }, model: "claude-sonnet-5" as const };
}
