import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const style = readFileSync("docs/report-editorial-style-v1.md", "utf8");
const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");

assert.match(style, /결론/);
assert.match(style, /근거/);
assert.match(style, /체감/);
assert.match(style, /행동/);
assert.match(style, /단정/);
assert.match(engine, /paid-report-v7-editorial-v4/);
assert.match(engine, /relationshipPromptRules/);
assert.match(engine, /RELATIONSHIP_EDITORIAL_VERSION/);
assert.match(engine, /친한 상담가가 핵심을 또렷하게 짚어 주는 어조/);
assert.match(engine, /계산상 나타나는 경향과 두 사람이 확인할 행동 신호를 구분/);
assert.match(engine, /누가·언제·어떤 말이나 행동/);

console.log("Day 10 editorial style policy checks: PASS");
