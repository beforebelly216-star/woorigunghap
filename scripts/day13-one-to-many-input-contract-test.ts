import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ONE_TO_MANY_MAX_CANDIDATES,
  ONE_TO_MANY_MIN_CANDIDATES,
  RELATIONSHIP_TYPES,
  parseOneToManyReportInput,
  validateOneToManyReportInput,
  type OneToManyReportInput,
  type PersonBirthInput,
} from "../src/lib/report-input";

function person(displayName: string): PersonBirthInput {
  return {
    displayName,
    gender: "female",
    calendarType: "solar",
    birthDate: "1990-01-15",
    birthTimeKnown: true,
    birthTime: "09:30",
    isLeapMonth: false,
  };
}

function input(candidateCount: number): OneToManyReportInput {
  return {
    relationshipType: "friend",
    referencePerson: person("기준자"),
    candidates: Array.from({ length: candidateCount }, (_, index) => person(`후보 ${index + 1}`)),
  };
}

for (const relationshipType of RELATIONSHIP_TYPES) {
  const candidate = { ...input(2), relationshipType };
  assert.deepEqual(parseOneToManyReportInput(candidate), candidate);
  assert.equal(validateOneToManyReportInput(candidate).valid, true);
}

assert.equal(validateOneToManyReportInput(input(ONE_TO_MANY_MIN_CANDIDATES)).valid, true);
assert.equal(validateOneToManyReportInput(input(ONE_TO_MANY_MAX_CANDIDATES)).valid, true);

const tooFew = validateOneToManyReportInput(input(ONE_TO_MANY_MIN_CANDIDATES - 1));
assert.equal(tooFew.valid, false);
assert.match(tooFew.errors.candidates, /2명부터 5명/);

const tooMany = validateOneToManyReportInput(input(ONE_TO_MANY_MAX_CANDIDATES + 1));
assert.equal(tooMany.valid, false);
assert.match(tooMany.errors.candidates, /2명부터 5명/);

const futureDate = input(2);
futureDate.candidates[1] = {
  ...futureDate.candidates[1],
  birthDate: `${new Date().getFullYear() + 1}-01-01`,
};
const futureResult = validateOneToManyReportInput(futureDate);
assert.equal(futureResult.valid, false);
assert.match(futureResult.errors["candidates.1.birthDate"], /미래/);

const unknownTime = input(2);
unknownTime.referencePerson = {
  ...unknownTime.referencePerson,
  birthTimeKnown: false,
  birthTime: null,
};
assert.equal(validateOneToManyReportInput(unknownTime).valid, true);

const malformed = {
  ...input(2),
  candidates: [{ ...person("후보 1"), birthTimeKnown: "yes" }, person("후보 2")],
};
assert.equal(parseOneToManyReportInput(malformed), null);
assert.equal(parseOneToManyReportInput({ ...input(2), candidates: "not-an-array" }), null);

const formSource = readFileSync("src/components/one-to-many-form.tsx", "utf8");
const homeSource = readFileSync("src/app/page.tsx", "utf8");
assert.match(formSource, /ONE_TO_MANY_MIN_CANDIDATES/);
assert.match(formSource, /ONE_TO_MANY_MAX_CANDIDATES/);
assert.match(formSource, /localStorage\.setItem/);
assert.match(formSource, /localStorage\.getItem/);
assert.match(homeSource, /href="\/one-to-many"/);

console.log("Day 13 one-to-many input contract checks: PASS");
