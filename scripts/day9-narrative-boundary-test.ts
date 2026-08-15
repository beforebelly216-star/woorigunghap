import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  buildReportEvidencePack,
  buildTemplateNarrative,
  calculateAnthropicUsageCost,
  generateCompatibilityNarrative,
  REPORT_EVIDENCE_PACK_VERSION,
  REPORT_PROMPT_VERSION,
} from "../src/lib/narrative/report-engine";
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

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const snapshot = calculateOneToOneCompatibility(input);
  const pack = buildReportEvidencePack(snapshot, input);
  const serialized = JSON.stringify(pack);

  for (const forbiddenValue of ["테스트A", "테스트B", "1990-05-15", "1992-10-24", "14:17", "05:43"]) {
    assertCondition(!serialized.includes(forbiddenValue), `ReportEvidencePack 개인정보 값 노출: ${forbiddenValue}`);
  }
  for (const forbiddenKey of ["displayName", "paymentId", "orderId", "birthDate", "sourceDate", "solarDate"]) {
    assertCondition(!serialized.includes(`\"${forbiddenKey}\":`), `ReportEvidencePack 개인정보 키 노출: ${forbiddenKey}`);
  }
  assertCondition(!serialized.includes("\"birthTime\":"), "원본 birthTime 키는 AI payload에 포함되면 안 됩니다.");
  assertCondition(serialized.includes("\"birthTimeKnown\":"), "시간 미상 여부 플래그는 신뢰도 설명을 위해 유지합니다.");

  assertCondition(pack.payloadVersion === REPORT_EVIDENCE_PACK_VERSION, "payload version이 다릅니다.");
  assertCondition(pack.persons.A.dayMaster.stem.length > 0, "A 개인 분석용 일간이 필요합니다.");
  assertCondition(pack.persons.B.dayMaster.stem.length > 0, "B 개인 분석용 일간이 필요합니다.");
  assertCondition(pack.persons.A.elementBalance.strongest.length === 2, "A 강한 오행 2개가 필요합니다.");
  assertCondition(pack.persons.B.elementBalance.weakest.length === 2, "B 약한 오행 2개가 필요합니다.");
  assertCondition(Object.keys(pack.dimensions).length === 9, "9개 궁합 항목 evidence를 모두 전달해야 합니다.");
  assertCondition(pack.directionalSignals.aReceivesUsefulFit !== null, "A←B 방향성 근거가 필요합니다.");
  assertCondition(pack.directionalSignals.bReceivesUsefulFit !== null, "B←A 방향성 근거가 필요합니다.");
  assertCondition(pack.aiBoundary.scoreMutableByAi === false, "AI가 점수를 변경할 수 없어야 합니다.");
  assertCondition(pack.aiBoundary.rankingMutableByAi === false, "AI가 순위를 변경할 수 없어야 합니다.");
  assertCondition(serialized.length < 20_000, `ReportEvidencePack이 과도하게 큽니다: ${serialized.length} chars`);

  const template = buildTemplateNarrative(snapshot, input);
  assertCondition(template.headline.length > 0 && template.summary.length > 0, "요약 서술이 비어 있습니다.");
  assertCondition(template.personA.core.length > 0 && template.personB.core.length > 0, "개인 A/B 서술이 필요합니다.");
  assertCondition(template.basicChemistry.dayMaster.length > 0, "기본 케미 서술이 필요합니다.");
  assertCondition(template.bondAndFriction.earthlyBranches.length > 0, "결속/마찰 서술이 필요합니다.");
  assertCondition(template.directionalImpact.aToB.length > 0 && template.directionalImpact.bToA.length > 0, "양방향 영향 서술이 필요합니다.");
  assertCondition(template.relationshipSpecific.first.length > 0, "관계유형 전용 서술이 필요합니다.");
  assertCondition(template.adjustments.redFlag.length > 0, "레드 플래그 서술이 필요합니다.");
  assertCondition(template.practicalGuide.conflictAction.length > 0, "갈등 대응 매뉴얼이 필요합니다.");

  const generated = await generateCompatibilityNarrative(snapshot, input, { modeOverride: "template" });
  assertCondition(generated.meta.mode === "template", "강제 template 모드는 API를 호출하면 안 됩니다.");
  assertCondition(generated.meta.payloadVersion === REPORT_EVIDENCE_PACK_VERSION, "meta payload version이 다릅니다.");
  assertCondition(generated.meta.payloadBytes > 0, "payload 크기가 기록되어야 합니다.");

  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const fallback = await generateCompatibilityNarrative(snapshot, input, { modeOverride: "anthropic" });
  assertCondition(fallback.meta.mode === "template", "Anthropic 키 미설정 시 상세 template fallback이어야 합니다.");
  assertCondition(fallback.meta.fallbackReason === "ANTHROPIC_API_KEY_MISSING", `fallback 사유 오류: ${fallback.meta.fallbackReason}`);
  assertCondition(fallback.narrative.personA.core.length > 0, "fallback도 개인화 상세 구조를 유지해야 합니다.");
  if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previousKey;

  const resultUi = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
  assert.doesNotMatch(resultUi, /상세 해설 생성이 지연되고 있어요/);
  assert.doesNotMatch(resultUi, /같은 결제로 다시 생성하기/);
  assert.match(resultUi, /while \(!cancelled\)/);
  assert.match(resultUi, /retryDelay\(attempt\)/);
  assert.match(resultUi, /saveReportProgress\(progress\)/);
  assert.match(resultUi, /loadReportProgress\(draft\.paymentId, draft\.createdAt\)/);
  assert.match(resultUi, /dimension !== "luckCycleAlignment"/);
  assert.match(resultUi, /완료될 때까지 계속 시도합니다/);

  const v7Engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
  assert.match(v7Engine, /PAID_REPORT_SEGMENTS = \["intro", "dynamics", "action"\]/);
  assert.match(v7Engine, /대운·세운·특정 연도·월의 관계 타이밍은 작성하지 마세요/);
  assert.match(v7Engine, /preferStructured: false/);

  const progressStore = readFileSync("src/lib/report-progress-storage.ts", "utf8");
  assert.match(progressStore, /window\.localStorage/);
  assert.match(progressStore, /report-progress-v7-1/);

  const conservativeCost = calculateAnthropicUsageCost({ input_tokens: 7000, output_tokens: 4000 }, 1450);
  assertCondition(conservativeCost.estimatedUsd === 0.027, `Haiku 원가 계산 오류(USD): ${conservativeCost.estimatedUsd}`);
  assertCondition(conservativeCost.estimatedKrw === 39.15, `Haiku 원가 계산 오류(KRW): ${conservativeCost.estimatedKrw}`);

  console.log("Day 9 personalized ReportEvidencePack + resumable report checks: PASS");
  console.log(
    `score=${snapshot.score}, prompt=${REPORT_PROMPT_VERSION}, payload=${serialized.length} chars, ` +
    `conservativeCost=${conservativeCost.estimatedKrw} KRW`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
