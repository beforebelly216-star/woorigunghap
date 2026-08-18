import assert from "node:assert/strict";
import { calculateLuckCycleEvidence, UNKNOWN_TIME_LUCK_SCENARIOS } from "../src/lib/manseryeok/luck-cycle";
import type { PersonBirthInput } from "../src/lib/report-input";

const base: Omit<PersonBirthInput, "birthTimeKnown" | "birthTime"> = {
  displayName: "테스트",
  gender: "male",
  calendarType: "solar",
  birthDate: "1990-05-15",
  isLeapMonth: false,
};

const levelA = calculateLuckCycleEvidence({
  ...base,
  birthTimeKnown: true,
  birthTime: "14:30",
});

assert.equal(levelA.version, "luck-cycle-evidence-v1");
assert.equal(levelA.informationLevel, "A");
assert.equal(levelA.scenarioCount, 1);
assert.equal(levelA.startAgeRange.min, levelA.startAgeRange.max);
assert.equal(levelA.forwardStable, true);
assert.equal(levelA.pillarSequenceStable, true);
assert.ok(levelA.representative.pillars.length >= 8);

const levelB = calculateLuckCycleEvidence({
  ...base,
  birthTimeKnown: false,
  birthTime: null,
});

assert.equal(levelB.informationLevel, "B");
assert.equal(levelB.scenarioCount, UNKNOWN_TIME_LUCK_SCENARIOS.length);
assert.equal(levelB.scenarioCount, 12);
assert.ok(levelB.startAgeRange.min <= levelB.startAgeRange.max);
assert.ok(levelB.startOffsetRangeMonths.min <= levelB.startOffsetRangeMonths.max);
assert.equal(typeof levelB.forwardStable, "boolean");
assert.equal(typeof levelB.pillarSequenceStable, "boolean");
assert.ok(levelB.representative.pillars.length >= 8);
assert.equal(levelB.scenarios.length, 12);

console.log("1:1 luck-cycle evidence foundation checks: PASS");
