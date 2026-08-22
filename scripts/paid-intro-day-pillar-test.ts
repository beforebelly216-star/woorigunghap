import assert from "node:assert/strict";
import { collectPaidNarrativeQualityIssues, formatPaidIntroDayPillar, groundPaidIntroWithServerEvidence } from "../src/lib/narrative/report-engine-v6-request";
import { sanitizeStoredReportTextForPerson } from "../src/lib/narrative/stored-report-compat";

const gihe = { korean: "기해", hanja: "己亥", stem: "기", branch: "해" };
const gapja = { korean: "갑자", hanja: "甲子", stem: "갑", branch: "자" };
assert.equal(formatPaidIntroDayPillar(gihe), "기해(己亥)");
assert.equal(formatPaidIntroDayPillar(gapja), "갑자(甲子)", "birth-time unknown does not make the day pillar unknown");
assert.equal(formatPaidIntroDayPillar("기해(己亥)"), "기해(己亥)", "legacy string input remains compatible");
assert.equal(formatPaidIntroDayPillar({ hanja: "己亥" }), "일주 미확인");

const aiIntro = {
  overview: { headline: "샘플", detailedSummary: "샘플 요약" },
  personA: { overallProfile: "기해(己亥)를 가진 A의 고유 해설", elementAnalysis: "토가 강하고 수가 약한 흐름", relationshipNeeds: "A에게 맞는 조건", strengths: ["A만의 장점"], cautions: ["A만의 주의점"] },
  personB: { overallProfile: "갑자(甲子)를 가진 B의 고유 해설", elementAnalysis: "목이 강하고 금이 약한 흐름", relationshipNeeds: "B에게 맞는 조건", strengths: ["B만의 장점"], cautions: ["B만의 주의점"] },
};
const preserved = groundPaidIntroWithServerEvidence(aiIntro, "payload") as typeof aiIntro;
assert.equal(preserved, aiIntro, "P2 must preserve valid AI-authored intro content");
assert.doesNotMatch(JSON.stringify(preserved), /일주 미확인/);

const storedLegacyText = "존종윤님의 일주는 서버 계산상 일주 미확인입니다. 일간은 기(土)로 읽습니다.";
const repairedStoredText = sanitizeStoredReportTextForPerson(storedLegacyText, gihe);
assert.doesNotMatch(repairedStoredText, /서버 계산상|일주 미확인|일주는\s*일주는/);
assert.match(repairedStoredText, /존종윤님의 일주는 기해\(己亥\)입니다\./, "stored pre-P1 reports must display the computed day pillar without AI regeneration");

const invalidIntro = {
  ...aiIntro,
  personA: { ...aiIntro.personA, overallProfile: "{{SELF}}님의 일주는 일주 미확인입니다. 관계 장면을 설명합니다." },
};
const payload = JSON.stringify({
  facts: {
    A: { dayPillar: gihe },
    B: { dayPillar: gapja },
  },
  evidence: {
    persons: {
      A: { elementBalance: { dominantElements: ["earth"], lighterElements: ["water"] } },
      B: { elementBalance: { dominantElements: ["wood"], lighterElements: ["metal"] } },
    },
  },
});
const issues = collectPaidNarrativeQualityIssues(invalidIntro, "INTRO", `payload ${payload}`);
assert.ok(issues.includes("INTRO_DAY_PILLAR_UNKNOWN_EXPOSED"), "new INTRO output must reject any day-pillar unknown wording");

console.log("paid intro day pillar contract: PASS");
