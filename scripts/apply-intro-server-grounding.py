from pathlib import Path

request_path = Path("src/lib/narrative/report-engine-v6-request.ts")
text = request_path.read_text()

anchor = '''function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
'''
helper = r'''

const INTRO_ELEMENT_LABELS: Record<string, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

function parseAiPayloadFromUserPrompt(userPrompt: string) {
  const firstBrace = userPrompt.indexOf("{");
  if (firstBrace < 0) return null;
  try {
    const parsed = JSON.parse(userPrompt.slice(firstBrace));
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function introElementList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const labels = values
    .filter((item): item is string => typeof item === "string")
    .map((item) => INTRO_ELEMENT_LABELS[item] ?? item)
    .filter(Boolean);
  return labels.length ? labels.join("·") : "뚜렷한 단일 기운 없음";
}

function buildGroundedIntroPerson(payload: Record<string, unknown>, key: "A" | "B") {
  const factsRoot = isPlainObject(payload.facts) ? payload.facts : null;
  const fact = factsRoot && isPlainObject(factsRoot[key]) ? factsRoot[key] : null;
  const evidenceRoot = isPlainObject(payload.evidence) ? payload.evidence : null;
  const persons = evidenceRoot && isPlainObject(evidenceRoot.persons) ? evidenceRoot.persons : null;
  const evidence = persons && isPlainObject(persons[key]) ? persons[key] : null;
  if (!fact || !evidence) return null;

  const placeholder = key === "A" ? "{{SELF}}" : "{{PARTNER}}";
  const dayPillar = typeof fact.dayPillar === "string" ? fact.dayPillar : "일주 미확인";
  const birthTimeKnown = fact.birthTimeKnown === true;
  const dayMaster = isPlainObject(evidence.dayMaster) ? evidence.dayMaster : null;
  const dayMasterStem = dayMaster && typeof dayMaster.stem === "string" ? dayMaster.stem : null;
  const dayMasterElement = dayMaster && typeof dayMaster.element === "string"
    ? introElementList(dayMaster.element)
    : null;
  const balance = isPlainObject(evidence.elementBalance) ? evidence.elementBalance : null;
  const strongest = introElementList(balance?.strongest);
  const weakest = introElementList(balance?.weakest);
  const timeSentence = birthTimeKnown
    ? "출생시간까지 확인된 입력을 사용했으므로 현재 입력 범위 안에서 시주를 포함한 계산 결과를 참고할 수 있습니다."
    : "출생시간이 확인되지 않은 입력이므로 시주에 따라 달라질 수 있는 부분은 이 기본판에서 확정하지 않습니다.";
  const dayMasterSentence = dayMasterStem && dayMasterElement
    ? `일간은 ${dayMasterStem}(${dayMasterElement})로 계산되었습니다.`
    : "일간 정보는 서버가 제공한 계산 범위 안에서만 사용합니다.";

  return {
    overallProfile: `${placeholder}의 일주는 서버 계산상 ${dayPillar}입니다. ${dayMasterSentence} 이 값들은 출생정보를 사주 구조로 변환한 식별값이며 성격, 감정, 공감 능력이나 숨은 마음을 직접 뜻하지 않습니다. ${timeSentence} 따라서 이 기본판은 계산된 구조와 입력 확실성만 설명하고, 실제 관계 행동은 두 사람이 현실에서 보이는 반응으로 확인해야 합니다. 뒤의 관계 해설에서도 사주 구조와 관찰 가능한 행동을 구분해 읽는 것이 기준입니다.`,
    elementAnalysis: `${placeholder}의 오행 분포에서는 ${strongest}이 상대적으로 강하고 ${weakest}이 상대적으로 약한 방향으로 계산되었습니다. 여기서 강함과 약함은 오행 사이의 상대적 배치에 대한 설명이며 사람의 능력이나 심리 기능에 대한 평가가 아닙니다. 정확한 비율이나 개수를 새로 추정하지 않고 서버가 제공한 strongest/weakest 순위만 사용합니다. 두 사람의 오행을 비교할 때도 어느 한쪽이 다른 쪽의 결핍을 자동으로 채운다고 단정하지 않고, 구조상 겹치는 부분과 다른 부분을 관계 해설의 참고 신호로만 사용합니다.`,
    relationshipNeeds: `${placeholder}에게 필요한 관계 조건을 사주의 심리 진단으로 정하지 않습니다. 실제로 확인할 기준은 대화 속도, 약속을 정하는 방식, 의견이 다를 때 설명하는 방식, 각자가 편안하다고 말하는 경계입니다. 차이가 보이면 상대의 속마음을 추측하기보다 어떤 상황에서 어떤 반응이 반복되는지 먼저 확인합니다. 이후 조언은 이 관찰 결과와 서버 계산 근거가 함께 맞을 때 적용하는 것이 안전합니다.`,
    strengths: [
      `${placeholder}의 계산 구조는 두 사람의 차이를 설명할 때 비교 기준으로 활용할 수 있습니다. 단독으로 성격의 장점이라고 확정하지 않습니다.`,
      `일주와 오행의 상대적 배치를 서로의 구조와 나란히 보면 겹치는 지점과 다른 지점을 구분하기 쉽습니다. 실제 장점 여부는 관계 장면에서 확인합니다.`,
      `출생시간 확인 여부를 함께 표시하므로 계산이 확실한 부분과 열어 두어야 할 부분을 구분할 수 있습니다. 불확실한 부분은 단정하지 않습니다.`,
    ],
    cautions: [
      `오행의 강약을 감정, 공감, 애착, 표현 능력 같은 심리 기능의 원인으로 읽지 않습니다. 구조 설명과 사람 평가를 분리합니다.`,
      `일주 하나만으로 상대의 속마음이나 미래 행동을 확정하지 않습니다. 실제 반응과 대화를 우선 확인합니다.`,
      `출생시간이 없거나 계산 경계가 있는 경우 가능한 범위를 남겨 둡니다. 단일 해석을 사실처럼 고정하지 않습니다.`,
    ],
  };
}

export function groundPaidIntroWithServerEvidence(value: unknown, userPrompt: string): unknown {
  if (!isPlainObject(value)) return value;
  const payload = parseAiPayloadFromUserPrompt(userPrompt);
  if (!payload) return value;
  const personA = buildGroundedIntroPerson(payload, "A");
  const personB = buildGroundedIntroPerson(payload, "B");
  if (!personA || !personB) return value;
  return { ...value, personA, personB };
}
'''
if helper.strip() not in text:
    if anchor not in text:
        raise SystemExit("isPlainObject anchor not found")
    text = text.replace(anchor, anchor + helper, 1)

old_candidate = '''      const normalizedValue = normalizeNarrativeNameTokenDensity(parsed);
      const issues = [...new Set([
        ...args.qualityIssues(normalizedValue),
        ...collectPaidNarrativeQualityIssues(normalizedValue, args.label, args.user),
      ])];
      const candidate: SegmentAttempt<T> = {
        value: normalizedValue,
        usage: body?.usage ?? null,
        characters: collectCharacters(normalizedValue),
        qualityIssues: issues,
      };
'''
new_candidate = '''      const normalizedValue = normalizeNarrativeNameTokenDensity(parsed) as T;
      const candidateValue = (args.label === "INTRO"
        ? groundPaidIntroWithServerEvidence(normalizedValue, args.user)
        : normalizedValue) as T;
      const issues = [...new Set([
        ...args.qualityIssues(candidateValue),
        ...collectPaidNarrativeQualityIssues(candidateValue, args.label, args.user),
      ])];
      const candidate: SegmentAttempt<T> = {
        value: candidateValue,
        usage: body?.usage ?? null,
        characters: collectCharacters(candidateValue),
        qualityIssues: issues,
      };
'''
if old_candidate not in text:
    raise SystemExit("candidate block not found")
text = text.replace(old_candidate, new_candidate, 1)
request_path.write_text(text)

test_path = Path("scripts/one-to-one-quality-gate-test.ts")
test = test_path.read_text()
test = test.replace(
    'import { collectPaidNarrativeQualityIssues } from "../src/lib/narrative/report-engine-v6-request";',
    'import { collectPaidNarrativeQualityIssues, groundPaidIntroWithServerEvidence } from "../src/lib/narrative/report-engine-v6-request";',
)
append = r'''

const groundingPrompt = `server payload\n${JSON.stringify({
  facts: {
    A: { birthTimeKnown: true, dayPillar: "甲子" },
    B: { birthTimeKnown: false, dayPillar: "丁卯" },
  },
  evidence: {
    persons: {
      A: { dayMaster: { stem: "甲", element: "wood" }, elementBalance: { strongest: ["wood"], weakest: ["water"] } },
      B: { dayMaster: { stem: "丁", element: "fire" }, elementBalance: { strongest: ["fire"], weakest: ["metal"] } },
    },
  },
})}`;
const dirtyIntro = {
  overview: { headline: "관계를 현실에서 확인하는 조합", detailedSummary: "서버 계산 근거를 바탕으로 관계의 장점과 조정점을 확인합니다. 실제 행동은 두 사람의 대화와 반응으로 검증해야 합니다.".repeat(6) },
  personA: { overallProfile: "마음속 욕구가 강합니다.", elementAnalysis: "목이 강해서 공감 능력이 높습니다.", relationshipNeeds: "애착 욕구가 큽니다.", strengths: ["공감 능력"], cautions: ["상처"] },
  personB: { overallProfile: "내면을 숨깁니다.", elementAnalysis: "화가 약해서 감정 표현이 부족합니다.", relationshipNeeds: "사랑받을 욕구가 큽니다.", strengths: ["직관"], cautions: ["불안"] },
};
const groundedIntro = groundPaidIntroWithServerEvidence(dirtyIntro, groundingPrompt) as typeof dirtyIntro;
assert.notEqual(groundedIntro.personA.elementAnalysis, dirtyIntro.personA.elementAnalysis);
assert.match(groundedIntro.personA.elementAnalysis, /목/);
assert.match(groundedIntro.personB.elementAnalysis, /화/);
const groundedIssues = collectPaidNarrativeQualityIssues(groundedIntro, "INTRO", groundingPrompt);
assert.ok(!groundedIssues.includes("ELEMENT_PSYCHOLOGY_OVERREACH"));
assert.ok(!groundedIssues.includes("MIND_READING_CERTAINTY"));
'''
if "const groundingPrompt" not in test:
    test += append

test_path.write_text(test)
