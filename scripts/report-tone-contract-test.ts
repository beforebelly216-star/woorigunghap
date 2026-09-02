import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectPaidNarrativeQualityIssues } from "../src/lib/narrative/report-engine-v6-request";

const engine = readFileSync("src/lib/narrative/report-engine-v8.ts", "utf8");
const requestEngine = readFileSync("src/lib/narrative/report-engine-v6-request.ts", "utf8");
const layout = readFileSync("src/app/one-to-one/result/report-layout-v3.tsx", "utf8");
const components = readFileSync("src/app/one-to-one/result/report-v2-components.tsx", "utf8");

assert.match(engine, /paid-report-v9-jootopi-direct-voice/);
assert.match(engine, /당신은 주토피입니다/);
assert.match(engine, /주토피가 친근한 반말/);
assert.match(engine, /전문 용어가 필요하면 먼저 일상 언어로 뜻을 설명/);
assert.match(engine, /'항목 점수', '가중치에 반영'/);
assert.match(engine, /현실 장면과 두 사람의 체감으로 번역/);
assert.match(engine, /overview\.headline은 화면 최상단에 한 줄만 노출/);
assert.doesNotMatch(layout, /짝사랑 전용 해석|장기 전망|관계 사용설명서/);
assert.match(layout, /둘 사이 케미는 어떨까/);
assert.match(layout, /지금 이 관계에서 가장 중요한 건 뭘까/);
assert.match(components, /무슨 뜻일까/);
assert.match(components, /두 사람에게는/);

const internalIssues = collectPaidNarrativeQualityIssues({
  detail: "서버가 제공한 evidence의 strongest와 weakest를 참고값으로 설명합니다.",
}, "INTRO");
assert.ok(internalIssues.includes("INTERNAL_TERM_EXPOSED"));

const hedgingIssues = collectPaidNarrativeQualityIssues({
  detail: Array.from({ length: 6 }, () => "이렇게 보일 수 있습니다.").join(" "),
}, "INTRO");
assert.ok(hedgingIssues.includes("HEDGING_LANGUAGE_REPEATED"));

const cleanIssues = collectPaidNarrativeQualityIssues({
  detail: "둘은 약속을 정할 때 한쪽이 속도를 잡고 다른 한쪽이 세부 조건을 맞추는 흐름이 두드러져. 일간의 상호작용과 일지 리듬이 이 차이를 함께 보여.",
}, "INTRO");
assert.ok(!cleanIssues.includes("INTERNAL_TERM_EXPOSED"));
assert.ok(!cleanIssues.includes("HEDGING_LANGUAGE_REPEATED"));

assert.match(requestEngine, /HEDGING_LANGUAGE_REPEATED/);
assert.match(requestEngine, /서버가 제공한/);

console.log("paid report Jootopi voice + evidence explanation contract: PASS");
