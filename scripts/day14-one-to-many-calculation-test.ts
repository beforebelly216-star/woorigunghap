import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildOneToManyRanking,
  calculateOneToManyCompatibility,
  classifyScoreGap,
  uncertaintyRangesOverlap,
  type RankingCandidate,
} from "../src/lib/compatibility/one-to-many";
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
  referencePerson: person("기준자", "1990-05-15", "14:30"),
  candidates: [
    person("봄", "1992-10-24", "05:30"),
    person("여름", "1991-08-11", null),
    person("가을", "1989-12-03", "22:10"),
  ],
};

const first = calculateOneToManyCompatibility(input);
const second = calculateOneToManyCompatibility(input);
assert.deepEqual(first, second, "같은 입력은 동일한 1:N 계산 JSON을 반환해야 합니다.");
assert.equal(first.candidateCount, 3);
assert.equal(first.profile, "romance");
assert.equal(first.candidates.length, 3);
assert.equal(first.comparisonMatrix.rows.length, 3);
assert.equal(first.comparisonMatrix.dimensionOrder.length, 9);
assert.equal(first.aiBoundary.scoreMutableByAi, false);
assert.equal(first.aiBoundary.rankingMutableByAi, false);
assert.equal(first.privacyBoundary.containsDisplayNames, false);
assert.equal(first.privacyBoundary.containsRawBirthData, false);

for (let index = 1; index < first.candidates.length; index += 1) {
  assert.ok(first.candidates[index - 1].score >= first.candidates[index].score, "후보는 점수 내림차순이어야 합니다.");
}
for (const candidate of first.candidates) {
  assert.equal(candidate.calculationSnapshot.relationshipType, "lover");
  assert.equal(candidate.calculationSnapshot.profile, "romance");
  assert.equal(Object.keys(candidate.calculationSnapshot.dimensions).length, 9);
}
const unknownCandidate = first.candidates.find((candidate) => candidate.candidateId === "candidate_2");
assert.ok(unknownCandidate);
assert.equal(unknownCandidate.calculationSnapshot.scenarioPolicy.personBScenarios, 12);

const maxCandidates = calculateOneToManyCompatibility({
  ...input,
  relationshipType: "coworker",
  candidates: [
    ...input.candidates,
    person("겨울", "1993-03-21", "07:40"),
    person("새벽", "1988-06-17", "01:10"),
  ],
});
assert.equal(maxCandidates.candidateCount, 5);
assert.equal(maxCandidates.profile, "coworker");
assert.deepEqual(
  [...maxCandidates.candidates].sort((a, b) => a.inputIndex - b.inputIndex).map((candidate) => candidate.candidateId),
  ["candidate_1", "candidate_2", "candidate_3", "candidate_4", "candidate_5"],
);

const serialized = JSON.stringify(first);
for (const privateValue of ["기준자", "봄", "여름", "가을", "1990-05-15", "1992-10-24"]) {
  assert.equal(serialized.includes(privateValue), false, `계산 JSON에 원본 입력이 노출되면 안 됩니다: ${privateValue}`);
}

assert.equal(classifyScoreGap(0), "EQUIVALENT");
assert.equal(classifyScoreGap(2), "EQUIVALENT");
assert.equal(classifyScoreGap(3), "SLIGHT_EDGE");
assert.equal(classifyScoreGap(5), "SLIGHT_EDGE");
assert.equal(classifyScoreGap(6), "MEANINGFUL_GAP");
assert.throws(() => classifyScoreGap(-1), RangeError);
assert.equal(
  uncertaintyRangesOverlap({ min: 70, max: 80, width: 10 }, { min: 80, max: 90, width: 10 }),
  true,
);
assert.equal(
  uncertaintyRangesOverlap({ min: 70, max: 79, width: 9 }, { min: 80, max: 90, width: 10 }),
  false,
);

function rankedCandidate(
  inputIndex: number,
  score: number,
  min = score,
  max = score,
): RankingCandidate {
  return {
    candidateId: `candidate_${inputIndex + 1}`,
    inputIndex,
    score,
    rawTotal: score,
    uncertaintyRange: { min, max, width: max - min },
  };
}

const synthetic = buildOneToManyRanking([
  rankedCandidate(3, 84),
  rankedCandidate(1, 89, 86, 91),
  rankedCandidate(0, 90, 88, 92),
  rankedCandidate(2, 87),
]);
assert.deepEqual(synthetic.orderedCandidates.map((candidate) => candidate.candidateId), [
  "candidate_1", "candidate_2", "candidate_3", "candidate_4",
]);
assert.deepEqual(synthetic.orderedCandidates.map((candidate) => candidate.rank), [1, 1, 3, 4]);
assert.deepEqual(synthetic.groups.map((group) => group.candidateIds), [
  ["candidate_1", "candidate_2"],
  ["candidate_3"],
  ["candidate_4"],
]);
assert.equal(synthetic.orderedCandidates[1].comparisonToLeader.uncertaintyRangesOverlap, true);
assert.equal(synthetic.orderedCandidates[2].comparisonToLeader.band, "SLIGHT_EDGE");
assert.equal(synthetic.orderedCandidates[3].comparisonToLeader.band, "MEANINGFUL_GAP");
assert.equal(synthetic.orderedCandidates[3].comparisonToLeader.decisiveWordingAllowed, true);

const invalid: OneToManyReportInput = { ...input, candidates: input.candidates.slice(0, 1) };
assert.throws(() => calculateOneToManyCompatibility(invalid), RangeError);

const demoRoute = readFileSync("src/app/api/compatibility/one-to-many/demo/route.ts", "utf8");
assert.match(demoRoute, /runtime = "nodejs"/);
assert.match(demoRoute, /calculateOneToManyCompatibility/);
assert.doesNotMatch(demoRoute, /export async function POST/);

console.log("Day 14 one-to-many calculation and ranking checks: PASS");
