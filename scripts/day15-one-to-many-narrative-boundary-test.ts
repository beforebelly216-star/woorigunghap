import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateOneToManyCompatibility } from "../src/lib/compatibility/one-to-many";
import {
  ONE_TO_MANY_REPORT_PAYLOAD_VERSION,
  ONE_TO_MANY_REPORT_PROMPT_VERSION,
  buildOneToManyNarrativeEvidence,
} from "../src/lib/narrative/one-to-many-report-engine";
import type { OneToManyReportInput, PersonBirthInput } from "../src/lib/report-input";

function person(displayName: string, birthDate: string, birthTime: string | null): PersonBirthInput {
  return {
    displayName,
    gender: "female",
    calendarType: "solar",
    birthDate,
    birthTimeKnown: birthTime !== null,
    birthTime,
    isLeapMonth: false,
  };
}

const input: OneToManyReportInput = {
  relationshipType: "lover",
  referencePerson: person("지민", "1990-05-15", "14:30"),
  candidates: [
    person("민서", "1992-10-24", "05:30"),
    person("도윤", "1991-08-11", null),
    person("하린", "1989-12-03", "22:10"),
  ],
};

const snapshot = calculateOneToManyCompatibility(input);
const evidence = buildOneToManyNarrativeEvidence(snapshot);
assert.equal(evidence.payloadVersion, ONE_TO_MANY_REPORT_PAYLOAD_VERSION);
assert.equal(evidence.candidateCount, 3);
assert.deepEqual(evidence.candidates.map((candidate) => candidate.candidateId).sort(), [
  "candidate_1", "candidate_2", "candidate_3",
]);
assert.deepEqual(evidence.aiBoundary, {
  scoreMutableByAi: false,
  rankingMutableByAi: false,
  explanationOnly: true,
});
assert.deepEqual(Object.keys(evidence.situationalRecommendations).sort(), [
  "communication",
  "conflictManagement",
  "emotionalStability",
  "longTerm",
  "relationshipPurpose",
]);
assert.equal(
  Object.values(evidence.situationalRecommendations).every((item) => item.candidateIds.length >= 1),
  true,
);
for (const candidate of evidence.candidates) {
  assert.equal(candidate.strengths.length >= 2, true);
  assert.equal(candidate.adjustmentPoints.length >= 1, true);
  assert.equal(Object.keys(candidate.dimensions).length, 9);
  assert.equal("representativeEvidence" in candidate, false);
}

const serialized = JSON.stringify(evidence);
for (const privateValue of ["지민", "민서", "도윤", "하린", "1990-05-15", "1992-10-24", "14:30", "05:30", "22:10"]) {
  assert.equal(serialized.includes(privateValue), false, `AI payload에 원본 입력이 노출되면 안 됩니다: ${privateValue}`);
}
for (const forbiddenKey of ["displayName", "birthDate", "birthTime", "paymentId", "orderId", "representativeEvidence"]) {
  assert.equal(serialized.includes(forbiddenKey), false, `AI payload에 금지 키가 있으면 안 됩니다: ${forbiddenKey}`);
}

const engineSource = readFileSync("src/lib/narrative/one-to-many-report-engine.ts", "utf8");
assert.match(engineSource, /Server-only module/);
assert.match(engineSource, /scoreMutableByAi/);
assert.match(engineSource, /rankingMutableByAi/);
assert.match(engineSource, /uncertaintyRangesOverlapLeader/);
assert.match(engineSource, /동점 그룹/);
assert.match(engineSource, /candidateIds는 서버가 확정/);
assert.match(engineSource, /첫 번째\/두 번째\/세 번째 후보/);
assert.match(engineSource, /강점 1\/2\/3/);
assert.match(engineSource, /ONE_TO_MANY_REPORT_FAILED_MODE_NOT_ANTHROPIC/);
assert.match(engineSource, /ONE_TO_MANY_REPORT_PROMPT_VERSION/);
assert.equal(ONE_TO_MANY_REPORT_PROMPT_VERSION, "one-to-many-report-v2-semantic-titles");

console.log("Day 15 one-to-many AI narrative boundary checks: PASS");
