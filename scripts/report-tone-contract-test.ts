import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectPaidNarrativeQualityIssues } from "../src/lib/narrative/report-engine-v6-request";

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
const requestEngine = readFileSync("src/lib/narrative/report-engine-v6-request.ts", "utf8");
const css = readFileSync("src/app/report-extra.css", "utf8");
const chapterA = readFileSync("src/app/one-to-one/result/report-v2-chapters-a.tsx", "utf8");

assert.match(engine, /paid-report-v7-editorial-v13-saju-boy-magic-school/);
assert.match(engine, /paid-report-evidence-v7/);
assert.match(engine, /관계에서 바로 체감할 결론/);
assert.match(engine, /구체적 장면/);
assert.match(engine, /사주 용어와 계산 근거/);
assert.match(engine, /dominantElements/);
assert.match(engine, /lighterElements/);
assert.match(engine, /interactionEvidence/);
assert.match(engine, /heavenlyStemInteraction/);
assert.match(engine, /earthlyBranchInteraction/);
assert.doesNotMatch(engine, /elementAnalysis: 각각 2~3문장\. strongest\/weakest/);

const internalIssues = collectPaidNarrativeQualityIssues({
  detail: "서버가 제공한 evidence의 strongest와 weakest를 참고값으로 설명합니다.",
}, "INTRO");
assert.ok(internalIssues.includes("INTERNAL_TERM_EXPOSED"));

const hedgingIssues = collectPaidNarrativeQualityIssues({
  detail: Array.from({ length: 6 }, () => "이렇게 보일 수 있습니다.").join(" "),
}, "INTRO");
assert.ok(hedgingIssues.includes("HEDGING_LANGUAGE_REPEATED"));

const cleanIssues = collectPaidNarrativeQualityIssues({
  detail: "이 관계는 약속을 정할 때 한쪽이 속도를 잡고 다른 한쪽이 세부 조건을 맞추는 흐름이 두드러집니다. 일간의 상호작용과 일지 리듬이 이 차이를 함께 보여줍니다.",
}, "INTRO");
assert.ok(!cleanIssues.includes("INTERNAL_TERM_EXPOSED"));
assert.ok(!cleanIssues.includes("HEDGING_LANGUAGE_REPEATED"));

assert.match(requestEngine, /HEDGING_LANGUAGE_REPEATED/);
assert.match(requestEngine, /서버가 제공한/);
assert.match(css, /\.reference-keywords span \{[\s\S]*max-width: 100%/);
assert.match(css, /overflow-wrap: anywhere/);
assert.match(css, /white-space: normal/);
assert.doesNotMatch(chapterA, /상대를 단정적으로 규정하지 않고/);
assert.match(chapterA, /이런 장면에서 상대의 패턴이 드러납니다/);

console.log("paid report P3 tone + evidence + mobile hashtag contract: PASS");
