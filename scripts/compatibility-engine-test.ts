import assert from "node:assert/strict";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import type { OneToOneReportInput, PersonBirthInput } from "../src/lib/report-input";

function person(
  displayName: string,
  birthDate: string,
  birthTime: string | null,
): PersonBirthInput {
  return {
    displayName,
    gender: "male",
    calendarType: "solar",
    birthDate,
    birthTimeKnown: birthTime !== null,
    birthTime,
    isLeapMonth: false,
  };
}

const a = person("A", "1990-05-15", "14:30");
const b = person("B", "1992-10-24", "05:30");

const base: OneToOneReportInput = {
  relationshipType: "lover",
  personA: a,
  personB: b,
};

const first = calculateOneToOneCompatibility(base);
const second = calculateOneToOneCompatibility(base);
assert.deepEqual(first, second, "같은 입력은 완전히 동일한 계산 스냅샷을 반환해야 합니다.");
assert.equal(first.profile, "romance");
assert.equal(Object.keys(first.dimensions).length, 9);
assert.ok(first.score >= 30 && first.score <= 100);
assert.equal(first.scenarioPolicy.pairScenarios, 1);
assert.equal(first.aiBoundary.scoreMutableByAi, false);
assert.equal(first.aiBoundary.rankingMutableByAi, false);
assert.equal(first.dimensions.luckCycleAlignment.normalizedScore, 70);

const weightTotal = Object.values(first.dimensions).reduce(
  (sum, dimension) => sum + dimension.maxPoints,
  0,
);
assert.equal(weightTotal, 100, "관계 프로필의 9개 배점 합계는 100이어야 합니다.");

const swapped = calculateOneToOneCompatibility({
  ...base,
  personA: b,
  personB: a,
});
assert.equal(first.score, swapped.score, "A/B 순서를 바꿔도 최종 궁합 점수는 동일해야 합니다.");
assert.equal(first.rawTotal, swapped.rawTotal, "A/B 순서를 바꿔도 원시 총점은 동일해야 합니다.");

const unknownA = person("A-unknown", "1990-05-15", null);
const oneUnknown = calculateOneToOneCompatibility({
  relationshipType: "friend",
  personA: unknownA,
  personB: b,
});
assert.equal(oneUnknown.profile, "friend");
assert.equal(oneUnknown.scenarioPolicy.personAScenarios, 12);
assert.equal(oneUnknown.scenarioPolicy.personBScenarios, 1);
assert.equal(oneUnknown.scenarioPolicy.pairScenarios, 12);
assert.ok(oneUnknown.uncertaintyRange.min <= oneUnknown.uncertaintyRange.max);

const unknownB = person("B-unknown", "1992-10-24", null);
const bothUnknown = calculateOneToOneCompatibility({
  relationshipType: "coworker",
  personA: unknownA,
  personB: unknownB,
});
assert.equal(bothUnknown.profile, "coworker");
assert.equal(bothUnknown.scenarioPolicy.personAScenarios, 12);
assert.equal(bothUnknown.scenarioPolicy.personBScenarios, 12);
assert.equal(bothUnknown.scenarioPolicy.pairScenarios, 144);
assert.ok(bothUnknown.score >= 30 && bothUnknown.score <= 100);

for (const result of [first, oneUnknown, bothUnknown]) {
  for (const [dimension, score] of Object.entries(result.dimensions)) {
    assert.ok(Number.isFinite(score.normalizedScore), `${dimension} normalizedScore must be finite`);
    assert.ok(score.normalizedScore >= 0 && score.normalizedScore <= 100, `${dimension} normalizedScore out of range`);
    assert.ok(score.weightedPoints >= 0 && score.weightedPoints <= score.maxPoints, `${dimension} weightedPoints out of range`);
  }
}

console.log(
  `Compatibility engine validation passed: known=${first.score}, oneUnknown=${oneUnknown.score} (${oneUnknown.uncertaintyRange.min}-${oneUnknown.uncertaintyRange.max}), bothUnknown=${bothUnknown.score} (${bothUnknown.uncertaintyRange.min}-${bothUnknown.uncertaintyRange.max})`,
);
