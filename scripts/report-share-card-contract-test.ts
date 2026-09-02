import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { CompatibilityCalculationSnapshot } from "../src/lib/compatibility/engine";
import { buildCompatibilityShareArchetype } from "../src/lib/narrative/compatibility-share-card";

function snapshot(score: number, dimensions: Partial<Record<keyof CompatibilityCalculationSnapshot["dimensions"], number>>) {
  const keys = [
    "dayMaster", "dayBranch", "usefulGodFit", "elementComplementarity", "heavenlyStemInteraction",
    "earthlyBranchInteraction", "specialStars", "spouseStarRealization", "luckCycleAlignment",
  ] as const;
  return {
    score,
    dimensions: Object.fromEntries(keys.map((key) => [key, {
      normalizedScore: dimensions[key] ?? 60,
      maxPoints: 10,
      weightedPoints: 6,
    }])),
  } as unknown as CompatibilityCalculationSnapshot;
}

assert.equal(buildCompatibilityShareArchetype(snapshot(88, { dayMaster: 86, dayBranch: 84 })).id, "spark");
assert.equal(buildCompatibilityShareArchetype(snapshot(75, { usefulGodFit: 84, elementComplementarity: 82 })).id, "complement");
assert.equal(buildCompatibilityShareArchetype(snapshot(73, { heavenlyStemInteraction: 82, earthlyBranchInteraction: 80 })).id, "interlock");
assert.equal(buildCompatibilityShareArchetype(snapshot(72, { luckCycleAlignment: 84 })).id, "journey");
assert.equal(buildCompatibilityShareArchetype(snapshot(72, {})).id, "growth");
assert.equal(buildCompatibilityShareArchetype(snapshot(61, {})).id, "tuning");

const component = readFileSync("src/app/one-to-one/result/compatibility-share-card.tsx", "utf8");
const css = readFileSync("src/app/one-to-one/result/compatibility-share-card.module.css", "utf8");
const result = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const comparisonComponent = readFileSync("src/components/one-to-many-share-card.tsx", "utf8");
const comparisonCss = readFileSync("src/components/one-to-many-share-card.module.css", "utf8");
const comparisonResult = readFileSync("src/components/one-to-many-result.tsx", "utf8");

assert.match(component, /생년월일시와 유료 본문은 포함되지 않아요/);
assert.match(component, /includeDisplayNames: true/);
assert.doesNotMatch(component, /nameToggle|setIncludeNames|이름은 공유하지 않음/);
assert.match(component, /createPublicShareUrl/);
assert.match(component, /buildOneToOnePublicShare/);
assert.doesNotMatch(component, /const safeUrl = `\$\{window\.location\.origin\}\/`/);
assert.doesNotMatch(component, /window\.location\.href/);
assert.doesNotMatch(component, /accessToken/);
assert.match(component, /navigator\.share/);
assert.match(component, /selectRelationshipShareCopyForArchetype/);
assert.match(component, /SHARE_OPTION = \{ purpose: "recap"/);
assert.doesNotMatch(component, /typeTabs/);
assert.doesNotMatch(component, /setPurpose/);
assert.doesNotMatch(component, /purpose ===/);
assert.match(component, /친구에게 궁합 카드 보내기/);
assert.match(component, /canvas\.width = 1080/);
assert.match(component, /canvas\.height = 1920/);
assert.match(css, /aspect-ratio: 9 \/ 16/);
assert.match(css, /@media \(max-width: [^)]+\)/);
assert.match(result, /buildCompatibilityShareArchetype/);
assert.match(result, /<CompatibilityShareCard/);

assert.match(comparisonComponent, /selectRelationshipShareCopy/);
assert.match(comparisonComponent, /deriveOneToManySharePattern/);
assert.match(comparisonComponent, /maskCuriosityAnswer/);
assert.match(comparisonComponent, /createPublicShareUrl/);
assert.match(comparisonComponent, /buildOneToManyPublicShare/);
assert.match(comparisonComponent, /includeDisplayNames: true/);
assert.doesNotMatch(comparisonComponent, /nameToggle|setIncludeNames|이름은 공유하지 않음/);
assert.match(comparisonComponent, /relationship_label/);
assert.match(comparisonComponent, /two_sides/);
assert.match(comparisonComponent, /send_this/);
assert.match(comparisonComponent, /가장 편한 사람/);
assert.match(comparisonComponent, /말이 잘 통하는 사람/);
assert.match(comparisonComponent, /장기관계 리듬이 좋은 사람/);
assert.doesNotMatch(comparisonComponent, /const safeUrl = `\$\{window\.location\.origin\}\/`/);
assert.doesNotMatch(comparisonComponent, /window\.location\.href/);
assert.doesNotMatch(comparisonComponent, /accessToken/);
assert.doesNotMatch(comparisonComponent, /최악|꼴찌|손절/);
assert.match(comparisonComponent, /canvas\.width = 1080/);
assert.match(comparisonComponent, /canvas\.height = 1920/);
assert.match(comparisonCss, /aspect-ratio: 9 \/ 16/);
assert.match(comparisonCss, /@media \(max-width: [^)]+\)/);
assert.doesNotMatch(comparisonResult, /OneToManyShareCard/, "1:다 순위 전용 결과에는 공유 UI를 렌더하지 않습니다.");

console.log("paid 1:1 + Growth P3/P4 share card contract: PASS");
