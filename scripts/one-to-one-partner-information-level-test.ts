import assert from "node:assert/strict";
import {
  C_LEVEL_OBSERVATION_QUESTIONS,
  PARTNER_INFORMATION_LEVEL_COPY,
  partnerInformationLevelFromFacts,
  partnerInformationLevelFromPerson,
  validateCLevelObservationAnswers,
} from "../src/lib/partner-information-level";

assert.equal(partnerInformationLevelFromPerson({ birthTimeKnown: true }), "A");
assert.equal(partnerInformationLevelFromPerson({ birthTimeKnown: false }), "B");
assert.equal(partnerInformationLevelFromFacts({ birthTimeKnown: true }), "A");
assert.equal(partnerInformationLevelFromFacts({ birthTimeKnown: false }), "B");
assert.match(PARTNER_INFORMATION_LEVEL_COPY.A.detail, /네 기둥/);
assert.match(PARTNER_INFORMATION_LEVEL_COPY.B.detail, /시나리오/);
assert.match(PARTNER_INFORMATION_LEVEL_COPY.C.detail, /결정론적 1:1 점수와 혼합하지 않습니다/);
assert.equal(C_LEVEL_OBSERVATION_QUESTIONS.length, 10);
assert.equal(new Set(C_LEVEL_OBSERVATION_QUESTIONS.map((question) => question.id)).size, 10);

const empty = validateCLevelObservationAnswers({});
assert.equal(empty.valid, false);
assert.equal(Object.keys(empty.errors).length, 10);

const completeAnswers = Object.fromEntries(C_LEVEL_OBSERVATION_QUESTIONS.map((question) => [
  question.id,
  question.options ? question.options[0] : "내가 말한 작은 내용을 기억해 두었다가 나중에 다시 물어본다",
]));
const complete = validateCLevelObservationAnswers(completeAnswers);
assert.equal(complete.valid, true);
assert.equal(Object.keys(complete.errors).length, 0);

const tooLong = validateCLevelObservationAnswers({
  ...completeAnswers,
  distinctiveBehavior: "가".repeat(101),
});
assert.equal(tooLong.valid, false);
assert.match(tooLong.errors.distinctiveBehavior ?? "", /100자/);

console.log("1:1 partner information level checks: PASS");
