import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  DAY_PILLAR_CHARACTER_CATALOG,
  SIXTY_DAY_PILLARS,
  getDayPillarCharacter,
} from "../src/lib/narrative/day-pillar-characters";

assert.equal(SIXTY_DAY_PILLARS.length, 60, "60갑자 목록은 정확히 60개여야 합니다.");
assert.equal(new Set(SIXTY_DAY_PILLARS).size, 60, "60갑자 목록은 중복이 없어야 합니다.");
assert.equal(SIXTY_DAY_PILLARS[0], "갑자");
assert.equal(SIXTY_DAY_PILLARS[59], "계해");

const characters = SIXTY_DAY_PILLARS.map((pillar) => {
  const character = getDayPillarCharacter(pillar);
  assert.ok(character, `${pillar} 캐릭터가 있어야 합니다.`);
  assert.equal(character.pillar, pillar);
  assert.ok(character.title.includes(pillar));
  assert.ok(character.tagline.length >= 20);
  assert.equal(character.strengths.length, 2);
  assert.ok(character.watchOut.length >= 10);
  assert.ok(character.relationshipCue.length >= 10);
  return character;
});

assert.equal(Object.keys(DAY_PILLAR_CHARACTER_CATALOG).length, 60);
assert.equal(new Set(characters.map((item) => item.title)).size, 60, "60개 캐릭터 제목은 모두 구분되어야 합니다.");
assert.equal(getDayPillarCharacter("갑축"), null, "60갑자에 없는 음양 불일치 조합은 거부해야 합니다.");
assert.equal(getDayPillarCharacter(null), null);

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
assert.ok(engine.includes("paid-report-v7-editorial-v15-concise-structured"));
assert.ok(engine.includes("dayPillarCharacter"), "AI 편집 payload에 일주 캐릭터가 연결되어야 합니다.");
assert.ok(engine.includes("일주 캐릭터는 보조 편집 렌즈"), "캐릭터가 계산 근거를 덮어쓰지 못하는 규칙이 필요합니다.");

const result = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
assert.ok(result.includes("DayPillarCharacterCard"));
assert.ok(result.includes("getDayPillarCharacter(facts.A.pillars.day.korean)"));
assert.ok(result.includes("getDayPillarCharacter(facts.B.pillars.day.korean)"));
assert.ok(result.includes("두 사람의 60일주 캐릭터"));

const css = readFileSync("src/app/report-extra.css", "utf8");
assert.ok(css.includes(".day-pillar-character-grid"));
assert.ok(css.includes(".day-pillar-character-card"));

console.log("paid 1:1 60-day-pillar character contract: PASS");
