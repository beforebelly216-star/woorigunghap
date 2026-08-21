import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  generatePaidReportSegmentV7,
  mergePaidReportSegmentContents,
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SampleMeta = { segment: PaidReportSegmentName; freshRequestAttempt: number } & PaidReportSegmentMeta;

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
    const merged = mergePaidReportSegmentContents(contents);
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

  async function generateWithFreshRequestRetry(segment: PaidReportSegmentName) {
    let lastError: unknown = null;
    for (let freshRequestAttempt = 1; freshRequestAttempt <= 3; freshRequestAttempt += 1) {
      try {
        const generated = await generatePaidReportSegmentV7(snapshot, input, segment);
        return { generated, freshRequestAttempt };
      } catch (error) {
        lastError = error;
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`[sample-qa] ${segment} fresh request ${freshRequestAttempt}/3 failed: ${reason}`);
        writeProgress("partial", `${segment} request ${freshRequestAttempt}/3: ${reason}`);
        if (reason.includes("CREDIT_BALANCE_LOW")) throw error;
        if (freshRequestAttempt < 3) await sleep(2_000 * freshRequestAttempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "UNKNOWN_SAMPLE_QA_ERROR"));
  }

  for (const segment of PAID_REPORT_SEGMENTS) {
    try {
      const { generated, freshRequestAttempt } = await generateWithFreshRequestRetry(segment);
      contents.push(generated.content);
      metas.push({ segment, freshRequestAttempt, ...generated.meta });
      console.log(`[sample-qa] ${segment}: ${generated.meta.qualityCharacters} chars, freshRequests=${freshRequestAttempt}, internalAttempts=${generated.meta.attempt}, warnings=${generated.meta.qualityWarnings.join(",") || "none"}`);
      writeProgress("partial");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      writeProgress("partial", reason);
      throw error;
    }
  }

  const merged = mergePaidReportSegmentContents(contents);
  const personalized = personalizeNarrativeNames(merged, {
    self: input.personA.displayName,
    partner: input.personB.displayName,
  });
  const text = textOf(personalized);
  const totalCharacters = compactCharacters(personalized);
  const qualityWarnings = metas.flatMap((meta) => meta.qualityWarnings);
  const selfMentions = text.split("지민님").length - 1;
  const partnerMentions = text.split("서윤님").length - 1;
  const totalNameMentions = selfMentions + partnerMentions;

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
    totalNameMentions,
    totalFreshRequests: metas.reduce((sum, meta) => sum + meta.freshRequestAttempt, 0),
    segments: metas.map((meta) => ({
      segment: meta.segment,
      freshRequestAttempt: meta.freshRequestAttempt,
      internalAttempt: meta.attempt,
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

  assert.equal(qualityWarnings.length, 0, `최종 채택 세그먼트에 품질 경고가 남았습니다: ${qualityWarnings.join(", ")}`);
  assert.ok(totalCharacters >= 5_000, `전체 상세 해설 최소 분량 미달: ${totalCharacters} chars`);
  assert.ok(totalCharacters <= 10_000, `전체 상세 해설 허용 분량 초과: ${totalCharacters} chars`);
  assert.ok(selfMentions > 0, "서버 후처리 후 '지민님' 호칭이 한 번 이상 보여야 합니다.");
  assert.ok(partnerMentions > 0, "서버 후처리 후 '서윤님' 호칭이 한 번 이상 보여야 합니다.");
  assert.ok(totalNameMentions <= Math.ceil(totalCharacters / 80), `이름 호칭이 과도하게 반복됩니다: ${totalNameMentions}/${totalCharacters}`);
  assert.match(text, /가장 궁금한 점에 대한 답/, "사용자가 질문을 입력한 샘플은 CH4에서 직접 답변 항목을 생성해야 합니다.");
  assert.doesNotMatch(text, /님(?:는|가|를|와)(?=[^가-힣]|$)/, "이름 뒤 한국어 조사가 받침과 맞지 않으면 안 됩니다.");
  assert.doesNotMatch(text, /(^|[^A-Za-z가-힣0-9])[AB]([^A-Za-z가-힣0-9]|$)/, "개발자용 A/B 표기가 사용자 문장에 남으면 안 됩니다.");
  assert.doesNotMatch(text, /(역할 공급도|배우자 역할 점수|유용신 적합도|범위값|aRoleSupply|bRoleSupply|weightedPoints|maxPoints)/, "내부 계산 지표명이 사용자 리포트에 노출되면 안 됩니다.");
  assert.doesNotMatch(text, /(20\d{2}년|\b대운\b|\b세운\b|월운)/, "AI 해설에는 서버 전용 미래 연도 타이밍이 섞이면 안 됩니다.");
  assert.doesNotMatch(text, /(무의식적|무의식적으로|내부적으로|내면화|갈망|사랑받을 자격|마음속에서|내면은|심리 상태(?:입니다|다))/, "상대의 숨은 마음을 사실처럼 확정하면 안 됩니다.");
  assert.doesNotMatch(text, /(무조건|100%|확실히|틀림없이|반드시|운명적으로 정해|자동(?:으로|적)|확률이 높(?:아|습니다)|증명합니다)/, "단정적·운명론적 표현이 남으면 안 됩니다.");
  assert.doesNotMatch(text, /(?:하루|주당|주)\s*\d+\s*(?:회|번)|\d+\s*(?:시간|분)\s*(?:뒤|후|간격)/, "서버 근거 없는 연락·회복 횟수나 시간 처방을 만들면 안 됩니다.");

  console.log(JSON.stringify(summary, null, 2));
  console.log("1:1 real Anthropic sample QA: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
