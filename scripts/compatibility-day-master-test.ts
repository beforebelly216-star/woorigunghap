import assert from "node:assert/strict";
import { scoreDayMasterCompatibility } from "../src/lib/compatibility/day-master";
import {
  COMPATIBILITY_SCORE_WEIGHTS,
  getCompatibilityProfileTotal,
} from "../src/lib/compatibility/weights";
import type { CompatibilityProfile } from "../src/lib/compatibility/types";

const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const profiles: CompatibilityProfile[] = ["romance", "friend", "coworker"];

for (const profile of profiles) {
  assert.equal(
    getCompatibilityProfileTotal(profile),
    100,
    `${profile} 배점 합계는 100이어야 합니다.`,
  );
}

assert.equal(COMPATIBILITY_SCORE_WEIGHTS.romance.dayMaster, 10);
assert.equal(COMPATIBILITY_SCORE_WEIGHTS.friend.dayMaster, 15);
assert.equal(COMPATIBILITY_SCORE_WEIGHTS.coworker.dayMaster, 15);

const woodGeneratesFire = scoreDayMasterCompatibility("甲", "丙", "romance");
assert.equal(woodGeneratesFire.relation, "GENERATES");
assert.equal(woodGeneratesFire.direction, "A_TO_B");
assert.equal(woodGeneratesFire.normalizedScore, 85);
assert.equal(woodGeneratesFire.weightedPoints, 8.5);

const reversedGeneration = scoreDayMasterCompatibility("丙", "甲", "romance");
assert.equal(reversedGeneration.relation, "GENERATES");
assert.equal(reversedGeneration.direction, "B_TO_A");
assert.equal(reversedGeneration.normalizedScore, 85);

const metalControlsWood = scoreDayMasterCompatibility("庚", "甲", "friend");
assert.equal(metalControlsWood.relation, "CONTROLS");
assert.equal(metalControlsWood.direction, "A_TO_B");
assert.equal(metalControlsWood.normalizedScore, 55);
assert.equal(metalControlsWood.weightedPoints, 8.25);

const sameElementOppositePolarity = scoreDayMasterCompatibility("甲", "乙", "coworker");
assert.equal(sameElementOppositePolarity.relation, "SAME_ELEMENT");
assert.equal(sameElementOppositePolarity.direction, "MUTUAL");
assert.equal(sameElementOppositePolarity.polarityRelation, "OPPOSITE");
assert.equal(sameElementOppositePolarity.normalizedScore, 70);
assert.equal(sameElementOppositePolarity.weightedPoints, 10.5);

const koreanAlias = scoreDayMasterCompatibility("갑", "병", "romance");
assert.equal(koreanAlias.canonicalStemA, "甲");
assert.equal(koreanAlias.canonicalStemB, "丙");
assert.equal(koreanAlias.normalizedScore, 85);

let checkedPairs = 0;
for (const stemA of stems) {
  for (const stemB of stems) {
    const forward = scoreDayMasterCompatibility(stemA, stemB, "romance");
    const reverse = scoreDayMasterCompatibility(stemB, stemA, "romance");

    assert.equal(
      forward.normalizedScore,
      reverse.normalizedScore,
      `${stemA}/${stemB} 입력 순서에 따라 점수가 달라지면 안 됩니다.`,
    );
    assert.equal(
      forward.relation,
      reverse.relation,
      `${stemA}/${stemB} 입력 순서에 따라 관계 종류가 달라지면 안 됩니다.`,
    );

    if (forward.direction === "A_TO_B") {
      assert.equal(reverse.direction, "B_TO_A");
    } else if (forward.direction === "B_TO_A") {
      assert.equal(reverse.direction, "A_TO_B");
    } else {
      assert.equal(reverse.direction, "MUTUAL");
    }

    assert.ok([55, 70, 85].includes(forward.normalizedScore));
    checkedPairs += 1;
  }
}

assert.equal(checkedPairs, 100);
assert.throws(
  () => scoreDayMasterCompatibility("X", "甲", "romance"),
  RangeError,
);

console.log(`Day-master compatibility validation passed: ${checkedPairs}/100 ordered stem pairs`);
