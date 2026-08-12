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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const snapshot = calculateOneToOneCompatibility(input);
  const pack = buildReportEvidencePack(snapshot, input);
  const serialized = JSON.stringify(pack);

  for (const forbiddenValue of ["테스트A", "테스트B", "1990-05-15", "1992-10-24", "14:17", "05:43"]) {
    assert(!serialized.includes(forbiddenValue), `ReportEvidencePack 개인정보 값 노출: ${forbiddenValue}`);
  }
  for (const forbiddenKey of ["displayName", "paymentId", "orderId", "birthDate", "sourceDate", "solarDate"]) {
    assert(!serialized.includes(`\"${forbiddenKey}\":`), `ReportEvidencePack 개인정보 키 노출: ${forbiddenKey}`);
  }
  assert(!serialized.includes("\"birthTime\":"), "원본 birthTime 키는 AI payload에 포함되면 안 됩니다.");
  assert(serialized.includes("\"birthTimeKnown\":"), "시간 미상 여부 플래그는 신뢰도 설명을 위해 유지합니다.");

  assert(pack.payloadVersion === REPORT_EVIDENCE_PACK_VERSION, "payload version이 다릅니다.");
  assert(pack.persons.A.dayMaster.stem.length > 0, "A 개인 분석용 일간이 필요합니다.");
  assert(pack.persons.B.dayMaster.stem.length > 0, "B 개인 분석용 일간이 필요합니다.");
  assert(pack.persons.A.elementBalance.strongest.length === 2, "A 강한 오행 2개가 필요합니다.");
  assert(pack.persons.B.elementBalance.weakest.length === 2, "B 약한 오행 2개가 필요합니다.");
  assert(Object.keys(pack.dimensions).length === 9, "9개 궁합 항목 evidence를 모두 전달해야 합니다.");
  assert(pack.directionalSignals.aReceivesUsefulFit !== null, "A←B 방향성 근거가 필요합니다.");
  assert(pack.directionalSignals.bReceivesUsefulFit !== null, "B←A 방향성 근거가 필요합니다.");
  assert(pack.aiBoundary.scoreMutableByAi === false, "AI가 점수를 변경할 수 없어야 합니다.");
  assert(pack.aiBoundary.rankingMutableByAi === false, "AI가 순위를 변경할 수 없어야 합니다.");
  assert(serialized.length < 20_000, `ReportEvidencePack이 과도하게 큽니다: ${serialized.length} chars`);

  const template = buildTemplateNarrative(snapshot, input);
  assert(template.headline.length > 0 && template.summary.length > 0, "요약 서술이 비어 있습니다.");
  assert(template.personA.core.length > 0 && template.personB.core.length > 0, "개인 A/B 서술이 필요합니다.");
  assert(template.basicChemistry.dayMaster.length > 0, "기본 케미 서술이 필요합니다.");
  assert(template.bondAndFriction.earthlyBranches.length > 0, "결속/마찰 서술이 필요합니다.");
  assert(template.directionalImpact.aToB.length > 0 && template.directionalImpact.bToA.length > 0, "양방향 영향 서술이 필요합니다.");
  assert(template.relationshipSpecific.first.length > 0, "관계유형 전용 서술이 필요합니다.");
  assert(template.adjustments.redFlag.length > 0, "레드 플래그 서술이 필요합니다.");
  assert(template.practicalGuide.conflictAction.length > 0, "갈등 대응 매뉴얼이 필요합니다.");
  assert(template.timing.limitation.includes("대운"), "대운 미구현 한계를 명확히 표시해야 합니다.");

  const generated = await generateCompatibilityNarrative(snapshot, input, { modeOverride: "template" });
  assert(generated.meta.mode === "template", "강제 template 모드는 API를 호출하면 안 됩니다.");
  assert(generated.meta.payloadVersion === REPORT_EVIDENCE_PACK_VERSION, "meta payload version이 다릅니다.");
  assert(generated.meta.payloadBytes > 0, "payload 크기가 기록되어야 합니다.");

  const previousKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const fallback = await generateCompatibilityNarrative(snapshot, input, { modeOverride: "anthropic" });
  assert(fallback.meta.mode === "template", "Anthropic 키 미설정 시 상세 template fallback이어야 합니다.");
  assert(fallback.meta.fallbackReason === "ANTHROPIC_API_KEY_MISSING", `fallback 사유 오류: ${fallback.meta.fallbackReason}`);
  assert(fallback.narrative.personA.core.length > 0, "fallback도 개인화 상세 구조를 유지해야 합니다.");
  if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previousKey;

  const conservativeCost = calculateAnthropicUsageCost({ input_tokens: 7000, output_tokens: 4000 }, 1450);
  assert(conservativeCost.estimatedUsd === 0.027, `Haiku 원가 계산 오류(USD): ${conservativeCost.estimatedUsd}`);
  assert(conservativeCost.estimatedKrw === 39.15, `Haiku 원가 계산 오류(KRW): ${conservativeCost.estimatedKrw}`);

  console.log("Day 9 personalized ReportEvidencePack: PASS");
  console.log(
    `score=${snapshot.score}, prompt=${REPORT_PROMPT_VERSION}, payload=${serialized.length} chars, ` +
    `conservativeCost=${conservativeCost.estimatedKrw} KRW`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
