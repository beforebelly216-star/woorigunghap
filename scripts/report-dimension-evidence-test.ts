import assert from "node:assert/strict";
import { buildDimensionEvidenceCopy } from "../src/lib/compatibility/dimension-evidence-copy";
import type { CompatibilityDimension } from "../src/lib/compatibility/types";

const samples: Array<[CompatibilityDimension, unknown]> = [
  ["dayMaster", { stemA: "갑", stemB: "병", relation: "GENERATES" }],
  ["dayBranch", { branchA: "자", branchB: "축", primaryRelation: "SIX_HARMONY" }],
  ["usefulGodFit", { aReceives: 74, bReceives: 81 }],
  ["elementComplementarity", { improvement: 0.2 }],
  ["heavenlyStemInteraction", { harmonies: ["a"], clashes: [] }],
  ["earthlyBranchInteraction", { interactions: [{ relation: "六合(육합)" }, { relation: "沖(충)" }] }],
  ["specialStars", { aReceivesNoblemanBranches: ["축"], bReceivesNoblemanBranches: [] }],
  ["spouseStarRealization", { aRoleSupply: 0.4, bRoleSupply: 0.5 }],
];

for (const [dimension, evidence] of samples) {
  const copy = buildDimensionEvidenceCopy(dimension, 77, evidence);
  const sentenceCount = copy.split(/[.!?](?:\s|$)/).filter(Boolean).length;
  assert.ok(sentenceCount <= 3, `${dimension} evidence must stay within three sentences`);
  assert.match(copy, /77점/);
}

const neutralDayBranchCopy = buildDimensionEvidenceCopy(
  "dayBranch",
  70,
  { branchA: "해", branchB: "자", primaryRelation: "NEUTRAL" },
);
assert.match(neutralDayBranchCopy, /중립 관계를/);
assert.doesNotMatch(neutralDayBranchCopy, /중립를/);

console.log("Per-dimension score evidence copy checks: PASS");
