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

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
assert.match(engine, /paid-report-v7-editorial-v4/);
assert.match(engine, /relationshipPromptRules\(input\.relationshipType\)/);
assert.match(engine, /relationshipEditorialVersion/);

const chapters = readFileSync("src/app/one-to-one/result/report-v2-chapters-b.tsx", "utf8");
assert.match(chapters, /getRelationshipEditorialProfileByLabel/);
assert.match(chapters, /editorial\.ui\.strategyTitle/);
assert.match(chapters, /editorial\.ui\.flowTitle/);
assert.match(chapters, /editorial\.ui\.closenessTitle/);
assert.match(chapters, /editorial\.ui\.actionTitle/);

console.log("Day 21 relationship editorial contract checks: PASS");
