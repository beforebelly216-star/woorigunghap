import { readFileSync, writeFileSync } from "node:fs";

const path = "src/app/one-to-one/result/result-v2.tsx";
let source = readFileSync(path, "utf8");

const duplicatedImports = `import { CompatibilityShareCard } from "./compatibility-share-card";\nimport { buildCompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";\nimport { CompatibilityShareCard } from "./compatibility-share-card";\nimport { buildCompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";\n`;
const singleImports = `import { CompatibilityShareCard } from "./compatibility-share-card";\nimport { buildCompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";\n`;
source = source.replace(duplicatedImports, singleImports);

source = source.replace(
  `  const shareArchetype = buildCompatibilityShareArchetype(snapshot);\n  const shareArchetype = buildCompatibilityShareArchetype(snapshot);\n`,
  `  const shareArchetype = buildCompatibilityShareArchetype(snapshot);\n`,
);

const card = `    <CompatibilityShareCard\n      selfName={personA.displayName}\n      partnerName={personB.displayName}\n      relationshipLabel={relationshipLabel}\n      score={snapshot.score}\n      archetype={shareArchetype}\n    />\n\n`;
source = source.replace(card + card, card);

writeFileSync(path, source);
