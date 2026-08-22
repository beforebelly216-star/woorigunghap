import { readFileSync, writeFileSync } from "node:fs";

const path = "src/app/one-to-one/result/result-v2.tsx";
let source = readFileSync(path, "utf8");

const importNeedle = 'import ReportChaptersB from "./report-v2-chapters-b";\n';
const importReplacement = `${importNeedle}import { CompatibilityShareCard } from "./compatibility-share-card";\nimport { buildCompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";\n`;
if (!source.includes(importNeedle)) throw new Error("result-v2 import anchor missing");
source = source.replace(importNeedle, importReplacement);

const labelNeedle = '  const coworkerHierarchyLabel = relationshipType === "coworker" && order.inputSnapshot.coworkerHierarchy\n    ? COWORKER_HIERARCHY_LABELS[order.inputSnapshot.coworkerHierarchy]\n    : null;\n';
const labelReplacement = `${labelNeedle}  const shareArchetype = buildCompatibilityShareArchetype(snapshot);\n`;
if (!source.includes(labelNeedle)) throw new Error("result-v2 relationship label anchor missing");
source = source.replace(labelNeedle, labelReplacement);

const renderNeedle = '    <section className="v2-score-section">\n      <div className="v2-section-title"><small>COMPATIBILITY SCORE</small><h2>핵심 궁합 지표</h2><p>점수는 해설의 근거 강도를 보여주는 참고값입니다. 본문에서 실제 관계에서 어떤 의미인지 자세히 설명합니다.</p></div>\n      <div className="v2-score-grid">{visibleDimensions.map(([dimension, value]) => <div key={dimension}><span>{DIMENSION_LABELS[dimension]}</span><strong>{Math.round(value.normalizedScore)}</strong><i><b style={{ width: `${Math.min(100, Math.max(0, value.normalizedScore))}%` }} /></i></div>)}</div>\n    </section>\n\n';
const renderReplacement = `${renderNeedle}    <CompatibilityShareCard\n      selfName={personA.displayName}\n      partnerName={personB.displayName}\n      relationshipLabel={relationshipLabel}\n      score={snapshot.score}\n      archetype={shareArchetype}\n    />\n\n`;
if (!source.includes(renderNeedle)) throw new Error("result-v2 score section anchor missing");
source = source.replace(renderNeedle, renderReplacement);

writeFileSync(path, source);
