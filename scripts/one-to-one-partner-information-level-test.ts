import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PARTNER_INFORMATION_LEVELS,
  PARTNER_INFORMATION_LEVEL_COPY,
  partnerInformationLevelFromFacts,
  partnerInformationLevelFromPerson,
} from "../src/lib/partner-information-level";

assert.deepEqual(PARTNER_INFORMATION_LEVELS, ["A", "B"]);
assert.deepEqual(Object.keys(PARTNER_INFORMATION_LEVEL_COPY).sort(), ["A", "B"]);
assert.equal(partnerInformationLevelFromPerson({ birthTimeKnown: true }), "A");
assert.equal(partnerInformationLevelFromPerson({ birthTimeKnown: false }), "B");
assert.equal(partnerInformationLevelFromFacts({ birthTimeKnown: true }), "A");
assert.equal(partnerInformationLevelFromFacts({ birthTimeKnown: false }), "B");
assert.match(PARTNER_INFORMATION_LEVEL_COPY.A.detail, /네 기둥/);
assert.match(PARTNER_INFORMATION_LEVEL_COPY.B.detail, /대표 시간대 시나리오/);
assert.match(PARTNER_INFORMATION_LEVEL_COPY.B.detail, /점수 범위/);

const form = readFileSync("src/components/one-to-one-form.tsx", "utf8");
assert.match(form, /상대 정보 수준/);
assert.match(form, /PARTNER_INFORMATION_LEVEL_COPY/);

const reportComponents = readFileSync("src/app/one-to-one/result/report-v2-components.tsx", "utf8");
assert.match(reportComponents, /정보 수준 \{informationLevel\}/);
assert.match(reportComponents, /partnerInformationLevelFromFacts/);
assert.match(reportComponents, /PARTNER_INFORMATION_LEVEL_COPY/);

console.log("1:1 partner information level A/B checks: PASS");
