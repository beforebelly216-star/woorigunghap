import assert from "node:assert/strict";
import { RELATIONSHIP_TYPES } from "../src/lib/report-input";
import {
  CURIOSITY_MASK_TOKEN,
  PRODUCTION_RELATIONSHIP_SHARE_COPY,
  SHARE_COPY_PURPOSES,
  SHARE_COPY_TONES,
  SHARE_PATTERN_BY_ARCHETYPE,
  SHARE_RELATIONSHIP_PATTERNS,
  maskCuriosityAnswer,
  selectRelationshipShareCopy,
  selectRelationshipShareCopyForArchetype,
} from "../src/lib/share/relationship-share-copy";

const expectedRelationshipCounts = {
  crush: 39,
  flirting: 31,
  lover: 30,
  friend: 30,
  coworker: 30,
} as const;

const expectedToneCounts = {
  clean: 68,
  tease: 32,
  curiosity: 60,
} as const;

const forbiddenPhrases = [
  "전생에 나라를 구한",
  "환상의 콤비",
  "찰떡궁합",
  "실화냐",
  "팩폭",
  "소름",
  "대박",
  "상대방의 숨겨진 속마음",
  "운명의 상대",
  "악연",
];

assert.equal(PRODUCTION_RELATIONSHIP_SHARE_COPY.length, 160, "only 160 approved copies ship");

const ids = new Set(PRODUCTION_RELATIONSHIP_SHARE_COPY.map((entry) => entry.id));
assert.equal(ids.size, 160, "approved copy ids must be unique");

const normalizedCopies = new Set(
  PRODUCTION_RELATIONSHIP_SHARE_COPY.map((entry) => entry.copy.replace(/\s+/g, " ").trim()),
);
assert.equal(normalizedCopies.size, 160, "approved copy text must not be duplicated");

for (const [relationshipType, expected] of Object.entries(expectedRelationshipCounts)) {
  assert.equal(
    PRODUCTION_RELATIONSHIP_SHARE_COPY.filter((entry) => entry.relationshipType === relationshipType).length,
    expected,
    `${relationshipType} approved copy count`,
  );
}

for (const [tone, expected] of Object.entries(expectedToneCounts)) {
  assert.equal(
    PRODUCTION_RELATIONSHIP_SHARE_COPY.filter((entry) => entry.tone === tone).length,
    expected,
    `${tone} approved copy count`,
  );
}

for (const entry of PRODUCTION_RELATIONSHIP_SHARE_COPY) {
  assert.match(entry.id, /^(CR|FL|LO|FR|CO)-(ST|BA|TW|DI|EF|OP)-0[1-8]$/);
  for (const phrase of forbiddenPhrases) {
    assert.ok(!entry.copy.includes(phrase), `${entry.id} contains forbidden phrase: ${phrase}`);
  }

  if (entry.tone === "curiosity") {
    assert.ok(entry.copy.includes(CURIOSITY_MASK_TOKEN), `${entry.id} curiosity copy needs a mask`);
  } else {
    assert.ok(!entry.copy.includes(CURIOSITY_MASK_TOKEN), `${entry.id} non-curiosity copy cannot contain a mask`);
  }
}

for (const relationshipType of RELATIONSHIP_TYPES) {
  for (const pattern of SHARE_RELATIONSHIP_PATTERNS) {
    const cell = PRODUCTION_RELATIONSHIP_SHARE_COPY.filter(
      (entry) => entry.relationshipType === relationshipType && entry.pattern === pattern,
    );
    assert.ok(cell.length >= 5, `${relationshipType}/${pattern} needs at least five production copies`);

    for (const purpose of SHARE_COPY_PURPOSES) {
      assert.ok(
        cell.some((entry) => entry.purpose === purpose),
        `${relationshipType}/${pattern} must cover ${purpose}`,
      );

      for (const seed of [0, 1, 7, 42, 999]) {
        const first = selectRelationshipShareCopy({
          relationshipType,
          pattern,
          purpose,
          variantSeed: seed,
        });
        const second = selectRelationshipShareCopy({
          relationshipType,
          pattern,
          purpose,
          variantSeed: seed,
        });

        assert.deepEqual(first, second, "same inputs must return the same copy");
        assert.equal(first.relationshipType, relationshipType);
        assert.equal(first.pattern, pattern);
        assert.equal(first.purpose, purpose);
      }
    }
  }
}

assert.deepEqual(
  new Set(Object.values(SHARE_PATTERN_BY_ARCHETYPE)),
  new Set(SHARE_RELATIONSHIP_PATTERNS),
  "six existing archetypes must cover the six editorial share patterns exactly once",
);

const archetypeSelected = selectRelationshipShareCopyForArchetype({
  relationshipType: "lover",
  archetypeId: "growth",
  purpose: "relationship_label",
  variantSeed: 17,
});
assert.equal(archetypeSelected.pattern, "effort");

const explicitCuriosity = selectRelationshipShareCopy({
  relationshipType: "friend",
  pattern: "stable",
  purpose: "relationship_label",
  variantSeed: 9,
  tone: "curiosity",
});
assert.equal(explicitCuriosity.tone, "curiosity");

const masked = maskCuriosityAnswer(
  `이 관계의 핵심은 ${CURIOSITY_MASK_TOKEN}에 있어요.`,
  "연락의 규칙성",
);
assert.ok(!masked.includes("연락의 규칙성"));
assert.match(masked, /^이 관계의 핵심은 █{6,18}에 있어요\.$/);

assert.deepEqual([...SHARE_COPY_TONES], ["clean", "tease", "curiosity"]);

console.log("growth relationship share copy library contract: PASS");
