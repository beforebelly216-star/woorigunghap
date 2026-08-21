import assert from "node:assert/strict";
import {
  formatPaidIntroDayPillar,
  groundPaidIntroWithServerEvidence,
} from "../src/lib/narrative/report-engine-v6-request";

const gihe = { korean: "기해", hanja: "己亥", stem: "기", branch: "해" };
const gapja = { korean: "갑자", hanja: "甲子", stem: "갑", branch: "자" };

assert.equal(formatPaidIntroDayPillar(gihe), "기해(己亥)");
assert.equal(formatPaidIntroDayPillar("기해(己亥)"), "기해(己亥)", "legacy string day pillar must remain supported");
assert.equal(formatPaidIntroDayPillar({ hanja: "己亥" }), "일주 미확인");

const prompt = `payload\n${JSON.stringify({
  facts: {
    A: { birthTimeKnown: true, dayPillar: gihe },
    B: { birthTimeKnown: false, dayPillar: gapja },
  },
  evidence: {
    persons: {
      A: { dayMaster: { stem: "기", element: "earth" }, elementBalance: { strongest: ["earth"], weakest: ["water"] } },
      B: { dayMaster: { stem: "갑", element: "wood" }, elementBalance: { strongest: ["wood"], weakest: ["metal"] } },
    },
  },
})}`;
const intro = {
  overview: { headline: "샘플", detailedSummary: "샘플 요약" },
  personA: { overallProfile: "AI A", elementAnalysis: "AI A 오행", relationshipNeeds: "AI A 조건", strengths: ["A 장점"], cautions: ["A 주의"] },
  personB: { overallProfile: "AI B", elementAnalysis: "AI B 오행", relationshipNeeds: "AI B 조건", strengths: ["B 장점"], cautions: ["B 주의"] },
};
const grounded = groundPaidIntroWithServerEvidence(intro, prompt) as typeof intro;
assert.match(grounded.personA.overallProfile, /기해\(己亥\)/, "known-time person must render object day pillar");
assert.match(grounded.personB.overallProfile, /갑자\(甲子\)/, "unknown birth time must still render the day pillar");
assert.doesNotMatch(JSON.stringify(grounded), /일주 미확인/, "valid day pillars must never fall back to '일주 미확인'");

console.log("paid intro day pillar contract: PASS");
