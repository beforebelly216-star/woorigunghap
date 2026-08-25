import assert from "node:assert/strict";
import { collectPaidNarrativeQualityIssues, groundPaidIntroWithServerEvidence } from "../src/lib/narrative/report-engine-v6-request";

function issues(text: string) {
  return collectPaidNarrativeQualityIssues({ sample: text }, "TEST");
}

const unsafe = [
  "목이 약해서 공감 능력이 부족합니다.",
  "화가 적어서 감정을 잘 표현하지 못합니다.",
  "수가 강해서 상처를 오래 품는 편입니다.",
  "공감 능력이 부족한 것은 목이 약하기 때문입니다.",
];
for (const sample of unsafe) {
  assert.ok(
    issues(sample).includes("ELEMENT_PSYCHOLOGY_OVERREACH"),
    `must reject causal element-to-psychology claim: ${sample}`,
  );
}

const safe = [
  "오행은 심리 기능과 1:1로 대응하지 않습니다.",
  "목이 약하다는 구조 신호가 있지만 공감 능력 부족을 뜻하지 않습니다.",
  "오행의 상대적 균형은 관계에서 보완 지점을 살피는 참고 신호입니다. 감정 상태는 별도로 확인해야 합니다.",
  "화가 상대적으로 적습니다. 이 사실만으로 감정 표현 능력을 판단하지 않습니다.",
];
for (const sample of safe) {
  assert.ok(
    !issues(sample).includes("ELEMENT_PSYCHOLOGY_OVERREACH"),
    `must allow non-causal or explicitly bounded explanation: ${sample}`,
  );
}

console.log("one-to-one quality gate regression: PASS");


const introArtifactLike = {
  overview: {
    headline: "샘플",
    detailedSummary: "26개월간 관계를 지탱해 온 것은 두 사람이 이미 기본적인 호응 패턴을 몸으로 알고 있다는 뜻이기도 합니다.",
  },
  personA: {
    overallProfile: "상대방에게 자신의 생각을 명확히 알리고 싶은 욕구가 강합니다.",
    elementAnalysis: "금의 강함은 명확한 의사 표현으로 드러나고, 물의 약함은 표면적 반응에 머물기 쉽다는 의미로 읽힙니다.",
    relationshipNeeds: "상대가 아직 마음의 준비가 안 된 상태를 살펴보세요.",
    strengths: ["관계를 지키려는 의지가 강합니다."],
    cautions: ["나무 기운의 부족함이 유연함을 줄일 수 있습니다."],
  },
  personB: {
    overallProfile: "자신의 진짜 생각을 드러내기까지 시간이 걸립니다.",
    elementAnalysis: "불의 약함은 감정을 즉각적으로 표현하는 에너지가 제한적일 수 있다는 의미입니다.",
    relationshipNeeds: "감정을 언어로 표현하는 연습이 필요합니다.",
    strengths: ["상대의 진정성을 감지하는 능력이 뛰어납니다."],
    cautions: ["마음에 쌓아 두지 마세요."],
  },
};
const introArtifactIssues = collectPaidNarrativeQualityIssues(
  introArtifactLike,
  "INTRO",
  '{"relationshipType":"lover","relationshipDurationMonths":26}',
);
assert.ok(introArtifactIssues.includes("ELEMENT_PSYCHOLOGY_OVERREACH"));
assert.ok(introArtifactIssues.includes("MIND_READING_CERTAINTY"));
assert.ok(introArtifactIssues.includes("DURATION_CAUSAL_OVERREACH"));


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
assert.notEqual(groundedIntro, dirtyIntro, "server evidence repair must return a new value after model retry exhaustion");
assert.match(groundedIntro.personA.overallProfile, /甲子/);
assert.match(groundedIntro.personB.overallProfile, /丁卯/);
const groundedIssues = collectPaidNarrativeQualityIssues(groundedIntro, "INTRO", groundingPrompt);
assert.ok(groundedIssues.includes("ELEMENT_PSYCHOLOGY_OVERREACH"));
assert.ok(groundedIssues.includes("MIND_READING_CERTAINTY"));
assert.ok(!groundedIssues.includes("INTRO_DAY_PILLAR_MISMATCH"));
assert.ok(!groundedIssues.includes("INTRO_ELEMENT_RANK_MISMATCH"));
