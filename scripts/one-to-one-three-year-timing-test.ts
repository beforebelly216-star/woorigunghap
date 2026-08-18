import assert from "node:assert/strict";
import { buildThreeYearTimingEvidence, THREE_YEAR_TIMING_VERSION } from "../src/lib/compatibility/three-year-timing";
import {
  calculateThreeYearTimingAlignment,
  THREE_YEAR_TIMING_ALIGNMENT_VERSION,
} from "../src/lib/compatibility/timing-alignment";
import type { OneToOneReportInput } from "../src/lib/report-input";

const input: Pick<OneToOneReportInput, "personA" | "personB"> = {
  personA: {
    displayName: "나",
    gender: "male",
    calendarType: "solar",
    birthDate: "1990-05-15",
    birthTimeKnown: true,
    birthTime: "14:30",
    isLeapMonth: false,
  },
  personB: {
    displayName: "상대",
    gender: "female",
    calendarType: "solar",
    birthDate: "1992-10-24",
    birthTimeKnown: false,
    birthTime: null,
    isLeapMonth: false,
  },
};

const evidence = buildThreeYearTimingEvidence(input, 2026);
assert.equal(evidence.version, THREE_YEAR_TIMING_VERSION);
assert.equal(evidence.baseYear, 2026);
assert.deepEqual(evidence.years.map((item) => item.year), [2026, 2027, 2028]);
assert.equal(new Set(evidence.years.map((item) => item.annualPillar.korean)).size, 3);

for (const year of evidence.years) {
  assert.match(year.annualPillar.korean, /^[가-힣]{2}$/);
  assert.equal(year.personA.informationLevel, "A");
  assert.equal(year.personA.scenarioCount, 1);
  assert.ok(year.personA.candidates.length >= 1);
  assert.equal(year.personB.informationLevel, "B");
  assert.equal(year.personB.scenarioCount, 12);
  assert.ok(year.personB.candidates.length >= 1);
}

const alignment = calculateThreeYearTimingAlignment(input, 2026);
assert.equal(alignment.version, THREE_YEAR_TIMING_ALIGNMENT_VERSION);
assert.equal(alignment.evidenceVersion, THREE_YEAR_TIMING_VERSION);
assert.equal(alignment.baseYear, 2026);
assert.equal(alignment.years.length, 3);
assert.ok(alignment.normalizedScore >= 45 && alignment.normalizedScore <= 92);
assert.ok(alignment.scoreRange.min <= alignment.normalizedScore);
assert.ok(alignment.normalizedScore <= alignment.scoreRange.max);
assert.notEqual(alignment.confidence, "high", "B레벨이 포함되면 전체 타이밍 신뢰도를 high로 표시하지 않습니다.");

for (const year of alignment.years) {
  assert.ok(["rising", "adjusting", "caution"].includes(year.phase));
  assert.ok(year.score >= 45 && year.score <= 92);
  assert.ok(year.scoreRange.min <= year.score);
  assert.ok(year.score <= year.scoreRange.max);
  assert.ok(year.signals.length >= 1);
  assert.ok(year.signals.length <= 4);
}

const swapped = calculateThreeYearTimingAlignment({
  personA: input.personB,
  personB: input.personA,
}, 2026);
assert.equal(alignment.normalizedScore, swapped.normalizedScore, "A/B 순서를 바꿔도 타이밍 점수는 대칭이어야 합니다.");
assert.deepEqual(
  alignment.years.map((year) => year.score),
  swapped.years.map((year) => year.score),
  "A/B 순서를 바꿔도 연도별 타이밍 점수는 대칭이어야 합니다.",
);

assert.throws(() => buildThreeYearTimingEvidence(input, 2299), /1800~2298/);

console.log("1:1 three-year timing evidence and alignment checks: PASS");
