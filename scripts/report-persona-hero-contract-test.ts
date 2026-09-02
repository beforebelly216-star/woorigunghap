import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { personalizeNarrativeNames } from "../src/lib/narrative/name-personalization";

const engine = readFileSync("src/lib/narrative/report-engine-v8.ts", "utf8");
const deep = readFileSync("src/lib/narrative/report-deep-content.ts", "utf8");
const layout = readFileSync("src/app/one-to-one/result/report-layout-v3.tsx", "utf8");

assert.match(engine, /paid-report-v9-jootopi-direct-voice/);
assert.match(engine, /당신은 주토피입니다/);
assert.match(engine, /어렵고 낡은 점집 말투 대신 정확하고 자연스러운 현대 한국어/);
assert.match(engine, /주토피가 친근한 반말/);
assert.doesNotMatch(engine, /화자 캐릭터 '사주소년'|마법학교 도서관|소년다운 호기심 40%/);
assert.match(engine, /relationshipPromptRules/);
assert.match(deep, /export type PartnerInnerMindHero/);
assert.ok(deep.includes("partnerInnerMindHero?: PartnerInnerMindHero"));
assert.doesNotMatch(layout, /partner-inner-mind-hero|그 사람의 속마음|짝사랑 전용 해석/);
assert.match(layout, /<ZootopiCaption/);
assert.match(layout, /주토피 노트/);

const personalizedHero = personalizeNarrativeNames({
  partnerInnerMindHero: {
    innerVoice: "나는 좋아도 내 속도를 지켜주면 더 가까워지고 싶어.",
  },
  ordinary: "나는 상대에게 먼저 말한다.",
}, { self: "민지", partner: "서준" });
assert.equal(personalizedHero.partnerInnerMindHero.innerVoice, "나는 좋아도 내 속도를 지켜주면 더 가까워지고 싶어.");
assert.notEqual(personalizedHero.ordinary, "나는 상대에게 먼저 말한다.");

console.log("paid report Jootopi persona + compatibility-only legacy fields contract: PASS");
