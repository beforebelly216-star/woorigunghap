import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { personalizeNarrativeNames } from "../src/lib/narrative/name-personalization";

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
const deep = readFileSync("src/lib/narrative/report-deep-content.ts", "utf8");
const chapter = readFileSync("src/app/one-to-one/result/report-v2-chapters-a.tsx", "utf8");
const css = readFileSync("src/app/report-extra.css", "utf8");

assert.match(engine, /paid-report-v7-editorial-v15-concise-structured/);
assert.match(engine, /화자 캐릭터 '사주소년'/);
assert.match(engine, /마법학교 도서관/);
assert.match(engine, /특정 소설·영화의 인물·학교·주문·고유명사·대사를 흉내 내거나 인용하지 마세요/);
assert.match(engine, /소년다운 호기심 40%/);
assert.match(engine, /유치한 아동체, 과한 역할극, 도사체·점집체·논문체·상담 기록체는 피하세요/);
assert.match(engine, /짝사랑은 신호 해석과 거리 조절/);
assert.match(engine, /partnerInnerMindHero: PARTNER_INNER_MIND_HERO_SCHEMA/);
assert.match(engine, /validPartnerInnerMindHero/);
assert.match(engine, /1인칭 가상 독백/);
assert.match(engine, /실제 내면을 안다고 주장하지 말고/);
assert.match(engine, /PARTNER_INNER_MIND_HERO_SHORT/);
assert.match(deep, /export type PartnerInnerMindHero/);
assert.ok(deep.includes("partnerInnerMindHero?: PartnerInnerMindHero"));
assert.match(chapter, /partner-inner-mind-hero/);
assert.match(chapter, />그 사람의 속마음</);
assert.match(chapter, />사주로 보면</);
assert.ok(css.includes(".partner-inner-mind-hero"));
// Breakpoint values are part of the responsive design system and may change.
// The contract should protect the mobile-specific hero treatment, not a historical literal width.
assert.match(
  css,
  /@media \(max-width: [^)]+\) \{ \.partner-inner-mind-hero \{ padding: 22px 19px; border-radius: 22px; \} \}/,
);

const personalizedHero = personalizeNarrativeNames({
  partnerInnerMindHero: {
    innerVoice: "나는 좋아도 내 속도를 지켜주면 더 가까워지고 싶어.",
  },
  ordinary: "나는 상대에게 먼저 말한다.",
}, { self: "민지", partner: "서준" });
assert.equal(personalizedHero.partnerInnerMindHero.innerVoice, "나는 좋아도 내 속도를 지켜주면 더 가까워지고 싶어.");
assert.notEqual(personalizedHero.ordinary, "나는 상대에게 먼저 말한다.");

console.log("paid report P4 persona + inner-mind hero contract: PASS");
