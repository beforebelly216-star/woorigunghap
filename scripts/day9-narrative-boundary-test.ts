import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  buildNarrativeAiPayload,
  buildTemplateNarrative,
  generateCompatibilityNarrative,
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
    birthTime: "14:30",
    isLeapMonth: false,
  },
  personB: {
    displayName: "테스트B",
    gender: "female",
    calendarType: "solar",
    birthDate: "1992-10-24",
    birthTimeKnown: true,
    birthTime: "05:30",
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

  for (const forbidden of [
    "테스트A",
    "테스트B",
    "1990-05-15",
    "1992-10-24",
    "14:30",
    "05:30",
    "paymentId",
    "orderId",
  ]) {
    assert(!serialized.includes(forbidden), `AI payload 개인정보 경계 실패: ${forbidden}`);
  }

  assert(snapshot.aiBoundary.scoreMutableByAi === false, "AI가 점수를 변경할 수 없어야 합니다.");
  assert(snapshot.aiBoundary.rankingMutableByAi === false, "AI가 순위를 변경할 수 없어야 합니다.");

  const template = buildTemplateNarrative(snapshot);
  assert(template.headline.length > 0, "template headline이 비어 있습니다.");
  assert(template.summary.length > 0, "template summary가 비어 있습니다.");
  assert(template.practicalGuide.first.length > 0, "template guide가 비어 있습니다.");

  const generated = await generateCompatibilityNarrative(snapshot, { modeOverride: "template" });
  assert(generated.meta.mode === "template", "강제 template 모드는 API를 호출하면 안 됩니다.");
  assert(generated.meta.model === null, "template 모드는 모델명이 없어야 합니다.");
  assert(generated.meta.fallbackReason === null, "정상 template에는 fallbackReason이 없어야 합니다.");

  const previousMode = process.env.REPORT_NARRATIVE_MODE;
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.REPORT_NARRATIVE_MODE = "openai";
  delete process.env.OPENAI_API_KEY;
  const fallback = await generateCompatibilityNarrative(snapshot);
  assert(fallback.meta.mode === "template", "OpenAI 키 미설정 시 template fallback이어야 합니다.");
  assert(fallback.meta.fallbackReason === "OPENAI_API_KEY_MISSING", "키 미설정 fallback 사유가 달라요.");

  if (previousMode === undefined) delete process.env.REPORT_NARRATIVE_MODE;
  else process.env.REPORT_NARRATIVE_MODE = previousMode;
  if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousKey;

  console.log("Day 9 narrative boundary: PASS");
  console.log(`score=${snapshot.score}, relation=${snapshot.relationshipType}, prompt=narrative-prompt-v1`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
