import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RELATIONSHIP_EDITORIAL,
  RELATIONSHIP_EDITORIAL_VERSION,
  relationshipPromptRules,
} from "../src/lib/relationship-editorial";

assert.equal(RELATIONSHIP_EDITORIAL_VERSION, "relationship-editorial-v1");
assert.deepEqual(Object.keys(RELATIONSHIP_EDITORIAL).sort(), ["coworker", "crush", "flirting", "friend", "lover"].sort());

assert.notEqual(RELATIONSHIP_EDITORIAL.crush.ui.strategyTitle, RELATIONSHIP_EDITORIAL.flirting.ui.strategyTitle);
assert.notEqual(RELATIONSHIP_EDITORIAL.flirting.ui.strategyTitle, RELATIONSHIP_EDITORIAL.lover.ui.strategyTitle);
assert.match(relationshipPromptRules("crush"), /호감 여부를 확정하지 말고/);
assert.match(relationshipPromptRules("flirting"), /교제와 독점성을 가정하지 않는다/);
assert.match(relationshipPromptRules("lover"), /이미 교제 중인 관계/);
assert.match(relationshipPromptRules("friend"), /연애적 끌림이나 독점성을 전제로 하지 않는다/);
assert.match(relationshipPromptRules("coworker"), /상사·동급·부하 관계는 입력받지 않았으므로 임의 추정하지 않는다/);
assert.match(relationshipPromptRules("lover"), /상대 해부 > 이 상대에게 통하는 나의 강점/);
assert.match(relationshipPromptRules("friend"), /최소 40%는 사용자가 바로 실행할 수 있는 행동 기준/);
assert.match(relationshipPromptRules("crush"), /공략법이 아니라 배려법/);

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
assert.match(engine, /paid-report-v7-editorial-v4/);
assert.match(engine, /relationshipPromptRules\(input\.relationshipType\)/);
assert.match(engine, /relationshipEditorialVersion/);

const chaptersA = readFileSync("src/app/one-to-one/result/report-v2-chapters-a.tsx", "utf8");
assert.match(chaptersA, /상대 해부 핵심/);
assert.match(chaptersA, /편해지기 쉬운 지점/);
assert.match(chaptersA, /잘 통하는 방식/);
assert.match(chaptersA, /reference-top3/);

const chaptersB = readFileSync("src/app/one-to-one/result/report-v2-chapters-b.tsx", "utf8");
assert.match(chaptersB, /getRelationshipEditorialProfileByLabel/);
assert.match(chaptersB, /editorial\.ui\.strategyTitle/);
assert.match(chaptersB, /editorial\.ui\.flowTitle/);
assert.match(chaptersB, /editorial\.ui\.closenessTitle/);
assert.match(chaptersB, /editorial\.ui\.actionTitle/);
assert.match(chaptersB, /이 관계의 미래를 가르는 조건/);
assert.match(chaptersB, /30-DAY ACTION PLAN/);
assert.match(chaptersB, /RELATIONSHIP FLOW & 3-YEAR TIMING/);
assert.match(chaptersB, /threeYearTiming\.years\.map/);
assert.match(chaptersB, /TIMING_PHASE_LABEL/);
assert.match(chaptersB, /특정 월·날짜 예측은 아직 포함하지 않습니다/);

const resultV2 = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
assert.match(resultV2, /threeYearTiming=\{snapshot\.threeYearTiming\}/);
assert.doesNotMatch(resultV2, /dimension !== "luckCycleAlignment"/);

console.log("Day 21 relationship editorial contract checks: PASS");
