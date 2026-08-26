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
const pageSource = readFileSync("src/app/one-to-many/page.tsx", "utf8");
const cssSource = readFileSync("src/app/one-to-many/one-to-many-input-v3.css", "utf8");
const homeSource = readFileSync("src/app/page.tsx", "utf8");
const freeResultSource = readFileSync("src/components/free-self-analysis.tsx", "utf8");

assert.match(formSource, /ONE_TO_MANY_MIN_CANDIDATES/);
assert.match(formSource, /ONE_TO_MANY_MAX_CANDIDATES/);
assert.match(formSource, /localStorage\.setItem/);
assert.match(formSource, /localStorage\.getItem/);
assert.match(formSource, /STEP_LABELS = \["기본 정보", "후보 정보", "확인"\]/);
assert.match(formSource, /setCandidateCount/);
assert.match(formSource, /candidate-tabs/);
assert.match(formSource, /입력 정보 확인/);
assert.match(formSource, /1:N 궁합 분석 시작하기 · 3,000원/);
assert.match(formSource, /person\.birthTime\.replace\(":", ""\)/, "저장 draft 복원 시 24시간 HHMM을 그대로 사용해야 합니다.");
assert.doesNotMatch(formSource, /twelveHour|hour > 12|meridiem = hour >= 12/, "1:N 복원 화면에서 12시간제로 되돌리면 안 됩니다.");
assert.match(pageSource, /1:N 비교 궁합 · 3단계/);
assert.match(pageSource, /24시간제 HHMM/);
assert.match(pageSource, /one-to-many-input-v3\.css/);
assert.match(cssSource, /\.step-progress-track/);
assert.match(cssSource, /\.candidate-tabs/);
assert.match(cssSource, /\.review-block/);
assert.match(cssSource, /--zootopi-butter/);
assert.doesNotMatch(cssSource, /gradient|box-shadow/i);

assert.match(homeSource, /href="\/one-to-many"/, "승인된 A안 홈은 1:N 직접 진입을 제공해야 합니다.");
assert.match(homeSource, /1:N 궁합/);
assert.match(freeResultSource, /href="\/one-to-many"/, "무료 결과 이후에도 1:N 진입이 유지되어야 합니다.");

console.log("Day 13 one-to-many input v3 + A-reference home entry contract checks: PASS");
