import assert from "node:assert/strict";
import { collectPaidNarrativeQualityIssues } from "../src/lib/narrative/report-engine-v6-request";

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
