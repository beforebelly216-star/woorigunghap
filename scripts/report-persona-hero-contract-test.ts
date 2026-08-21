import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
const deep = readFileSync("src/lib/narrative/report-deep-content.ts", "utf8");
const chapter = readFileSync("src/app/one-to-one/result/report-v2-chapters-a.tsx", "utf8");
const css = readFileSync("src/app/report-extra.css", "utf8");

assert.match(engine, /paid-report-v7-editorial-v12-persona-inner-mind/);
assert.match(engine, /사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구/);
assert.match(engine, /도사체·점집체·논문체·상담 기록체는 피하세요/);
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
assert.ok(css.includes("@media (max-width: 700px) { .partner-inner-mind-hero"));

console.log("paid report P4 persona + inner-mind hero contract: PASS");
