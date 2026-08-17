import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  generatePaidReportSegmentV7,
  PAID_REPORT_SEGMENTS,
  type PaidReportSegmentContent,
  type PaidReportSegmentMeta,
  type PaidReportSegmentName,
} from "../src/lib/narrative/report-engine-v7";
import { personalizeNarrativeNames } from "../src/lib/narrative/name-personalization";
import type { OneToOneReportInput } from "../src/lib/report-input";

function sampleInput(): OneToOneReportInput {
  const mode = process.env.QA_SAMPLE === "coworker-boss" ? "coworker-boss" : "lover";
  const common = {
    personA: {
      displayName: "지민",
      gender: "male" as const,
      calendarType: "solar" as const,
      birthDate: "1990-05-15",
      birthTimeKnown: true,
      birthTime: "14:30",
      isLeapMonth: false,
    },
    personB: {
      displayName: "서윤",
      gender: "female" as const,
      calendarType: "solar" as const,
      birthDate: "1992-10-24",
      birthTimeKnown: false,
      birthTime: null,
      isLeapMonth: false,
    },
  };

  if (mode === "coworker-boss") {
    return {
      relationshipType: "coworker",
      coworkerHierarchy: "boss",
      relationshipDurationMonths: 14,
      mostCurious: "회의에서 의견이 다를 때 상사에게 어떤 순서로 말하는 게 좋을까요?",
      ...common,
    };
  }
  return {
    relationshipType: "lover",
    relationshipDurationMonths: 26,
    mostCurious: "싸운 뒤 대화가 길어질 때 누가 어떤 방식으로 먼저 회복 신호를 보내는 게 좋을까요?",
    ...common,
  };
}

function compactCharacters(value: unknown): number {
  if (typeof value === "string") return value.replace(/\s/g, "").length;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + compactCharacters(item), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + compactCharacters(item), 0);
  }
  return 0;
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join("\n");
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map(textOf).join("\n");
  return "";
}

type SampleMeta = { segment: PaidReportSegmentName } & PaidReportSegmentMeta;

async function main() {
  assert.ok(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY가 있어야 실제 Claude 샘플 QA를 실행할 수 있습니다.");
  process.env.REPORT_NARRATIVE_MODE = "anthropic";

  const input = sampleInput();
  const snapshot = calculateOneToOneCompatibility(input);
  const contents: PaidReportSegmentContent[] = [];
  const metas: SampleMeta[] = [];
  const outputPath = process.env.QA_OUTPUT_PATH;

  function writeProgress(status: "partial" | "complete", error: string | null = null) {
    if (!outputPath) return;
    const merged = Object.assign({}, ...contents) as Record<string, unknown>;
    const personalized = personalizeNarrativeNames(merged, {
      self: input.personA.displayName,
      partner: input.personB.displayName,
    });
    const absolute = resolve(outputPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify({
      status,
      error,
      segmentsCompleted: metas.map((meta) => meta.segment),
      metas,
      report: personalized,
    }, null, 2), "utf8");
    console.log(`[sample-qa] ${status} sample written: ${absolute}`);
  }

  for (const segment of PAID_REPORT_SEGMENTS) {
    try {
      const generated = await generatePaidReportSegmentV7(snapshot, input, segment);
      contents.push(generated.content);
      metas.push({ segment, ...generated.meta });
      console.log(`[sample-qa] ${segment}: ${generated.meta.qualityCharacters} chars, attempts=${generated.meta.attempt}, warnings=${generated.meta.qualityWarnings.join(",") || "none"}`);
      writeProgress("partial");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      writeProgress("partial", reason);
      throw error;
    }
  }

  const merged = Object.assign({}, ...contents) as Record<string, unknown>;
  const personalized = personalizeNarrativeNames(merged, {
    self: input.personA.displayName,
    partner: input.personB.displayName,
  });
  const text = textOf(personalized);
  const totalCharacters = compactCharacters(personalized);
  const qualityWarnings = metas.flatMap((meta) => meta.qualityWarnings);
  const selfMentions = text.split("지민님").length - 1;
  const partnerMentions = text.split("서윤님").length - 1;

  const summary = {
    qaSample: process.env.QA_SAMPLE === "coworker-boss" ? "coworker-boss" : "lover",
    relationshipType: input.relationshipType,
    relationshipDurationMonths: input.relationshipDurationMonths ?? null,
    hasUserQuestion: Boolean(input.mostCurious),
    score: snapshot.score,
    uncertaintyRange: snapshot.uncertaintyRange,
    scenarioCount: snapshot.scenarioPolicy.pairScenarios,
    totalCharacters,
    selfMentions,
    partnerMentions,
    segments: metas.map((meta) => ({
      segment: meta.segment,
      attempt: meta.attempt,
      qualityCharacters: meta.qualityCharacters,
      qualityWarnings: meta.qualityWarnings,
      usage: meta.usage,
    })),
  };

  if (outputPath) {
    const absolute = resolve(outputPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify({ status: "complete", summary, report: personalized }, null, 2), "utf8");
    console.log(`[sample-qa] full sample written: ${absolute}`);
  }

  assert.equal(qualityWarnings.length, 0, `재시도 후에도 품질 경고가 남았습니다: ${qualityWarnings.join(", ")}`);
  assert.ok(totalCharacters >= 13_000, `전체 상세 해설 최소 분량 미달: ${totalCharacters} chars`);
  assert.ok(selfMentions > 0, "서버 후처리 후 '지민님' 호칭이 한 번 이상 보여야 합니다.");
  assert.ok(partnerMentions > 0, "서버 후처리 후 '서윤님' 호칭이 한 번 이상 보여야 합니다.");
  assert.match(text, /가장 궁금한 점에 대한 답/, "사용자가 질문을 입력한 샘플은 CH4에서 직접 답변 항목을 생성해야 합니다.");
  assert.doesNotMatch(text, /(^|[^A-Za-z가-힣0-9])[AB]([^A-Za-z가-힣0-9]|$)/, "개발자용 A/B 표기가 사용자 문장에 남으면 안 됩니다.");
  assert.doesNotMatch(text, /(무조건|100%|틀림없이|운명적으로 정해)/, "단정적·운명론적 표현이 남으면 안 됩니다.");

  console.log(JSON.stringify(summary, null, 2));
  console.log("1:1 real Anthropic sample QA: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
