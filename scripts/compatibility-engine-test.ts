import assert from "node:assert/strict";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  calibrateCompatibilityScore,
  getCompatibilityGrade,
  getCommonCompatibilityRawRange,
  getCompatibilityRawRange,
  getCompatibilityScoreBand,
  migrateStoredCompatibilityScore,
} from "../src/lib/compatibility/score-scale";
import { RELATIONSHIP_SCORE_WEIGHTS } from "../src/lib/compatibility/weights";
import type { OneToOneReportInput, PersonBirthInput, RelationshipType } from "../src/lib/report-input";

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
const RELATIONSHIP_TYPES: RelationshipType[] = ["crush", "flirting", "lover", "friend", "coworker"];
const a = person("A", "1990-05-15", "14:30");
const b = person("B", "1992-10-24", "05:30");
const base: OneToOneReportInput = {
  relationshipType: "lover",
  personA: a,
  personB: b,
};

const commonRawRange = getCommonCompatibilityRawRange();
assert.ok(commonRawRange.min < commonRawRange.max);
assert.equal(calibrateCompatibilityScore(commonRawRange.min), 30, "공통 원점수 하단은 공개 30점이어야 합니다.");
assert.equal(calibrateCompatibilityScore(commonRawRange.max), 100, "공통 원점수 상단은 공개 100점이어야 합니다.");
assert.equal(calibrateCompatibilityScore(commonRawRange.min - 100), 30, "공통 하단 미만은 30점에 고정합니다.");
assert.equal(calibrateCompatibilityScore(commonRawRange.max + 100), 100, "공통 상단 초과는 100점에 고정합니다.");
assert.ok(calibrateCompatibilityScore(60) < 60, "낮은 원점수를 재미 목적으로 끌어올리지 않아야 합니다.");
assert.ok(calibrateCompatibilityScore(60) <= 42, "실제 하위권 원점수는 E등급에 가까운 낮은 점수로 벌어져야 합니다.");
assert.ok(calibrateCompatibilityScore(76) >= 80, "실제 상위권 원점수는 A등급 이상으로 벌어져야 합니다.");
assert.ok(calibrateCompatibilityScore(79) >= 90, "매우 강한 실제 원점수는 S등급에 도달할 수 있어야 합니다.");
assert.equal(getCompatibilityScoreBand(30).min, 30);
for (const [score, grade] of [[30, "E"], [49, "E"], [50, "D"], [59, "D"], [60, "C"], [69, "C"], [70, "B"], [79, "B"], [80, "A"], [89, "A"], [90, "S"], [100, "S"]] as const) {
  assert.equal(getCompatibilityGrade(score), grade, `${score}점은 ${grade}등급이어야 합니다.`);
}
assert.equal(
  migrateStoredCompatibilityScore(65, "1.6.0"),
  calibrateCompatibilityScore(commonRawRange.min + .5 * (commonRawRange.max - commonRawRange.min)),
  "기존 v1.6 공개 점수는 원점수로 오인하지 않고 이전 선형식을 역산해야 합니다.",
);
assert.equal(migrateStoredCompatibilityScore(65, "1.5.0"), 65, "해석 방식이 불명확한 구버전 범위값은 보존합니다.");
let previousCalibrated = 30;
for (let raw = commonRawRange.min; raw <= commonRawRange.max; raw += 0.25) {
  const calibrated = calibrateCompatibilityScore(raw);
  assert.ok(calibrated >= previousCalibrated, "공개 점수 보정은 원점수 순서를 뒤집으면 안 됩니다.");
  previousCalibrated = calibrated;
}

for (const relationshipType of RELATIONSHIP_TYPES) {
  const total = Object.values(RELATIONSHIP_SCORE_WEIGHTS[relationshipType]).reduce<number>(
    (sum, value) => sum + value,
    0,
  );
  assert.equal(total, 100, `${relationshipType} 관계별 가중치 합계는 100이어야 합니다.`);
  const range = getCompatibilityRawRange(relationshipType);
  assert.ok(
    range.min <= commonRawRange.min && range.max >= commonRawRange.max,
    `${relationshipType}도 공통 30~100 공개구간 전체에 도달 가능한 원점수 범위를 가져야 합니다.`,
  );
}

const first = calculateOneToOneCompatibility(base, TIMING_OPTIONS);
const second = calculateOneToOneCompatibility(base, TIMING_OPTIONS);
assert.deepEqual(first, second, "같은 입력과 기준연도는 완전히 동일한 계산 스냅샷을 반환해야 합니다.");
assert.equal(first.profile, "romance");
assert.equal(Object.keys(first.dimensions).length, 9);
assert.ok(first.score >= 30 && first.score <= 100);
assert.equal(first.score, calibrateCompatibilityScore(first.rawTotal));
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

const crush = calculateOneToOneCompatibility({ ...base, relationshipType: "crush" }, TIMING_OPTIONS);
const flirting = calculateOneToOneCompatibility({ ...base, relationshipType: "flirting" }, TIMING_OPTIONS);
assert.equal(crush.profile, "romance");
assert.equal(flirting.profile, "romance");
assert.equal(crush.dimensions.dayMaster.maxPoints, 15);
assert.equal(flirting.dimensions.dayMaster.maxPoints, 12);
assert.equal(first.dimensions.dayMaster.maxPoints, 10);
assert.notDeepEqual(
  crush.dimensions,
  first.dimensions,
  "짝사랑/연인은 같은 romance 해석 규칙을 공유해도 최종 관계별 가중치는 달라야 합니다.",
);

const weightTotal = Object.values(first.dimensions).reduce(
  (sum, dimension) => sum + dimension.maxPoints,
  0,
);
assert.equal(weightTotal, 100, "선택한 관계유형의 9개 배점 합계는 100이어야 합니다.");

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
assert.ok(bothUnknown.score >= 30 && bothUnknown.score <= 100);
assert.equal(bothUnknown.threeYearTiming?.confidence === "high", false);

const boundaryUnknown = person("boundary", "2024-02-04", null);
const boundaryResult = calculateOneToOneCompatibility({
  relationshipType: "lover",
  personA: boundaryUnknown,
  personB: b,
}, TIMING_OPTIONS);
assert.equal(boundaryResult.scenarioPolicy.boundaryStatesAdded, true, "입춘 당일 시간 미상은 경계 상태를 추가해야 합니다.");
assert.ok(boundaryResult.scenarioPolicy.personAScenarios > 12);

for (const result of [first, crush, flirting, oneUnknown, bothUnknown, boundaryResult]) {
  assert.ok(result.score >= 30 && result.score <= 100, "공개 점수는 모든 관계에서 동일하게 30~100 범위여야 합니다.");
  assert.equal(result.score, calibrateCompatibilityScore(result.rawTotal));
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
  `Compatibility engine validation passed: lover=${first.score}(raw ${first.rawTotal}), crush=${crush.score}(raw ${crush.rawTotal}), flirting=${flirting.score}(raw ${flirting.rawTotal}), friendUnknown=${oneUnknown.score}(raw ${oneUnknown.rawTotal}), coworkerUnknown=${bothUnknown.score}(raw ${bothUnknown.rawTotal}); public full range=30-100`,
);
