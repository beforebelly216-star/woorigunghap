import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  buildReportEvidencePack,
  buildTemplateNarrative,
  calculateAnthropicUsageCost,
  generateCompatibilityNarrative,
  REPORT_EVIDENCE_PACK_VERSION,
  REPORT_PROMPT_VERSION,
} from "../src/lib/narrative/report-engine";
import { buildPaidReportFacts } from "../src/lib/narrative/report-engine-v5";
import { personalizeNarrativeNames } from "../src/lib/narrative/name-personalization";
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
  const facts = buildPaidReportFacts(input);
  const serialized = JSON.stringify(pack);
  const fullAiPayload = JSON.stringify({ facts, evidence: pack });

  for (const forbiddenValue of ["테스트A", "테스트B", "1990-05-15", "1992-10-24", "14:17", "05:43"]) {
    assertCondition(!serialized.includes(forbiddenValue), `ReportEvidencePack 개인정보 값 노출: ${forbiddenValue}`);
    assertCondition(!fullAiPayload.includes(forbiddenValue), `실제 AI payload 개인정보 값 노출: ${forbiddenValue}`);
  }
  for (const forbiddenKey of ["displayName", "paymentId", "orderId", "birthDate", "sourceDate", "solarDate"]) {
    assertCondition(!serialized.includes(`\"${forbiddenKey}\":`), `ReportEvidencePack 개인정보 키 노출: ${forbiddenKey}`);
    assertCondition(!fullAiPayload.includes(`\"${forbiddenKey}\":`), `실제 AI payload 개인정보 키 노출: ${forbiddenKey}`);
  }
  assertCondition(!fullAiPayload.includes("\"birthTime\":"), "원본 birthTime 키는 AI payload에 포함되면 안 됩니다.");
  assertCondition(fullAiPayload.includes("\"birthTimeKnown\":"), "시간 미상 여부 플래그는 신뢰도 설명을 위해 유지합니다.");
  assertCondition(fullAiPayload.includes("\"pillars\":"), "유료 리포트 AI payload에는 직접 식별정보를 제거한 사주팔자 facts가 필요합니다.");
  assertCondition(fullAiPayload.includes("\"visibleElementCounts\":"), "유료 리포트 AI payload에는 오행 개수 facts가 필요합니다.");

  const personalized = personalizeNarrativeNames(
    {
      summary: "나는 상대에게 천천히 다가가고, 상대는 나에게 바로 답을 주지 않을 수 있습니다.",
      detail: ["상대의 반응을 보고 내가 속도를 조절합니다.", "내 강점을 상대에게 밀어붙이지 않습니다."],
    },
    { self: input.personA.displayName, partner: input.personB.displayName },
  );
  const personalizedText = JSON.stringify(personalized);
  assertCondition(personalizedText.includes("테스트A님"), "AI 응답 후 나의 이름 호칭이 합성되어야 합니다.");
  assertCondition(personalizedText.includes("테스트B님"), "AI 응답 후 상대 이름 호칭이 합성되어야 합니다.");
  assertCondition(personalized.summary.includes("테스트A님은 테스트B님에게"), "한국어 조사까지 자연스럽게 이름 호칭으로 치환해야 합니다.");
  assertCondition(personalized.detail[0].includes("테스트B님의 반응") && personalized.detail[0].includes("테스트A님이"), "구조화된 중첩 필드도 이름 호칭으로 치환해야 합니다.");

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
  assertCondition(fullAiPayload.length < 25_000, `유료 리포트 AI payload가 과도하게 큽니다: ${fullAiPayload.length} chars`);

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
  assert.doesNotMatch(resultUi, /AbortController/);
  assert.doesNotMatch(resultUi, /210_000/);
  assert.match(resultUi, /while \(!cancelled\)/);
  assert.match(resultUi, /retryDelay\(attempt\)/);
  assert.match(resultUi, /response\.status >= 500/);
  assert.match(resultUi, /saveReportProgress\(progress\)/);
  assert.match(resultUi, /loadReportProgress\(draft\.paymentId, draft\.createdAt\)/);
  assert.doesNotMatch(resultUi, /dimension !== "luckCycleAlignment"/);
  assert.match(resultUi, /threeYearTiming=\{snapshot\.threeYearTiming\}/);
  assert.match(resultUi, /완료될 때까지 계속 기다립니다/);

  const apiRoute = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
  assert.match(apiRoute, /PHASES = \["prepare", \.\.\.PAID_REPORT_SEGMENTS\]/);
  assert.match(apiRoute, /retryableReportReason/);
  assert.match(apiRoute, /API_TIMEOUT/);
  assert.match(apiRoute, /API_OVERLOADED/);
  assert.match(apiRoute, /AI_OUTPUT_TRUNCATED/);
  assert.match(apiRoute, /personalizeNarrativeNames\(storedSegment, narrativeNames\)/);
  assert.match(apiRoute, /personalizeNarrativeNames\(generated\.content, narrativeNames\)/);

  const v7Engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
  assert.match(v7Engine, /PAID_REPORT_SEGMENTS = \["intro", "dynamics", "action"\]/);
  assert.match(v7Engine, /대운·세운·특정 연도·월의 관계 타이밍은 작성하지 마세요/);
  assert.match(v7Engine, /preferStructured: false/);
  assert.match(v7Engine, /combineAnthropicUsage\(generated\.allUsage\)/);

  const privacyPage = readFileSync("src/app/privacy/page.tsx", "utf8");
  assert.match(privacyPage, /이름·별칭, 원본 생년월일, 원본 출생시간은 AI 서술 생성 요청에 전달하지 않습니다/);
  assert.match(privacyPage, /Anthropic API/);
  assert.match(privacyPage, /30일 이내 삭제/);
  assert.match(privacyPage, /실제 운영 전에는 Anthropic의 최신 처리지역·하위처리자 정보/);

  const progressStore = readFileSync("src/lib/report-progress-storage.ts", "utf8");
  assert.match(progressStore, /window\.localStorage/);
  assert.match(progressStore, /report-progress-v7-1/);

  assertCondition(!existsSync("src/app/api/compatibility/one-to-one-v4/route.ts"), "구형 공개 v4 궁합 API가 다시 생기면 안 됩니다.");
  assertCondition(!existsSync("src/app/api-route-upgrade.tsx"), "브라우저 fetch를 구형 API로 재작성하는 컴포넌트가 다시 생기면 안 됩니다.");
  assertCondition(!existsSync("src/instrumentation-client.ts"), "instrumentation-client에서 구형 API로 fetch를 전역 재작성하면 안 됩니다.");
  assertCondition(!existsSync("src/app/api/narrative/status/route.ts"), "임시 공개 narrative 상태 API를 운영 배포에 남기면 안 됩니다.");

  const conservativeCost = calculateAnthropicUsageCost({ input_tokens: 7000, output_tokens: 4000 }, 1450);
  assertCondition(conservativeCost.estimatedUsd === 0.027, `Haiku 원가 계산 오류(USD): ${conservativeCost.estimatedUsd}`);
  assertCondition(conservativeCost.estimatedKrw === 39.15, `Haiku 원가 계산 오류(KRW): ${conservativeCost.estimatedKrw}`);

  console.log("Day 9 AI payload privacy + server-side name personalization checks: PASS");
  console.log(
    `score=${snapshot.score}, prompt=${REPORT_PROMPT_VERSION}, aiPayload=${fullAiPayload.length} chars, ` +
    `conservativeCost=${conservativeCost.estimatedKrw} KRW`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
