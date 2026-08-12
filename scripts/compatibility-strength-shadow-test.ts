import assert from "node:assert/strict";
import type { PersonBirthInput } from "../src/lib/report-input";
import { calculateStrengthCandidate } from "../src/lib/compatibility/strength-candidate";

function person(
  birthDate: string,
  birthTime: string | null,
): PersonBirthInput {
  return {
    displayName: "sample",
    gender: "male",
    calendarType: "solar",
    birthDate,
    birthTimeKnown: birthTime !== null,
    birthTime,
    isLeapMonth: false,
  };
}

const samples = [
  person("1984-06-15", "09:00"),
  person("1988-09-20", "16:00"),
  person("1990-05-15", "14:30"),
  person("1992-10-24", "05:30"),
  person("1995-11-11", "11:11"),
  person("1999-10-20", "10:25"),
  person("2000-06-10", "08:30"),
  person("2010-12-05", "18:00"),
  person("2020-04-20", "13:00"),
  person("2024-02-10", null),
];

const rows = samples.map((input) => {
  const result = calculateStrengthCandidate(input);
  const repeated = calculateStrengthCandidate(input);

  assert.deepEqual(result, repeated, "같은 입력은 shadow 강약 결과가 동일해야 합니다.");
  assert.equal(result.status, "SHADOW_ONLY");
  assert.equal(result.productionScoringEnabled, false);
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.components.deukryeong.score >= 0 && result.components.deukryeong.score <= 100);
  assert.ok(result.components.deukji.score >= 0 && result.components.deukji.score <= 100);
  assert.ok(result.components.deukse.score >= 0 && result.components.deukse.score <= 100);

  return {
    date: input.birthDate,
    time: input.birthTime ?? "unknown",
    score: result.score,
    level: result.level,
    deukryeong: result.components.deukryeong.score,
    deukji: result.components.deukji.score,
    deukse: result.components.deukse.score,
    support: result.components.deukse.supportPower,
    pressure: result.components.deukse.pressurePower,
  };
});

console.table(rows);
const scores = rows.map((row) => row.score);
console.log(
  `Strength shadow validation passed: ${rows.length}/${rows.length} samples; range ${Math.min(...scores)}~${Math.max(...scores)}`,
);
