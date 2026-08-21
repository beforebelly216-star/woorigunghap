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

assert.match(component, /생년월일시와 유료 본문은 카드에 담지 않습니다/);
assert.match(component, /const safeUrl = `\$\{window\.location\.origin\}\/`/);
assert.doesNotMatch(component, /window\.location\.href/);
assert.doesNotMatch(component, /accessToken/);
assert.match(component, /navigator\.share/);
assert.match(css, /aspect-ratio: 9 \/ 16/);
assert.match(result, /buildCompatibilityShareArchetype/);
assert.match(result, /<CompatibilityShareCard/);

console.log("paid 1:1 compatibility type + share card contract: PASS");
