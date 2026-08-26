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
  return { displayName, gender: "female", calendarType: "solar", birthDate: "1990-01-15", birthTimeKnown: true, birthTime: "09:30", isLeapMonth: false };
}
function input(candidateCount: number): OneToManyReportInput {
  return { relationshipType: "friend", referencePerson: person("기준자"), candidates: Array.from({ length: candidateCount }, (_, index) => person(`후보 ${index + 1}`)) };
}
for (const relationshipType of RELATIONSHIP_TYPES) {
  const candidate = { ...input(2), relationshipType };
  assert.deepEqual(parseOneToManyReportInput(candidate), candidate);
  assert.equal(validateOneToManyReportInput(candidate).valid, true);
}
assert.equal(validateOneToManyReportInput(input(ONE_TO_MANY_MIN_CANDIDATES)).valid, true);
assert.equal(validateOneToManyReportInput(input(ONE_TO_MANY_MAX_CANDIDATES)).valid, true);
const tooFew = validateOneToManyReportInput(input(ONE_TO_MANY_MIN_CANDIDATES - 1));
assert.equal(tooFew.valid, false); assert.match(tooFew.errors.candidates, /2명부터 5명/);
const tooMany = validateOneToManyReportInput(input(ONE_TO_MANY_MAX_CANDIDATES + 1));
assert.equal(tooMany.valid, false); assert.match(tooMany.errors.candidates, /2명부터 5명/);
const unknownTime = input(2); unknownTime.referencePerson = { ...unknownTime.referencePerson, birthTimeKnown: false, birthTime: null };
assert.equal(validateOneToManyReportInput(unknownTime).valid, true);

const formSource = readFileSync("src/components/one-to-many-form.tsx", "utf8");
const pageSource = readFileSync("src/app/one-to-many/page.tsx", "utf8");
const cssSource = readFileSync("src/app/one-to-many/one-to-many-input-v3.css", "utf8");
const homeSource = readFileSync("src/app/page.tsx", "utf8");
assert.match(formSource, /ONE_TO_MANY_MIN_CANDIDATES/);
assert.match(formSource, /ONE_TO_MANY_MAX_CANDIDATES/);
assert.match(formSource, /localStorage\.setItem/);
assert.match(formSource, /STEP_LABELS = \["기본 정보", "후보 정보", "확인"\]/);
assert.match(formSource, /candidate-tabs/);
assert.match(formSource, /1:N 궁합 분석 시작하기 · 3,000원/);
assert.match(formSource, /person\.birthTime\.replace\(":", ""\)/);
assert.match(pageSource, /1:N 궁합 입력/);
assert.match(pageSource, /reference-input-screen/);
assert.match(pageSource, /one-to-many-input-v3\.css/);
assert.match(cssSource, /one-to-many-reference-page/);
assert.match(cssSource, /\.step-progress-track/);
assert.match(cssSource, /\.candidate-tabs/);
assert.match(cssSource, /\.review-block/);
assert.match(cssSource, /#7b46d8/i);
assert.match(homeSource, /href="\/one-to-many"/);
assert.match(homeSource, /1:N 궁합/);
console.log("Day 13 one-to-many calculation + reference input UI contract checks: PASS");
