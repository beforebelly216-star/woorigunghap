import { readFileSync, writeFileSync } from "node:fs";

function patch(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (before !== after) writeFileSync(path, after);
}

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Missing ${label}`);
  return source.replace(needle, replacement);
}

patch("src/lib/compatibility/one-to-many-view.ts", (source) => {
  source = source.replace('export const ONE_TO_MANY_VIEW_VERSION = "one-to-many-view-v1.0.0" as const;', 'export const ONE_TO_MANY_VIEW_VERSION = "one-to-many-view-v1.1.0" as const;');
  source = replaceOnce(
    source,
    '    score: number;\n    oneLine: string;\n',
    '    score: number;\n    insightTitle: string;\n    oneLine: string;\n',
    "candidate insight type",
  );
  source = replaceOnce(
    source,
    'function recommendationReason(basis: SituationalRecommendation["basis"]) {\n',
    'function candidateInsightTitle(candidate: OneToManyCalculationSnapshot["candidates"][number]) {\n  const labels = candidate.calculationSnapshot.strengths.slice(0, 2).map((dimension) => DIMENSION_LABELS[dimension]);\n  if (labels.length >= 2) return `${labels[0]} · ${labels[1]}이 돋보이는 관계`;\n  if (labels.length === 1) return `${labels[0]}이 돋보이는 관계`;\n  return "관계의 강점과 조율점을 함께 보는 관계";\n}\n\nfunction semanticDimensionLabel(\n  dimensions: CompatibilityDimension[],\n  index: number,\n  fallback: string,\n) {\n  const dimension = dimensions[index] ?? dimensions[0];\n  return dimension ? DIMENSION_LABELS[dimension] : fallback;\n}\n\nfunction recommendationReason(basis: SituationalRecommendation["basis"]) {\n',
    "semantic title helpers",
  );
  source = replaceOnce(
    source,
    '        score: candidate.score,\n        oneLine: generated?.oneLine ??',
    '        score: candidate.score,\n        insightTitle: candidateInsightTitle(candidate),\n        oneLine: generated?.oneLine ??',
    "insight title assignment",
  );
  source = replaceOnce(
    source,
    '        strengths: generated ? generated.strengths.map((copy, index) => ({\n          label: `강점 ${index + 1}`,\n          copy,\n        })) : strengths.map((dimension) => ({',
    '        strengths: generated ? generated.strengths.map((copy, index) => ({\n          label: semanticDimensionLabel(strengths, index, "관계 강점"),\n          copy,\n        })) : strengths.map((dimension) => ({',
    "semantic strength labels",
  );
  source = replaceOnce(
    source,
    '        cautions: generated ? generated.cautions.map((copy, index) => ({\n          label: `조율 ${index + 1}`,\n          copy,\n        })) : cautions.map((dimension) => ({',
    '        cautions: generated ? generated.cautions.map((copy, index) => ({\n          label: semanticDimensionLabel(cautions, index, "관계 조율"),\n          copy,\n        })) : cautions.map((dimension) => ({',
    "semantic caution labels",
  );
  return source;
});

patch("src/components/one-to-many-result.tsx", (source) => {
  source = replaceOnce(
    source,
    '                  <span><b>{candidate.rank}위</b> {candidate.displayName}</span>\n',
    '                  <span><b>{candidate.displayName}</b> · {candidate.insightTitle}</span>\n',
    "candidate summary title",
  );
  source = source.replace('key={strength.label}', 'key={`${strength.label}-${strength.copy}`}');
  source = source.replace('key={caution.label}', 'key={`${caution.label}-${caution.copy}`}');
  return source;
});

patch("src/lib/narrative/one-to-many-report-engine.ts", (source) => {
  source = source.replaceAll('one-to-many-report-v1-editorial', 'one-to-many-report-v2-semantic-titles');
  source = replaceOnce(
    source,
    '  "후보 ID(candidate_1 등)는 화면에서 각 사용자의 별칭으로 교체된다. 후보 ID 자체를 사용자 문장에 노출하지 말고 \'각 대상\'처럼 자연스럽게 쓰세요.",\n',
    '  "후보 ID(candidate_1 등)는 화면에서 각 사용자의 별칭으로 교체된다. 후보 ID 자체를 사용자 문장에 노출하지 말고, 각 후보 카드 안에서는 이름이나 순번 대신 \'이 관계\'처럼 자연스럽게 쓰세요.",\n  "후보별 설명에서 \'첫 번째/두 번째/세 번째 후보\', \'강점 1/2/3\', \'조율 1/2/3\'처럼 위치나 번호로 내용을 부르지 마세요. 화면이 후보 이름과 계산된 의미형 제목을 붙이므로 본문은 의미 자체를 바로 설명하세요.",\n',
    "ordinal naming rule",
  );
  return source;
});

patch("scripts/day15-one-to-many-result-ui-test.ts", (source) => {
  if (source.includes("semanticNarrative")) return source;
  source = replaceOnce(
    source,
    'const evidence = buildOneToManyNarrativeEvidence(snapshot);\n',
    'const evidence = buildOneToManyNarrativeEvidence(snapshot);\nconst semanticNarrative = {\n  rankingSummary: { headline: "비교 결론", summary: "비교 요약", closenessNotice: "차이 안내" },\n  candidates: snapshot.candidates.map((candidate) => ({\n    candidateId: candidate.candidateId,\n    oneLine: "이 관계의 핵심을 한 줄로 봅니다.",\n    strengths: ["강점 설명 A", "강점 설명 B"],\n    cautions: ["조율 설명 A"],\n    practicalTip: "확인할 행동을 하나 정해 보세요.",\n  })),\n  situationalRecommendations: Object.fromEntries(recommendations.map((item) => [item.id, { candidateIds: item.candidateIds, reason: "상황별 이유를 설명합니다." }])) as ReturnType<typeof buildOneToManyResultView> extends never ? never : any,\n  finalSummary: "비교 결과를 실제 관계 대화에 활용하세요.",\n};\nconst semanticView = buildOneToManyResultView(snapshot, ONE_TO_MANY_DEMO_NAMES, semanticNarrative);\n',
    "semantic narrative fixture",
  );
  source = replaceOnce(
    source,
    'assert.equal(view.recommendations.some((recommendation) => recommendation.shared), true);\n',
    'assert.equal(view.recommendations.some((recommendation) => recommendation.shared), true);\nfor (const candidate of semanticView.candidateInsights) {\n  assert.ok(candidate.insightTitle.includes("관계"));\n  assert.ok(!/^(강점|조율) \\d+$/.test(candidate.insightTitle));\n  assert.ok(candidate.strengths.every((item) => !/^강점 \\d+$/.test(item.label)));\n  assert.ok(candidate.cautions.every((item) => !/^조율 \\d+$/.test(item.label)));\n}\n',
    "semantic label assertions",
  );
  source = replaceOnce(
    source,
    'assert.match(resultSource, /<table/);\n',
    'assert.match(resultSource, /<table/);\nassert.match(resultSource, /candidate\.insightTitle/);\nassert.doesNotMatch(resultSource, /candidate\.rank}위<\\/b>/);\n',
    "semantic UI source assertions",
  );
  return source;
});

patch("docs/PROJECT_STATE.md", (source) => {
  if (source.includes("## 2026-08-22 1:N 의미형 제목 개선")) return source;
  const marker = "\n## 출시 blocker 정의\n";
  const block = `\n## 2026-08-22 1:N 의미형 제목 개선\n\n- 후보별 상세 카드의 \`강점 1/2\`, \`조율 1/2\` 같은 순번형 라벨을 제거하고, 실제 계산 snapshot의 강점·조율 차원명으로 표시한다.\n- 후보 상세 머리말은 \`1위 + 이름\` 대신 **후보 이름 + 핵심 강점 기반 의미형 제목**을 사용한다. 전체 순위 섹션의 \`1위/2위\` 표시는 비교 상품의 핵심 기능이므로 유지한다.\n- 기존 저장 AI 리포트의 \`strengths: string[]\`, \`cautions: string[]\` 구조는 바꾸지 않아 재열람 호환성을 유지한다.\n- 1:N AI 프롬프트는 \`one-to-many-report-v2-semantic-titles\`로 올리고, 후보 본문에서 첫 번째/두 번째 후보 또는 강점 1/2 같은 순번형 명명을 금지한다.\n`;
  if (!source.includes(marker)) throw new Error("PROJECT_STATE marker missing");
  return source.replace(marker, `${block}${marker}`);
});

patch("docs/NEXT_TASK.md", (source) => {
  source = source.replace('  - [ ] 후속: 1:N 순번형 설명을 후보 이름/의미형 제목으로 변경.', '  - [x] 후속: 1:N 순번형 설명을 후보 이름/의미형 제목으로 변경. 후보 상세은 이름 + 계산 강점 기반 제목, 강점/조율 라벨은 실제 차원명 사용.');
  const start = source.indexOf("## Current HANDOFF");
  if (start < 0) throw new Error("HANDOFF missing");
  return source.slice(0, start) + `## Current HANDOFF\n\n\`\`\`text\nHANDOFF\n- Worker: GPT\n- Task: 1:N 순번형 설명 → 후보 이름/의미형 제목 개선\n- Status: complete\n- Validation: day15 1:N narrative/result UI contracts + Core validation + lint + production build\n- Commit: clean PR 검증 후 main squash merge SHA 기준\n- Remaining: 1:N 추상 표현을 연락·갈등·신뢰·생활·장기관계 중심의 직관적 언어로 개선; 외부 SOLAPI/Kakao 설정은 운영 작업으로 유지\n- Risk: 전체 순위의 1위/2위 표시는 핵심 비교 기능이라 유지; 기존 저장 narrative 배열 schema는 변경하지 않음\n\`\`\`\n`;
});

patch("docs/DECISIONS.md", (source) => {
  const duplicated = '- **60일주 캐릭터**는 계산된 일주를 사용자가 쉽게 이해하도록 번역하는 보조 편집 레이어다. 60갑자를 모두 커버하되 캐릭터 문구가 전체 궁합 점수, 합충, 용신, 미래 시기, 상대의 숨은 심리를 새로 결정하거나 기존 계산을 덮어쓰지 않는다. AI는 CH0~CH2의 쉬운 설명에 제한적으로 활용한다.\n- **60일주 캐릭터**는 계산된 일주를 사용자가 쉽게 이해하도록 번역하는 보조 편집 레이어다. 60갑자를 모두 커버하되 캐릭터 문구가 전체 궁합 점수, 합충, 용신, 미래 시기, 상대의 숨은 심리를 새로 결정하거나 기존 계산을 덮어쓰지 않는다. AI는 CH0~CH2의 쉬운 설명에 제한적으로 활용한다.\n';
  if (source.includes(duplicated)) source = source.replace(duplicated, duplicated.split("\n")[0] + "\n");
  return source;
});
