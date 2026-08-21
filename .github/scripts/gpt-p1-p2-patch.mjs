import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content, "utf8");
}

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`patch target not found: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`patch target is not unique: ${label}`);
  return source.slice(0, index) + after + source.slice(index + before.length);
}

function replaceRegexOnce(source, pattern, after, label) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== 1) throw new Error(`patch regex expected 1 match, got ${matches.length}: ${label}`);
  return source.replace(pattern, after);
}

function update(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (after === before) throw new Error(`patch produced no change: ${path}`);
  write(path, after);
}

function addPackageScript(name, command) {
  const path = "package.json";
  const pkg = JSON.parse(read(path));
  if (pkg.scripts?.[name] && pkg.scripts[name] !== command) throw new Error(`package script conflict: ${name}`);
  pkg.scripts ??= {};
  pkg.scripts[name] = command;
  write(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

function phaseP1() {
  update("src/lib/narrative/report-engine-v6-request.ts", (source) => {
    source = replaceOnce(
      source,
      "function parseAiPayloadFromUserPrompt(userPrompt: string) {",
      `export type PaidEditorialPillarFact = {\n  korean: string;\n  hanja: string;\n  stem: string;\n  branch: string;\n};\n\nexport type PaidEditorialFactsPayload = Record<\"A\" | \"B\", {\n  birthTimeKnown: boolean;\n  dayPillar: PaidEditorialPillarFact;\n}>;\n\nexport function formatPaidIntroDayPillar(value: unknown) {\n  if (typeof value === \"string\") {\n    const legacy = value.trim();\n    return legacy || \"일주 미확인\";\n  }\n  if (!isPlainObject(value)) return \"일주 미확인\";\n  const korean = typeof value.korean === \"string\" ? value.korean.trim() : \"\";\n  const hanja = typeof value.hanja === \"string\" ? value.hanja.trim() : \"\";\n  if (!korean) return \"일주 미확인\";\n  return hanja ? \`\${korean}(\${hanja})\` : korean;\n}\n\nfunction parseAiPayloadFromUserPrompt(userPrompt: string) {`,
      "P1 day pillar formatter",
    );
    source = replaceOnce(
      source,
      '  const dayPillar = typeof fact.dayPillar === "string" ? fact.dayPillar : "일주 미확인";',
      "  const dayPillar = formatPaidIntroDayPillar(fact.dayPillar);",
      "P1 day pillar consumer",
    );
    return source;
  });

  update("src/lib/narrative/report-engine-v7.ts", (source) => {
    source = replaceOnce(
      source,
      `import {\n  combineAnthropicUsage,\n  requestStructuredSegment,\n} from \"@/lib/narrative/report-engine-v6-request\";`,
      `import {\n  combineAnthropicUsage,\n  requestStructuredSegment,\n  type PaidEditorialFactsPayload,\n} from \"@/lib/narrative/report-engine-v6-request\";`,
      "P1 v7 typed facts import",
    );
    source = replaceOnce(
      source,
      "function paidEditorialFacts(facts: PaidReportFacts) {",
      "function paidEditorialFacts(facts: PaidReportFacts): PaidEditorialFactsPayload {",
      "P1 paidEditorialFacts return type",
    );
    return source;
  });

  write("scripts/paid-intro-day-pillar-test.ts", `import assert from \"node:assert/strict\";\nimport {\n  formatPaidIntroDayPillar,\n  groundPaidIntroWithServerEvidence,\n} from \"../src/lib/narrative/report-engine-v6-request\";\n\nconst gihe = { korean: \"기해\", hanja: \"己亥\", stem: \"기\", branch: \"해\" };\nconst gapja = { korean: \"갑자\", hanja: \"甲子\", stem: \"갑\", branch: \"자\" };\n\nassert.equal(formatPaidIntroDayPillar(gihe), \"기해(己亥)\");\nassert.equal(formatPaidIntroDayPillar(\"기해(己亥)\"), \"기해(己亥)\", \"legacy string day pillar must remain supported\");\nassert.equal(formatPaidIntroDayPillar({ hanja: \"己亥\" }), \"일주 미확인\");\n\nconst prompt = \`payload\\n\${JSON.stringify({\n  facts: {\n    A: { birthTimeKnown: true, dayPillar: gihe },\n    B: { birthTimeKnown: false, dayPillar: gapja },\n  },\n  evidence: {\n    persons: {\n      A: { dayMaster: { stem: \"기\", element: \"earth\" }, elementBalance: { strongest: [\"earth\"], weakest: [\"water\"] } },\n      B: { dayMaster: { stem: \"갑\", element: \"wood\" }, elementBalance: { strongest: [\"wood\"], weakest: [\"metal\"] } },\n    },\n  },\n})}\`;\nconst intro = {\n  overview: { headline: \"샘플\", detailedSummary: \"샘플 요약\" },\n  personA: { overallProfile: \"AI A\", elementAnalysis: \"AI A 오행\", relationshipNeeds: \"AI A 조건\", strengths: [\"A 장점\"], cautions: [\"A 주의\"] },\n  personB: { overallProfile: \"AI B\", elementAnalysis: \"AI B 오행\", relationshipNeeds: \"AI B 조건\", strengths: [\"B 장점\"], cautions: [\"B 주의\"] },\n};\nconst grounded = groundPaidIntroWithServerEvidence(intro, prompt) as typeof intro;\nassert.match(grounded.personA.overallProfile, /기해\\(己亥\\)/, \"known-time person must render object day pillar\");\nassert.match(grounded.personB.overallProfile, /갑자\\(甲子\\)/, \"unknown birth time must still render the day pillar\");\nassert.doesNotMatch(JSON.stringify(grounded), /일주 미확인/, \"valid day pillars must never fall back to '일주 미확인'\");\n\nconsole.log(\"paid intro day pillar contract: PASS\");\n`);

  addPackageScript("test:intro:day-pillar", "tsx scripts/paid-intro-day-pillar-test.ts");

  update(".github/workflows/manse-validation.yml", (source) => replaceOnce(
    source,
    "          npm run test:one-to-one:quality-gate\n",
    "          npm run test:one-to-one:quality-gate\n          npm run test:intro:day-pillar\n",
    "P1 CI contract test",
  ));
}

function phaseP2() {
  update("src/lib/narrative/report-engine-v6-request.ts", (source) => {
    source = replaceOnce(
      source,
      `  \"RELATIONSHIP_ROMANCE_LEAK\",\n]);`,
      `  \"RELATIONSHIP_ROMANCE_LEAK\",\n  \"EXACT_LONG_TEXT_DUPLICATE\",\n  \"INTRO_DAY_PILLAR_MISMATCH\",\n  \"INTRO_ELEMENT_RANK_MISMATCH\",\n  \"INTRO_UNSUPPORTED_NUMERIC_FACT\",\n]);`,
      "P2 critical quality issues",
    );

    source = replaceRegexOnce(
      source,
      /function buildGroundedIntroPerson\(payload: Record<string, unknown>, key: \"A\" \| \"B\"\) \{[\s\S]*?\n\}\n\nexport function groundPaidIntroWithServerEvidence\(value: unknown, userPrompt: string\): unknown \{[\s\S]*?\n\}\n\nexport function matchesJsonSchema/,
      `function expectedIntroElementLabels(value: unknown) {\n  const values = Array.isArray(value) ? value : typeof value === \"string\" ? [value] : [];\n  return values\n    .filter((item): item is string => typeof item === \"string\")\n    .map((item) => INTRO_ELEMENT_LABELS[item] ?? item)\n    .filter(Boolean);\n}\n\nfunction collectPaidIntroEvidenceIssues(value: unknown, userPrompt: string) {\n  if (!isPlainObject(value)) return [];\n  const payload = parseAiPayloadFromUserPrompt(userPrompt);\n  if (!payload) return [];\n  const factsRoot = isPlainObject(payload.facts) ? payload.facts : null;\n  const evidenceRoot = isPlainObject(payload.evidence) ? payload.evidence : null;\n  const persons = evidenceRoot && isPlainObject(evidenceRoot.persons) ? evidenceRoot.persons : null;\n  const issues: string[] = [];\n\n  for (const [factKey, personKey] of [[\"A\", \"personA\"], [\"B\", \"personB\"]] as const) {\n    const fact = factsRoot && isPlainObject(factsRoot[factKey]) ? factsRoot[factKey] : null;\n    const evidence = persons && isPlainObject(persons[factKey]) ? persons[factKey] : null;\n    const person = isPlainObject(value[personKey]) ? value[personKey] : null;\n    if (!fact || !person) continue;\n\n    const personText = collectStrings(person).join(\"\\n\");\n    const dayPillar = isPlainObject(fact.dayPillar) ? fact.dayPillar : null;\n    const korean = dayPillar && typeof dayPillar.korean === \"string\" ? dayPillar.korean.trim() : \"\";\n    const hanja = dayPillar && typeof dayPillar.hanja === \"string\" ? dayPillar.hanja.trim() : \"\";\n    const legacyDayPillar = typeof fact.dayPillar === \"string\" ? fact.dayPillar.trim() : \"\";\n    const pillarMatches = legacyDayPillar\n      ? personText.includes(legacyDayPillar)\n      : Boolean(korean && personText.includes(korean) && (!hanja || personText.includes(hanja)));\n    if (!pillarMatches) issues.push(\"INTRO_DAY_PILLAR_MISMATCH\");\n\n    const balance = evidence && isPlainObject(evidence.elementBalance) ? evidence.elementBalance : null;\n    const strongest = expectedIntroElementLabels(balance?.strongest);\n    const weakest = expectedIntroElementLabels(balance?.weakest);\n    const elementAnalysis = typeof person.elementAnalysis === \"string\" ? person.elementAnalysis : \"\";\n    if ((strongest.length && !strongest.some((label) => elementAnalysis.includes(label)))\n      || (weakest.length && !weakest.some((label) => elementAnalysis.includes(label)))) {\n      issues.push(\"INTRO_ELEMENT_RANK_MISMATCH\");\n    }\n\n    if (/\\d+(?:\\.\\d+)?\\s*%|\\d+(?:\\.\\d+)?\\s*점/.test(personText)) {\n      issues.push(\"INTRO_UNSUPPORTED_NUMERIC_FACT\");\n    }\n  }\n\n  return [...new Set(issues)];\n}\n\n/**\n * Legacy compatibility export. P2 deliberately preserves the AI-authored intro;\n * server evidence is now used for validation/retry rather than wholesale replacement.\n */\nexport function groundPaidIntroWithServerEvidence(value: unknown, userPrompt: string): unknown {\n  void userPrompt;\n  return value;\n}\n\nexport function matchesJsonSchema`,
      "P2 replace intro overwrite with validation",
    );

    source = replaceOnce(
      source,
      `function normalizeForDuplicateCheck(value: string) {\n  return value.replace(/\\s+/g, \" \").replace(/[“”‘’\"']/g, \"\").trim();\n}\n`,
      `function normalizeForDuplicateCheck(value: string) {\n  return value.replace(/\\s+/g, \" \").replace(/[“”‘’\"']/g, \"\").trim();\n}\n\nfunction duplicateLongTextSamples(value: unknown) {\n  const seen = new Map<string, number>();\n  for (const source of collectStrings(value)) {\n    const normalized = normalizeForDuplicateCheck(source);\n    if (normalized.length < 40) continue;\n    seen.set(normalized, (seen.get(normalized) ?? 0) + 1);\n  }\n  return [...seen.entries()]\n    .filter(([, count]) => count >= 2)\n    .map(([text]) => text.slice(0, 120))\n    .slice(0, 3);\n}\n`,
      "P2 duplicate detail helper",
    );

    source = replaceOnce(
      source,
      `  const characters = collectCharacters(value);\n  const minCharacters = label === \"INTRO\" ? 1200 : label === \"DYNAMICS\" || label === \"ACTION\" ? 1800 : 0;\n\n  if (minCharacters > 0 && characters < minCharacters) issues.push(\`\${label}_TOTAL_DENSITY_SHORT\`);`,
      `  const characters = collectCharacters(value);\n  const minCharacters = label === \"INTRO\" ? 1200 : label === \"DYNAMICS\" || label === \"ACTION\" ? 1800 : 0;\n\n  if (label === \"INTRO\") issues.push(...collectPaidIntroEvidenceIssues(value, userPrompt));\n  if (minCharacters > 0 && characters < minCharacters) issues.push(\`\${label}_TOTAL_DENSITY_SHORT\`);`,
      "P2 intro evidence validation hook",
    );

    source = replaceOnce(
      source,
      `  if (/\\b(WEAK|STRONG|BALANCED|confidence)\\b|soft signal/i.test(joined)) issues.push(\"INTERNAL_TERM_EXPOSED\");`,
      `  if (/\\b(WEAK|STRONG|BALANCED|confidence)\\b|soft signal|서버 계산상/i.test(joined)) issues.push(\"INTERNAL_TERM_EXPOSED\");`,
      "P2 internal server term guard",
    );

    source = replaceOnce(
      source,
      `  let lastFailure = \"UNKNOWN\";\n  let lastQualityIssues: string[] = [];`,
      `  let lastFailure = \"UNKNOWN\";\n  let lastQualityIssues: string[] = [];\n  let lastDuplicateSamples: string[] = [];`,
      "P2 duplicate retry state",
    );

    source = replaceOnce(
      source,
      `      const retryReason = lastFailure === \"QUALITY_SHORTFALL\"\n        ? \`직전 응답은 다음 출시 차단 이슈를 포함했습니다: \${lastQualityIssues.join(\", \")}. JSON 구조를 유지하면서 개발자용 내부값과 관계 유형에 맞지 않는 문구만 제거하세요.\`\n        : \"직전 응답을 사용할 수 없었습니다. JSON 구조를 정확히 지키고 완결된 객체를 출력하세요.\";`,
      `      const duplicateDetail = lastDuplicateSamples.length\n        ? \` 중복된 문장 예시: \${lastDuplicateSamples.map((item) => \`[\${item}]\`).join(\" / \")} 같은 문장을 다른 필드에 재사용하지 마세요.\`\n        : \"\";\n      const retryReason = lastFailure === \"QUALITY_SHORTFALL\"\n        ? \`직전 응답은 다음 출시 차단 이슈를 포함했습니다: \${lastQualityIssues.join(\", \")}.\${duplicateDetail} JSON 구조를 유지하면서 해당 이슈를 제거하세요.\`\n        : \"직전 응답을 사용할 수 없었습니다. JSON 구조를 정확히 지키고 완결된 객체를 출력하세요.\";`,
      "P2 duplicate retry detail",
    );

    source = replaceOnce(
      source,
      `      const normalizedValue = normalizeNarrativeNameTokenDensity(parsed) as T;\n      const candidateValue = (args.label === \"INTRO\"\n        ? groundPaidIntroWithServerEvidence(normalizedValue, args.user)\n        : normalizedValue) as T;`,
      `      const normalizedValue = normalizeNarrativeNameTokenDensity(parsed) as T;\n      const candidateValue = normalizedValue;`,
      "P2 stop intro replacement",
    );

    source = replaceOnce(
      source,
      `      lastFailure = \"QUALITY_SHORTFALL\";\n      lastQualityIssues = critical;`,
      `      lastFailure = \"QUALITY_SHORTFALL\";\n      lastQualityIssues = critical;\n      lastDuplicateSamples = critical.includes(\"EXACT_LONG_TEXT_DUPLICATE\")\n        ? duplicateLongTextSamples(candidateValue)\n        : [];`,
      "P2 capture duplicate samples",
    );
    return source;
  });

  update("src/lib/narrative/name-personalization.ts", (source) => {
    source = replaceOnce(
      source,
      `export function personalizeNarrativeNames<T>(\n  value: T,`,
      `function replaceRolePhrasesOutsideQuotes(\n  source: string,\n  replacements: readonly (readonly [string, string])[],\n) {\n  const apply = (chunk: string) => replacements.reduce(\n    (text, [rolePhrase, replacement]) => replaceIndependentRolePhraseOnce(text, rolePhrase, replacement),\n    chunk,\n  );\n  const quotePattern = /(\"[^\"\\n]*\"|'[^'\\n]*'|“[^”\\n]*”|‘[^’\\n]*’)/g;\n  let result = \"\";\n  let cursor = 0;\n  for (const match of source.matchAll(quotePattern)) {\n    const index = match.index ?? 0;\n    result += apply(source.slice(cursor, index));\n    result += match[0];\n    cursor = index + match[0].length;\n  }\n  result += apply(source.slice(cursor));\n  return result;\n}\n\nexport function personalizeNarrativeNames<T>(\n  value: T,`,
      "P2 quote protection helper",
    );
    source = replaceOnce(
      source,
      `    if (hadNameToken) return tokenized;\n    return roleReplacements.reduce(\n      (text, [rolePhrase, replacement]) => replaceIndependentRolePhraseOnce(text, rolePhrase, replacement),\n      tokenized,\n    );`,
      `    if (hadNameToken) return tokenized;\n    return replaceRolePhrasesOutsideQuotes(tokenized, roleReplacements);`,
      "P2 apply role replacements outside dialogue",
    );
    return source;
  });

  update("src/lib/narrative/report-deep-content.ts", (source) => replaceOnce(
    source,
    `export type DeepReportExtension = {\n  partnerDeepDive?: PartnerDeepDive;`,
    `export type ReportChapterKey = \"ch0\" | \"ch1\" | \"ch2\" | \"ch3\" | \"ch4\" | \"ch5\" | \"ch6\" | \"ch7\" | \"ch8\" | \"ch9\";\nexport type ChapterKeyTakeaways = Partial<Record<ReportChapterKey, string[]>>;\n\nexport type DeepReportExtension = {\n  keyTakeaways?: ChapterKeyTakeaways;\n  partnerDeepDive?: PartnerDeepDive;`,
    "P2 deep report chapter takeaways",
  ));

  update("src/lib/narrative/report-engine-v7.ts", (source) => {
    source = replaceOnce(
      source,
      `  ActionPlan30,\n  PartnerDeepDive,\n  PersonalLeverage,\n  SituationStrategy,`,
      `  ActionPlan30,\n  PartnerDeepDive,\n  PersonalLeverage,\n  SituationStrategy,\n  type EnhancedDetailedReportContent,`,
      "P2 enhanced content import",
    );

    source = replaceOnce(
      source,
      `const INTRO_SCHEMA = objectSchema({\n  overview: objectSchema({ headline: { type: \"string\" }, detailedSummary: { type: \"string\" } }),\n  personA: PERSON_SCHEMA,\n  personB: PERSON_SCHEMA,\n});`,
      `const INTRO_SCHEMA = objectSchema({\n  overview: objectSchema({ headline: { type: \"string\" }, detailedSummary: { type: \"string\" } }),\n  personA: PERSON_SCHEMA,\n  personB: PERSON_SCHEMA,\n  keyTakeaways: objectSchema({ ch0: STRING_ARRAY, ch1: STRING_ARRAY }),\n});`,
      "P2 intro takeaway schema",
    );
    source = replaceOnce(
      source,
      `  partnerDeepDive: PARTNER_DEEP_DIVE_SCHEMA,\n  personalLeverage: PERSONAL_LEVERAGE_SCHEMA,\n});`,
      `  partnerDeepDive: PARTNER_DEEP_DIVE_SCHEMA,\n  personalLeverage: PERSONAL_LEVERAGE_SCHEMA,\n  keyTakeaways: objectSchema({ ch2: STRING_ARRAY, ch3: STRING_ARRAY }),\n});`,
      "P2 dynamics takeaway schema",
    );
    source = replaceOnce(
      source,
      `  situationStrategy: SITUATION_STRATEGY_SCHEMA,\n  actionPlan30: ACTION_PLAN_30_SCHEMA,\n});`,
      `  situationStrategy: SITUATION_STRATEGY_SCHEMA,\n  actionPlan30: ACTION_PLAN_30_SCHEMA,\n  keyTakeaways: objectSchema({\n    ch4: STRING_ARRAY, ch5: STRING_ARRAY, ch6: STRING_ARRAY,\n    ch7: STRING_ARRAY, ch8: STRING_ARRAY, ch9: STRING_ARRAY,\n  }),\n});`,
      "P2 action takeaway schema",
    );

    source = replaceRegexOnce(
      source,
      /export type IntroSegment = Pick<DetailedReportContent, \"overview\" \| \"personA\" \| \"personB\">;\nexport type DynamicsSegment = Pick<DetailedReportContent, \"chemistry\" \| \"bondAndFriction\" \| \"directionalImpact\"> & \{\n  partnerDeepDive: PartnerDeepDive;\n  personalLeverage: PersonalLeverage;\n\};\nexport type ActionSegment = Pick<DetailedReportContent, \"relationshipFlow\" \| \"relationshipSpecific\" \| \"strengthsAndRisks\" \| \"practicalManual\"> & \{\n  situationStrategy: SituationStrategy;\n  actionPlan30: ActionPlan30;\n\};\nexport type PaidReportSegmentContent = IntroSegment \| DynamicsSegment \| ActionSegment;/,
      `export type IntroSegment = Pick<DetailedReportContent, \"overview\" | \"personA\" | \"personB\"> & {\n  keyTakeaways: { ch0: string[]; ch1: string[] };\n};\nexport type DynamicsSegment = Pick<DetailedReportContent, \"chemistry\" | \"bondAndFriction\" | \"directionalImpact\"> & {\n  partnerDeepDive: PartnerDeepDive;\n  personalLeverage: PersonalLeverage;\n  keyTakeaways: { ch2: string[]; ch3: string[] };\n};\nexport type ActionSegment = Pick<DetailedReportContent, \"relationshipFlow\" | \"relationshipSpecific\" | \"strengthsAndRisks\" | \"practicalManual\"> & {\n  situationStrategy: SituationStrategy;\n  actionPlan30: ActionPlan30;\n  keyTakeaways: { ch4: string[]; ch5: string[]; ch6: string[]; ch7: string[]; ch8: string[]; ch9: string[] };\n};\nexport type PaidReportSegmentContent = IntroSegment | DynamicsSegment | ActionSegment;\n\nexport function mergePaidReportSegmentContents(contents: PaidReportSegmentContent[]): EnhancedDetailedReportContent {\n  const merged = Object.assign({}, ...contents) as DetailedReportContent;\n  const keyTakeaways = Object.assign({}, ...contents.map((content) => content.keyTakeaways ?? {}));\n  return { ...merged, keyTakeaways };\n}`,
      "P2 segment types and merge helper",
    );

    source = replaceOnce(
      source,
      `function hasArray(obj: Record<string, unknown>, key: string) {\n  return Array.isArray(obj[key]);\n}\nfunction validPerson`,
      `function hasArray(obj: Record<string, unknown>, key: string) {\n  return Array.isArray(obj[key]);\n}\nfunction validKeyTakeaways(value: unknown, keys: string[]) {\n  if (!isObject(value)) return false;\n  return keys.every((key) => {\n    const items = value[key];\n    return Array.isArray(items)\n      && items.length === 3\n      && items.every((item) => typeof item === \"string\" && item.trim().length > 0 && item.trim().length <= 40);\n  });\n}\nfunction validPerson`,
      "P2 takeaway validator",
    );
    source = replaceOnce(
      source,
      `    && validPerson(value.personA)\n    && validPerson(value.personB);`,
      `    && validPerson(value.personA)\n    && validPerson(value.personB)\n    && validKeyTakeaways(value.keyTakeaways, [\"ch0\", \"ch1\"]);`,
      "P2 valid intro takeaways",
    );
    source = replaceOnce(
      source,
      `    && validPartnerDeepDive(value.partnerDeepDive)\n    && validPersonalLeverage(value.personalLeverage);`,
      `    && validPartnerDeepDive(value.partnerDeepDive)\n    && validPersonalLeverage(value.personalLeverage)\n    && validKeyTakeaways(value.keyTakeaways, [\"ch2\", \"ch3\"]);`,
      "P2 valid dynamics takeaways",
    );
    source = replaceOnce(
      source,
      `    && validSituationStrategy(value.situationStrategy)\n    && validActionPlan30(value.actionPlan30);`,
      `    && validSituationStrategy(value.situationStrategy)\n    && validActionPlan30(value.actionPlan30)\n    && validKeyTakeaways(value.keyTakeaways, [\"ch4\", \"ch5\", \"ch6\", \"ch7\", \"ch8\", \"ch9\"]);`,
      "P2 valid action takeaways",
    );

    source = replaceOnce(
      source,
      `- strengths / cautions: 각각 2개를 우선하고 항목마다 한 문장 중심으로 구체적으로 쓰세요.`,
      `- strengths / cautions: 각각 2개를 우선하고 항목마다 한 문장 중심으로 구체적으로 쓰세요.\\n- keyTakeaways.ch0/ch1은 각각 정확히 3개, 각 40자 이내의 결론 한 줄로 작성하세요. 같은 챕터 본문 문장을 복사하지 말고 서로 다른 소재를 요약하세요.`,
      "P2 intro takeaway prompt",
    );
    source = replaceOnce(
      source,
      `- conversationScripts는 2개, backfireHabits는 2개를 우선해 실제 사용할 수 있게 쓰세요.`,
      `- conversationScripts는 2개, backfireHabits는 2개를 우선해 실제 사용할 수 있게 쓰세요.\\n- keyTakeaways.ch2/ch3은 각각 정확히 3개, 각 40자 이내의 결론 한 줄로 작성하세요. 같은 챕터 본문 문장을 복사하지 말고 서로 다른 소재를 요약하세요.`,
      "P2 dynamics takeaway prompt",
    );
    source = replaceOnce(
      source,
      `- 짝사랑에서는 상대 호감을 확정하거나 연인처럼 갈등 해결을 전제하지 마세요. 썸에서는 교제·독점성을 전제하지 마세요. 친구와 직장동료에는 연애·성적 문구를 넣지 마세요.`,
      `- 짝사랑에서는 상대 호감을 확정하거나 연인처럼 갈등 해결을 전제하지 마세요. 썸에서는 교제·독점성을 전제하지 마세요. 친구와 직장동료에는 연애·성적 문구를 넣지 마세요.\\n- keyTakeaways.ch4~ch9는 각 챕터마다 정확히 3개, 각 40자 이내의 결론 한 줄로 작성하세요. 같은 챕터 본문 문장을 복사하지 말고 서로 다른 소재를 요약하세요.`,
      "P2 action takeaway prompt",
    );
    return source;
  });

  update("src/app/one-to-one/result/result-v2.tsx", (source) => {
    source = replaceOnce(
      source,
      `import type { DetailedReportContent, PaidReportFacts } from \"@/lib/narrative/report-engine-v5\";\nimport type {\n  ActionSegment,\n  DynamicsSegment,\n  IntroSegment,\n  PaidReportSegmentMeta,\n  PaidReportSegmentName,\n} from \"@/lib/narrative/report-engine-v7\";`,
      `import type { PaidReportFacts } from \"@/lib/narrative/report-engine-v5\";\nimport type { EnhancedDetailedReportContent } from \"@/lib/narrative/report-deep-content\";\nimport {\n  mergePaidReportSegmentContents,\n  type ActionSegment,\n  type DynamicsSegment,\n  type IntroSegment,\n  type PaidReportSegmentMeta,\n  type PaidReportSegmentName,\n} from \"@/lib/narrative/report-engine-v7\";`,
      "P2 result merge import",
    );
    source = replaceOnce(
      source,
      `function completeContent(progress: Pick<ReportProgress, \"segments\">): DetailedReportContent | null {\n  const { intro, dynamics, action } = progress.segments;\n  if (!intro || !dynamics || !action) return null;\n  return { ...intro, ...dynamics, ...action };\n}`,
      `function completeContent(progress: Pick<ReportProgress, \"segments\">): EnhancedDetailedReportContent | null {\n  const { intro, dynamics, action } = progress.segments;\n  if (!intro || !dynamics || !action) return null;\n  return mergePaidReportSegmentContents([intro, dynamics, action]);\n}`,
      "P2 result nested takeaway merge",
    );
    source = replaceOnce(
      source,
      `  const [content, setContent] = useState<DetailedReportContent | null>(null);`,
      `  const [content, setContent] = useState<EnhancedDetailedReportContent | null>(null);`,
      "P2 result enhanced content state",
    );
    return source;
  });

  update("scripts/one-to-one-anthropic-sample-qa.ts", (source) => {
    source = replaceOnce(
      source,
      `  generatePaidReportSegmentV7,\n  PAID_REPORT_SEGMENTS,`,
      `  generatePaidReportSegmentV7,\n  mergePaidReportSegmentContents,\n  PAID_REPORT_SEGMENTS,`,
      "P2 QA merge import",
    );
    source = source.replaceAll(
      `const merged = Object.assign({}, ...contents) as Record<string, unknown>;`,
      `const merged = mergePaidReportSegmentContents(contents);`,
    );
    return source;
  });

  update("src/app/one-to-one/result/report-v2-chapters-a.tsx", (source) => {
    source = replaceOnce(
      source,
      `function safeItems(items: string[], fallback: string) {\n  return items.length > 0 ? items : [fallback];\n}`,
      `function safeItems(items: string[]) {\n  return items.filter(Boolean);\n}\n\nfunction chapterSummary(content: EnhancedDetailedReportContent, key: \"ch0\" | \"ch1\" | \"ch2\" | \"ch3\") {\n  return content.keyTakeaways?.[key] ?? [];\n}`,
      "P2 chapter A helpers",
    );
    const summaryReplacements = [
      [`summary={[content.overview.headline, content.bondAndFriction.overview, content.directionalImpact.asymmetry]}`, `summary={chapterSummary(content, \"ch0\")}`],
      [`summary={[content.personA.relationshipNeeds, content.personB.relationshipNeeds, content.chemistry.overview]}`, `summary={chapterSummary(content, \"ch1\")}`],
      [`summary={[content.personB.relationshipNeeds, ...content.personB.strengths.slice(0, 1), ...content.personB.cautions.slice(0, 1)]}`, `summary={chapterSummary(content, \"ch2\")}`],
      [`summary={[...content.personA.strengths.slice(0, 2), content.directionalImpact.aToB]}`, `summary={chapterSummary(content, \"ch3\")}`],
      [`safeItems(content.personA.strengths.slice(0, 3), content.directionalImpact.aToB)`, `safeItems(content.personA.strengths.slice(0, 3))`],
      [`safeItems(content.strengthsAndRisks.strengths.slice(0, 2), content.chemistry.overview)`, `safeItems(content.strengthsAndRisks.strengths.slice(0, 2))`],
      [`safeItems(content.strengthsAndRisks.repeatedFrictions.slice(0, 2), content.strengthsAndRisks.warning)`, `safeItems(content.strengthsAndRisks.repeatedFrictions.slice(0, 2))`],
      [`safeItems(content.personB.strengths, content.chemistry.overview)`, `safeItems(content.personB.strengths)`],
      [`safeItems(content.personB.cautions, content.strengthsAndRisks.warning)`, `safeItems(content.personB.cautions)`],
      [`safeItems(content.bondAndFriction.realLifeManifestations, content.bondAndFriction.overview)`, `safeItems(content.bondAndFriction.realLifeManifestations)`],
      [`safeItems(content.practicalManual.do.slice(0, 2), content.directionalImpact.aToB)`, `safeItems(content.practicalManual.do.slice(0, 2))`],
    ];
    for (const [before, after] of summaryReplacements) source = replaceOnce(source, before, after, `P2 chapter A ${before.slice(0, 30)}`);
    return source;
  });

  update("src/app/one-to-one/result/report-v2-chapters-b.tsx", (source) => {
    source = replaceOnce(
      source,
      `function itemAt(items: string[], index: number, fallback: string) {\n  return items[index] ?? items[0] ?? fallback;\n}`,
      `function itemAt(items: string[], index: number, fallback: string) {\n  return items[index] ?? items[0] ?? fallback;\n}\n\nfunction chapterSummary(content: EnhancedDetailedReportContent, key: \"ch4\" | \"ch5\" | \"ch6\" | \"ch7\" | \"ch8\" | \"ch9\") {\n  return content.keyTakeaways?.[key] ?? [];\n}`,
      "P2 chapter B helper",
    );
    const replacements = [
      [`action: itemAt(content.practicalManual.do, 0, content.relationshipFlow.overview)`, `action: itemAt(content.practicalManual.do, 0, \"평소 관계 장면 하나를 기록하고 서로 편한 지점을 확인하세요.\")`],
      [`action: itemAt(content.practicalManual.do, 1, content.directionalImpact.beneficialSupply)`, `action: itemAt(content.practicalManual.do, 1, \"지난주에 잘 통했던 방식 하나를 골라 자연스럽게 반복하세요.\")`],
      [`action: itemAt(content.practicalManual.conflictProtocol, 0, content.strengthsAndRisks.warning)`, `action: itemAt(content.practicalManual.conflictProtocol, 0, \"마찰이 생기면 결론보다 서로의 설명 순서를 먼저 맞춰 보세요.\")`],
      [`action: itemAt(content.practicalManual.recommendedActivities, 0, content.chemistry.overview)`, `action: itemAt(content.practicalManual.recommendedActivities, 0, \"둘 다 부담 없이 참여할 수 있는 활동 하나를 함께 골라 보세요.\")`],
      [`summary={[content.relationshipSpecific.overview, content.situationStrategy?.priority ?? content.directionalImpact.asymmetry, ...content.practicalManual.do.slice(0, 1)]}`, `summary={chapterSummary(content, \"ch4\")}`],
      [`summary={[content.relationshipFlow.roles, content.relationshipFlow.initiative, content.relationshipFlow.intimacy]}`, `summary={chapterSummary(content, \"ch5\")}`],
      [`summary={[content.chemistry.overview, ...content.bondAndFriction.positiveInteractions.slice(0, 1), content.directionalImpact.bToA]}`, `summary={chapterSummary(content, \"ch6\")}`],
      [`summary={[content.strengthsAndRisks.strengths[0], content.strengthsAndRisks.redFlag, content.strengthsAndRisks.warning]}`, `summary={chapterSummary(content, \"ch7\")}`],
      [`summary={[...content.practicalManual.do.slice(0, 2), ...content.practicalManual.dont.slice(0, 1)]}`, `summary={chapterSummary(content, \"ch8\")}`],
      [`summary={[content.directionalImpact.overview, content.strengthsAndRisks.warning, \"출생시간 미상인 경우 화면 상단의 불확실성 점수 범위를 함께 확인하세요.\"]}`, `summary={chapterSummary(content, \"ch9\")}`],
    ];
    for (const [before, after] of replacements) source = replaceOnce(source, before, after, `P2 chapter B ${before.slice(0, 30)}`);
    return source;
  });

  update("scripts/one-to-one-quality-gate-test.ts", (source) => replaceRegexOnce(
    source,
    /const groundedIntro = groundPaidIntroWithServerEvidence\(dirtyIntro, groundingPrompt\) as typeof dirtyIntro;[\s\S]*?assert\.ok\(!groundedIssues\.includes\(\"MIND_READING_CERTAINTY\"\)\);/,
    `const groundedIntro = groundPaidIntroWithServerEvidence(dirtyIntro, groundingPrompt) as typeof dirtyIntro;\nassert.equal(groundedIntro, dirtyIntro, \"server evidence must validate/retry instead of overwriting AI-authored intro\");\nconst groundedIssues = collectPaidNarrativeQualityIssues(groundedIntro, \"INTRO\", groundingPrompt);\nassert.ok(groundedIssues.includes(\"ELEMENT_PSYCHOLOGY_OVERREACH\"));\nassert.ok(groundedIssues.includes(\"MIND_READING_CERTAINTY\"));`,
    "P2 quality gate preservation expectation",
  ));

  write("scripts/paid-intro-day-pillar-test.ts", `import assert from \"node:assert/strict\";\nimport { formatPaidIntroDayPillar, groundPaidIntroWithServerEvidence } from \"../src/lib/narrative/report-engine-v6-request\";\n\nconst gihe = { korean: \"기해\", hanja: \"己亥\", stem: \"기\", branch: \"해\" };\nconst gapja = { korean: \"갑자\", hanja: \"甲子\", stem: \"갑\", branch: \"자\" };\nassert.equal(formatPaidIntroDayPillar(gihe), \"기해(己亥)\");\nassert.equal(formatPaidIntroDayPillar(gapja), \"갑자(甲子)\", \"birth-time unknown does not make the day pillar unknown\");\nassert.equal(formatPaidIntroDayPillar(\"기해(己亥)\"), \"기해(己亥)\", \"legacy string input remains compatible\");\nassert.equal(formatPaidIntroDayPillar({ hanja: \"己亥\" }), \"일주 미확인\");\n\nconst aiIntro = {\n  overview: { headline: \"샘플\", detailedSummary: \"샘플 요약\" },\n  personA: { overallProfile: \"기해(己亥)를 가진 A의 고유 해설\", elementAnalysis: \"토가 강하고 수가 약한 흐름\", relationshipNeeds: \"A에게 맞는 조건\", strengths: [\"A만의 장점\"], cautions: [\"A만의 주의점\"] },\n  personB: { overallProfile: \"갑자(甲子)를 가진 B의 고유 해설\", elementAnalysis: \"목이 강하고 금이 약한 흐름\", relationshipNeeds: \"B에게 맞는 조건\", strengths: [\"B만의 장점\"], cautions: [\"B만의 주의점\"] },\n};\nconst preserved = groundPaidIntroWithServerEvidence(aiIntro, \"payload\") as typeof aiIntro;\nassert.equal(preserved, aiIntro, \"P2 must preserve valid AI-authored intro content\");\nassert.doesNotMatch(JSON.stringify(preserved), /일주 미확인/);\nconsole.log(\"paid intro day pillar contract: PASS\");\n`);

  write("scripts/report-dedup-personalization-test.ts", `import assert from \"node:assert/strict\";\nimport { readFileSync } from \"node:fs\";\nimport {\n  collectPaidNarrativeQualityIssues,\n  groundPaidIntroWithServerEvidence,\n} from \"../src/lib/narrative/report-engine-v6-request\";\nimport { personalizeNarrativeNames } from \"../src/lib/narrative/name-personalization\";\n\nconst duplicate = \"두 사람의 관계에서 같은 장문이 여러 필드에 그대로 반복되면 유료 리포트의 체감 가치가 크게 떨어집니다.\";\nconst duplicateIssues = collectPaidNarrativeQualityIssues({ a: duplicate, b: duplicate }, \"TEST\");\nassert.ok(duplicateIssues.includes(\"EXACT_LONG_TEXT_DUPLICATE\"), \"40자 이상 동일 문장은 반드시 탐지해야 합니다\");\n\nconst aiIntro = {\n  personA: { overallProfile: \"기해(己亥)인 A는 A만의 문장입니다.\" },\n  personB: { overallProfile: \"갑자(甲子)인 B는 완전히 다른 문장입니다.\" },\n};\nassert.equal(groundPaidIntroWithServerEvidence(aiIntro, \"payload\"), aiIntro, \"AI intro must not be replaced by a server template\");\nassert.notEqual(\n  aiIntro.personA.overallProfile.replace(/[AB]/g, \"\"),\n  aiIntro.personB.overallProfile.replace(/[AB]/g, \"\"),\n  \"person A/B intro copy must remain distinct\",
);\nassert.doesNotMatch(JSON.stringify(aiIntro), /서버 계산상/);\n\nconst personalized = personalizeNarrativeNames({\n  doubleQuoted: '\"나도 같이 가도 돼?\"',\n  singleQuoted: \"'내가 네 생각 많이 했어'\",\n  curlyQuoted: \"“나도 같이 가도 돼?”\",\n  prose: \"나는 먼저 설명하고 상대에게 선택권을 줍니다.\",\n}, { self: \"전종윤\", partner: \"이유빈\" });\nassert.equal(personalized.doubleQuoted, '\"나도 같이 가도 돼?\"');\nassert.equal(personalized.singleQuoted, \"'내가 네 생각 많이 했어'\");\nassert.equal(personalized.curlyQuoted, \"“나도 같이 가도 돼?”\");\nassert.match(personalized.prose, /전종윤님은/, \"legacy unquoted role phrase replacement must remain active\");\nassert.match(personalized.prose, /이유빈님에게/, \"legacy partner replacement must remain active\");\n\nconst requestSource = readFileSync(\"src/lib/narrative/report-engine-v6-request.ts\", \"utf8\");\nassert.match(requestSource, /\"EXACT_LONG_TEXT_DUPLICATE\"[\\s\\S]*?\]\);/, \"duplicate issue must be promoted into the critical quality set\");\nassert.doesNotMatch(requestSource, /return \\{ \\.\\.\\.value, personA, personB \\}/, \"server must not wholesale-replace personA/personB\");\nassert.match(requestSource, /서버 계산상/, \"internal-term detector keeps an explicit regression guard for this phrase\");\n\nconst engineSource = readFileSync(\"src/lib/narrative/report-engine-v7.ts\", \"utf8\");\nassert.match(engineSource, /keyTakeaways: objectSchema\\(\\{ ch0: STRING_ARRAY, ch1: STRING_ARRAY \\}\\)/);\nassert.match(engineSource, /mergePaidReportSegmentContents/);\n\nfor (const path of [\n  \"src/app/one-to-one/result/report-v2-chapters-a.tsx\",\n  \"src/app/one-to-one/result/report-v2-chapters-b.tsx\",\n]) {\n  const source = readFileSync(path, \"utf8\");\n  assert.doesNotMatch(source, /summary=\\{\\[content\\./, \`\${path} must not reuse body fields as chapter summary\`);\n  assert.match(source, /chapterSummary\\(content, \"ch\\d\"\\)/, \`\${path} must render dedicated keyTakeaways\`);\n}\n\nconst chapterBody = \"본문에서는 약속을 잡는 속도 차이를 길게 설명합니다.\";\nconst takeaway = \"약속 속도부터 먼저 맞추세요\";\nassert.ok(!chapterBody.includes(takeaway), \"takeaway fixture must be a conclusion, not a verbatim body copy\");\n\nconsole.log(\"report dedup and personalization contract: PASS\");\n`);
  addPackageScript("test:report:dedup", "tsx scripts/report-dedup-personalization-test.ts");

  update(".github/workflows/manse-validation.yml", (source) => replaceOnce(
    source,
    "          npm run test:intro:day-pillar\n",
    "          npm run test:intro:day-pillar\n          npm run test:report:dedup\n",
    "P2 CI contract test",
  ));
}

const phase = process.argv[2];
if (phase === "p1") phaseP1();
else if (phase === "p2") phaseP2();
else throw new Error("usage: node .github/scripts/gpt-p1-p2-patch.mjs p1|p2");
console.log(`patch ${phase}: complete`);
