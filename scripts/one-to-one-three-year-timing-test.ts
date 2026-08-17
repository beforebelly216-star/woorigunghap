import assert from "node:assert/strict";
import { buildThreeYearTimingEvidence, THREE_YEAR_TIMING_VERSION } from "../src/lib/compatibility/three-year-timing";
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

assert.throws(() => buildThreeYearTimingEvidence(input, 2299), /1800~2298/);

console.log("1:1 three-year timing evidence checks: PASS");
