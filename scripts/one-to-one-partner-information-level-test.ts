import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  birthTimeNoticeFromFacts,
  birthTimeNoticeFromPerson,
} from "../src/lib/partner-information-level";

assert.equal(birthTimeNoticeFromPerson({ birthTimeKnown: true }), null);
assert.equal(birthTimeNoticeFromFacts({ birthTimeKnown: true }), null);
assert.match(birthTimeNoticeFromPerson({ birthTimeKnown: false }) ?? "", /시주는 제외하고 년·월·일 기준/);
assert.match(birthTimeNoticeFromFacts({ birthTimeKnown: false }) ?? "", /시주는 제외하고 년·월·일 기준/);

const page = readFileSync("src/app/one-to-one/page.tsx", "utf8");
assert.match(page, /실명 대신 별칭/);
assert.match(page, /“OOO님”/);
assert.match(page, /이름·별칭 원문은 AI 서술 생성 요청에 전달하지 않아/);

const form = readFileSync("src/components/one-to-one-form-v3.tsx", "utf8");
assert.doesNotMatch(form, /정보 수준|정보수준/);
assert.doesNotMatch(form, /출생시간 미입력 안내|birthTimeNoticeFromPerson/);
assert.match(form, /const STEP_LABELS = \["내 정보", "상대방 정보", "확인"\]/);

const reportComponents = readFileSync("src/app/one-to-one/result/report-v2-components.tsx", "utf8");
assert.doesNotMatch(reportComponents, /정보 수준|정보수준/);
assert.doesNotMatch(reportComponents, /출생시간 미입력|birthTimeNoticeFromFacts/);

console.log("1:1 v3 input + hidden birth-time notice + display-name guidance checks: PASS");
