import assert from "node:assert/strict";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import { calibrateCompatibilityScore, getCompatibilityScoreBand } from "../src/lib/compatibility/score-scale";
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

const TIMING_OPTIONS = { timingBaseYear: 2026 } as const;
const a = person("A", "1990-05-15", "14:30");
const b = person("B", "1992-10-24", "05:30");
const base: OneToOneReportInput = {
  relationshipType: "lover",
  personA: a,
  personB: b,
};

const first = calculateOneToOneCompatibility(base, TIMING_OPTIONS);
const second = calculateOneToOneCompatibility(base, TIMING_OPTIONS);
assert.deepEqual(first, second, "같은 입력과 기준연도는 완전히 동일한 계산 스냅샷을 반환해야 합니다.");
assert.equal(first.profile, "romance");
assert.equal(Object.keys(first.dimensions).length, 9);
assert.ok(first.score >= 45 && first.score <= 100);
assert.equal(first.score, calibrateCompatibilityScore(first.rawTotal));
assert.equal(calibrateCompatibilityScore(30), 45);
assert.equal(calibrateCompatibilityScore(100), 100);
assert.ok(calibrateCompatibilityScore(74) > 74, "public score calibration should raise the absolute score for entertainment value");
assert.ok(getCompatibilityScoreBand(first.score).label.length > 0);
assert.equal(first.scenarioPolicy.pairScenarios, 1);
assert.equal(first.aiBoundary.scoreMutableByAi, false);
assert.equal(first.aiBoundary.rankingMutableByAi, false);
assert.ok(first.dimensions.luckCycleAlignment.normalizedScore >= 45);
assert.ok(first.dimensions.luckCycleAlignment.normalizedScore <= 92);
assert.equal(first.threeYearTiming?.baseYear, 2026);
assert.deepEqual(first.threeYearTiming?.years.map((year) => year.year), [2026, 2027, 2028]);
assert.deepEqual(
  first.representativeEvidence.luckCycleAlignment,
  { policy: "SERVER_RENDERED_CH5_ONLY" },
  "연도별 타이밍 원자료는 일반 AI evidence로 전달하지 않고 CH5 서버 렌더링에만 사용해야 합니다.",
);
assert.ok(first.threeYearTiming, "서버 렌더링용 threeYearTiming은 계산 스냅샷에 그대로 유지되어야 합니다.");
assert.equal(first.strengths.length, 2);
assert.equal(first.adjustmentPoints.length, 2);

const weightTotal = Object.values(first.dimensions).reduce(
  (sum, dimension) => sum + dimension.maxPoints,
  0,
);
assert.equal(weightTotal, 100, "관계 프로필의 9개 배점 합계는 100이어야 합니다.");

const swapped = calculateOneToOneCompatibility({
  ...base,
  personA: b,
  personB: a,
}, TIMING_OPTIONS);
assert.equal(first.score, swapped.score, "A/B 순서를 바꿔도 최종 궁합 점수는 동일해야 합니다.");
assert.equal(first.rawTotal, swapped.rawTotal, "A/B 순서를 바꿔도 원시 총점은 동일해야 합니다.");
assert.equal(
  first.dimensions.luckCycleAlignment.normalizedScore,
  swapped.dimensions.luckCycleAlignment.normalizedScore,
  "A/B 순서를 바꿔도 3년 타이밍 점수는 동일해야 합니다.",
);

const unknownA = person("A-unknown", "1990-05-15", null);
const oneUnknown = calculateOneToOneCompatibility({
  relationshipType: "friend",
  personA: unknownA,
  personB: b,
}, TIMING_OPTIONS);
assert.equal(oneUnknown.profile, "friend");
assert.equal(oneUnknown.scenarioPolicy.personAScenarios, 12);
assert.equal(oneUnknown.scenarioPolicy.personBScenarios, 1);
assert.equal(oneUnknown.scenarioPolicy.pairScenarios, 12);
assert.equal(oneUnknown.scenarioPolicy.boundaryStatesAdded, false);
assert.ok(oneUnknown.uncertaintyRange.min <= oneUnknown.uncertaintyRange.max);
assert.equal(oneUnknown.threeYearTiming?.confidence === "high", false, "B레벨 타이밍은 high confidence로 표시하지 않습니다.");
assert.ok(!oneUnknown.strengths.includes("spouseStarRealization"), "friend의 0점 배우자성은 강점 요약에서 제외해야 합니다.");
assert.ok(!oneUnknown.adjustmentPoints.includes("spouseStarRealization"), "friend의 0점 배우자성은 조정점 요약에서 제외해야 합니다.");

const unknownB = person("B-unknown", "1992-10-24", null);
const bothUnknown = calculateOneToOneCompatibility({
  relationshipType: "coworker",
  personA: unknownA,
  personB: unknownB,
}, TIMING_OPTIONS);
assert.equal(bothUnknown.profile, "coworker");
assert.equal(bothUnknown.scenarioPolicy.personAScenarios, 12);
assert.equal(bothUnknown.scenarioPolicy.personBScenarios, 12);
assert.equal(bothUnknown.scenarioPolicy.pairScenarios, 144);
assert.ok(bothUnknown.score >= 45 && bothUnknown.score <= 100);
assert.equal(bothUnknown.threeYearTiming?.confidence === "high", false);

const boundaryUnknown = person("boundary", "2024-02-04", null);
const boundaryResult = calculateOneToOneCompatibility({
  relationshipType: "lover",
  personA: boundaryUnknown,
  personB: b,
}, TIMING_OPTIONS);
assert.equal(boundaryResult.scenarioPolicy.boundaryStatesAdded, true, "입춘 당일 시간 미상은 경계 상태를 추가해야 합니다.");
assert.ok(boundaryResult.scenarioPolicy.personAScenarios > 12);

for (const result of [first, oneUnknown, bothUnknown, boundaryResult]) {
  for (const [dimension, score] of Object.entries(result.dimensions)) {
    assert.ok(Number.isFinite(score.normalizedScore), `${dimension} normalizedScore must be finite`);
    assert.ok(score.normalizedScore >= 0 && score.normalizedScore <= 100, `${dimension} normalizedScore out of range`);
    assert.ok(score.weightedPoints >= 0 && score.weightedPoints <= score.maxPoints, `${dimension} weightedPoints out of range`);
  }
  assert.ok(result.threeYearTiming);
  assert.equal(result.threeYearTiming.years.length, 3);
  assert.ok(result.threeYearTiming.scoreRange.min <= result.threeYearTiming.normalizedScore);
  assert.ok(result.threeYearTiming.normalizedScore <= result.threeYearTiming.scoreRange.max);
  assert.deepEqual(result.representativeEvidence.luckCycleAlignment, { policy: "SERVER_RENDERED_CH5_ONLY" });
}

console.log(
  `Compatibility engine validation passed: known=${first.score}, timing=${first.dimensions.luckCycleAlignment.normalizedScore}, oneUnknown=${oneUnknown.score} (${oneUnknown.uncertaintyRange.min}-${oneUnknown.uncertaintyRange.max}), bothUnknown=${bothUnknown.score} (${bothUnknown.uncertaintyRange.min}-${bothUnknown.uncertaintyRange.max}), boundaryScenarios=${boundaryResult.scenarioPolicy.personAScenarios}`,
);
