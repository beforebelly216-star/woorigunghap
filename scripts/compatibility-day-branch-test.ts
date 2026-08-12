import assert from "node:assert/strict";
import { scoreDayBranchCompatibility } from "../src/lib/compatibility/day-branch";

const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

let checked = 0;
for (const a of branches) {
  for (const b of branches) {
    const forward = scoreDayBranchCompatibility(a, b, "romance");
    const reverse = scoreDayBranchCompatibility(b, a, "romance");
    assert.equal(forward.normalizedScore, reverse.normalizedScore, `${a}/${b} score symmetry`);
    assert.equal(forward.primaryRelation, reverse.primaryRelation, `${a}/${b} relation symmetry`);
    assert.deepEqual(forward.evidenceRelations, reverse.evidenceRelations, `${a}/${b} evidence symmetry`);
    assert.equal(forward.maxPoints, 15);
    checked += 1;
  }
}

assert.equal(checked, 144);

assert.deepEqual(
  { relation: scoreDayBranchCompatibility("子", "丑", "romance").primaryRelation, score: scoreDayBranchCompatibility("子", "丑", "romance").normalizedScore },
  { relation: "SIX_HARMONY", score: 90 },
);
assert.deepEqual(
  { relation: scoreDayBranchCompatibility("子", "寅", "romance").primaryRelation, score: scoreDayBranchCompatibility("子", "寅", "romance").normalizedScore },
  { relation: "NEUTRAL", score: 70 },
);
assert.deepEqual(
  { relation: scoreDayBranchCompatibility("子", "未", "romance").primaryRelation, score: scoreDayBranchCompatibility("子", "未", "romance").normalizedScore },
  { relation: "HARM", score: 60 },
);
assert.deepEqual(
  { relation: scoreDayBranchCompatibility("子", "卯", "romance").primaryRelation, score: scoreDayBranchCompatibility("子", "卯", "romance").normalizedScore },
  { relation: "PUNISHMENT", score: 55 },
);
assert.deepEqual(
  { relation: scoreDayBranchCompatibility("子", "午", "romance").primaryRelation, score: scoreDayBranchCompatibility("子", "午", "romance").normalizedScore },
  { relation: "CLASH", score: 45 },
);

const harmonyAndPunishment = scoreDayBranchCompatibility("巳", "申", "romance");
assert.deepEqual(harmonyAndPunishment.evidenceRelations, ["SIX_HARMONY", "PUNISHMENT"]);
assert.equal(harmonyAndPunishment.primaryRelation, "SIX_HARMONY");
assert.equal(harmonyAndPunishment.normalizedScore, 90);

const clashAndPunishment = scoreDayBranchCompatibility("寅", "申", "romance");
assert.deepEqual(clashAndPunishment.evidenceRelations, ["CLASH", "PUNISHMENT"]);
assert.equal(clashAndPunishment.primaryRelation, "CLASH");
assert.equal(clashAndPunishment.normalizedScore, 45);

const selfPunishment = scoreDayBranchCompatibility("辰", "辰", "romance");
assert.equal(selfPunishment.primaryRelation, "PUNISHMENT");
assert.equal(selfPunishment.normalizedScore, 55);

// 破(파)는 항목 2에서 채점하지 않는다. 子酉는 다른 직접 관계가 없으므로 중립이다.
const breakOnlyExcluded = scoreDayBranchCompatibility("子", "酉", "romance");
assert.equal(breakOnlyExcluded.primaryRelation, "NEUTRAL");
assert.equal(breakOnlyExcluded.normalizedScore, 70);

const koreanAlias = scoreDayBranchCompatibility("사", "신", "friend");
assert.equal(koreanAlias.primaryRelation, "SIX_HARMONY");
assert.equal(koreanAlias.maxPoints, 5);
assert.equal(koreanAlias.weightedPoints, 4.5);

const coworkerClash = scoreDayBranchCompatibility("자", "오", "coworker");
assert.equal(coworkerClash.maxPoints, 5);
assert.equal(coworkerClash.weightedPoints, 2.25);

assert.throws(() => scoreDayBranchCompatibility("X", "子", "romance"), /지원하지 않는 일지/);

console.log(`Day-branch compatibility validation passed: ${checked}/144 ordered branch pairs`);
