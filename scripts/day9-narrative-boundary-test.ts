import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  buildNarrativeAiPayload,
  buildTemplateNarrative,
  calculateAnthropicUsageCost,
  generateCompatibilityNarrative,
  NARRATIVE_PROMPT_VERSION,
} from "../src/lib/narrative/engine";
import type { OneToOneReportInput } from "../src/lib/report-input";

const input: OneToOneReportInput = {
  relationshipType: "lover",
  personA: {
    displayName: "테스트A",
    gender: "male",
    calendarType: "solar",
    birthDate: "1990-05-15",
    birthTimeKnown: true,
    birthTime: "14:17",
    isLeapMonth: false,
  },
  personB: {
    displayName: "테스트B",
    gender: "female",
    calendarType: "solar",
    birthDate: "1992-10-24",
    birthTimeKnown: true,
    birthTime: "05:43",
    isLeapMonth: false,
  },
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const snapshot = calculateOneToOneCompatibility(input);
  const payload = buildNarrativeAiPayload(snapshot);
  const serialized = JSON.stringify(payload);
  const fullSnapshot = JSON.stringify(snapshot);

  for (const forbidden of [
    "테스트A",
    "테스트B",
    "1990-05-15",
    "1992-10-24",
    "14:17",
    "05:43",
    "paymentId",
    "orderId",
    "birthDate",
    "birthTime",
  ]) {
    assert(!serialized.includes(forbidden), `AI payload 개인정보 경계 실패: ${forbidden}`);
  }

  assert(serialized.length < fullSnapshot.length, "compact payload가 full snapshot보다 작아야 합니다.");
  assert(Object.keys(payload.keyEvidence).length <= 4, "AI keyEvidence는 최대 4개 항목이어야 합니다.");
  assert(payload.aiBoundary.scoreMutableByAi === false, "AI가 점수를 변경할 수 없어야 합니다.");
  assert(payload.aiBoundary.rankingMutableByAi === false, "AI가 순위를 변경할 수 없어야 합니다.");

  const template = buildTemplateNarrative(snapshot);
  assert(template.headline.length > 0, "template headline이 비어 있습니다.");
  assert(template.summary.length > 0, "template summary가 비어 있습니다.");
  assert(template.practicalGuide.first.length > 0, "template guide가 비어 있습니다.");

  const generated = await generateCompatibilityNarrative(snapshot, { modeOverride: "template" });
  assert(generated.meta.mode === "template", "강제 template 모드는 API를 호출하면 안 됩니다.");
  assert(generated.meta.model === null, "template 모드는 모델명이 없어야 합니다.");
  assert(generated.meta.fallbackReason === null, "정상 template에는 fallbackReason이 없어야 합니다.");
  assert(generated.meta.payloadBytes > 0, "payload 크기가 기록되어야 합니다.");

  const previousMode = process.env.REPORT_NARRATIVE_MODE;
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.REPORT_NARRATIVE_MODE = "anthropic";
  delete process.env.ANTHROPIC_API_KEY;
  const fallback = await generateCompatibilityNarrative(snapshot);
  assert(fallback.meta.mode === "template", "Anthropic 키 미설정 시 template fallback이어야 합니다.");
  assert(
    fallback.meta.fallbackReason === "ANTHROPIC_API_KEY_MISSING",
    "키 미설정 fallback 사유가 달라요.",
  );

  if (previousMode === undefined) delete process.env.REPORT_NARRATIVE_MODE;
  else process.env.REPORT_NARRATIVE_MODE = previousMode;
  if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previousKey;

  const cost = calculateAnthropicUsageCost({ input_tokens: 2500, output_tokens: 900 }, 1450);
  assert(cost.estimatedUsd === 0.007, `Haiku 원가 계산 오류(USD): ${cost.estimatedUsd}`);
  assert(cost.estimatedKrw === 10.15, `Haiku 원가 계산 오류(KRW): ${cost.estimatedKrw}`);

  const reduction = Math.round((1 - serialized.length / fullSnapshot.length) * 1000) / 10;
  console.log("Day 9 Claude narrative boundary: PASS");
  console.log(
    `score=${snapshot.score}, prompt=${NARRATIVE_PROMPT_VERSION}, compact=${serialized.length} chars, ` +
    `full=${fullSnapshot.length} chars, reduction=${reduction}%, sampleCost=${cost.estimatedKrw} KRW`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
