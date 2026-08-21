import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  collectPaidNarrativeQualityIssues,
  groundPaidIntroWithServerEvidence,
} from "../src/lib/narrative/report-engine-v6-request";
import { personalizeNarrativeNames } from "../src/lib/narrative/name-personalization";

const duplicate = "두 사람의 관계에서 같은 장문이 여러 필드에 그대로 반복되면 유료 리포트의 체감 가치가 크게 떨어집니다.";
const duplicateIssues = collectPaidNarrativeQualityIssues({ a: duplicate, b: duplicate }, "TEST");
assert.ok(duplicateIssues.includes("EXACT_LONG_TEXT_DUPLICATE"), "40자 이상 동일 문장은 반드시 탐지해야 합니다");

const aiIntro = {
  personA: { overallProfile: "기해(己亥)인 A는 A만의 문장입니다." },
  personB: { overallProfile: "갑자(甲子)인 B는 완전히 다른 문장입니다." },
};
assert.equal(groundPaidIntroWithServerEvidence(aiIntro, "payload"), aiIntro, "AI intro must not be replaced by a server template");
assert.notEqual(
  aiIntro.personA.overallProfile.replace(/[AB]/g, ""),
  aiIntro.personB.overallProfile.replace(/[AB]/g, ""),
  "person A/B intro copy must remain distinct",
);
assert.doesNotMatch(JSON.stringify(aiIntro), /서버 계산상/);

const personalized = personalizeNarrativeNames({
  doubleQuoted: "\"나도 같이 가도 돼?\"",
  singleQuoted: "'내가 네 생각 많이 했어'",
  curlyQuoted: "“나도 같이 가도 돼?”",
  prose: "나는 먼저 설명하고 상대에게 선택권을 줍니다.",
}, { self: "전종윤", partner: "이유빈" });
assert.equal(personalized.doubleQuoted, "\"나도 같이 가도 돼?\"");
assert.equal(personalized.singleQuoted, "'내가 네 생각 많이 했어'");
assert.equal(personalized.curlyQuoted, "“나도 같이 가도 돼?”");
assert.match(personalized.prose, /전종윤님은/);
assert.match(personalized.prose, /이유빈님에게/);

const requestSource = readFileSync("src/lib/narrative/report-engine-v6-request.ts", "utf8");
assert.ok(requestSource.includes('"EXACT_LONG_TEXT_DUPLICATE"'));
assert.ok(!requestSource.includes("return { ...value, personA, personB }"));
assert.ok(requestSource.includes("서버 계산상"));

const engineSource = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
assert.ok(engineSource.includes("keyTakeaways: objectSchema({ ch0: STRING_ARRAY, ch1: STRING_ARRAY })"));
assert.ok(engineSource.includes("mergePaidReportSegmentContents"));

for (const path of [
  "src/app/one-to-one/result/report-v2-chapters-a.tsx",
  "src/app/one-to-one/result/report-v2-chapters-b.tsx",
]) {
  const source = readFileSync(path, "utf8");
  assert.ok(!source.includes("summary={[content."), `${path} must not reuse body fields as chapter summary`);
  assert.ok(source.includes('chapterSummary(content, "ch'), `${path} must render dedicated keyTakeaways`);
}

console.log("report dedup and personalization contract: PASS");
