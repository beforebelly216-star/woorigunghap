import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`missing replacement target: ${label}`);
  return source.replace(from, to);
}

{
  const path = "src/lib/narrative/name-personalization.ts";
  let source = readFileSync(path, "utf8");
  source = replaceRequired(source,
`  function personalizeText(source: string) {
    const hadNameToken = Object.values(NARRATIVE_NAME_TOKENS).some((token) => source.includes(token));`,
`  function personalizeText(source: string, preserveRolePronouns = false) {
    const hadNameToken = Object.values(NARRATIVE_NAME_TOKENS).some((token) => source.includes(token));`,
    "personalizeText signature");
  source = replaceRequired(source,
`    if (hadNameToken) return tokenized;
    return replaceRolePhrasesOutsideQuotes(tokenized, roleReplacements);`,
`    if (hadNameToken || preserveRolePronouns) return tokenized;
    return replaceRolePhrasesOutsideQuotes(tokenized, roleReplacements);`,
    "preserve role pronouns");
  source = replaceRequired(source,
`        Object.entries(node as Record<string, unknown>)
          .map(([key, child]) => [key, visit(child)]),`,
`        Object.entries(node as Record<string, unknown>)
          .map(([key, child]) => [key, key === "innerVoice" && typeof child === "string"
            ? personalizeText(child, true)
            : visit(child)]),`,
    "innerVoice object visitor");
  writeFileSync(path, source);
}

{
  const path = "scripts/report-persona-hero-contract-test.ts";
  let source = readFileSync(path, "utf8");
  source = replaceRequired(source,
`import { readFileSync } from "node:fs";`,
`import { readFileSync } from "node:fs";
import { personalizeNarrativeNames } from "../src/lib/narrative/name-personalization";`,
    "test import personalization");
  source = replaceRequired(source,
`assert.ok(css.includes("@media (max-width: 700px) { .partner-inner-mind-hero"));

console.log`,
`assert.ok(css.includes("@media (max-width: 700px) { .partner-inner-mind-hero"));

const personalizedHero = personalizeNarrativeNames({
  partnerInnerMindHero: {
    innerVoice: "나는 좋아도 내 속도를 지켜주면 더 가까워지고 싶어.",
  },
  ordinary: "나는 상대에게 먼저 말한다.",
}, { self: "민지", partner: "서준" });
assert.equal(personalizedHero.partnerInnerMindHero.innerVoice, "나는 좋아도 내 속도를 지켜주면 더 가까워지고 싶어.");
assert.notEqual(personalizedHero.ordinary, "나는 상대에게 먼저 말한다.");

console.log`,
    "innerVoice personalization regression");
  writeFileSync(path, source);
}

console.log("P4 innerVoice personalization fix applied");
