import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateOneToManyCompatibility } from "../src/lib/compatibility/one-to-many";
import {
  ONE_TO_MANY_DEMO_INPUT,
  ONE_TO_MANY_DEMO_NAMES,
} from "../src/lib/compatibility/one-to-many-demo";
import {
  buildOneToManyResultView,
  buildSituationalRecommendations,
  buildSummaryMetrics,
  ONE_TO_MANY_VIEW_VERSION,
} from "../src/lib/compatibility/one-to-many-view";
import {
  buildOneToManyNarrativeEvidence,
  type OneToManyNarrativeContent,
} from "../src/lib/narrative/one-to-many-report-engine";

const snapshot = calculateOneToManyCompatibility(ONE_TO_MANY_DEMO_INPUT);
const metrics = buildSummaryMetrics(snapshot);
const recommendations = buildSituationalRecommendations(snapshot, metrics);
const view = buildOneToManyResultView(snapshot, ONE_TO_MANY_DEMO_NAMES);
const evidence = buildOneToManyNarrativeEvidence(snapshot);
const semanticNarrative: OneToManyNarrativeContent = {
  rankingSummary: { headline: "비교 결론", summary: "비교 요약", closenessNotice: "차이 안내" },
  candidates: snapshot.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    oneLine: "이 관계의 핵심을 한 줄로 봅니다.",
    strengths: ["강점 설명 A", "강점 설명 B"],
    cautions: ["조율 설명 A"],
    practicalTip: "확인할 행동을 하나 정해 보세요.",
  })),
  situationalRecommendations: Object.fromEntries(
    recommendations.map((item) => [item.id, { candidateIds: item.candidateIds, reason: "상황별 이유를 설명합니다." }]),
  ) as OneToManyNarrativeContent["situationalRecommendations"],
  finalSummary: "비교 결과를 실제 관계 대화에 활용하세요.",
};
const semanticView = buildOneToManyResultView(snapshot, ONE_TO_MANY_DEMO_NAMES, semanticNarrative);

assert.equal(view.viewVersion, ONE_TO_MANY_VIEW_VERSION);
assert.equal(view.rankings.length, 3);
assert.equal(view.summaryMetrics.length, 6);
assert.equal(view.detailedDimensions.length, 9);
assert.equal(view.recommendations.length, 5);
assert.deepEqual(view.rankings.map((candidate) => candidate.displayName).sort(), ["도윤", "민서", "하린"]);
assert.equal(view.rankings.some((candidate) => candidate.uncertaintyRange.width > 0), true);
assert.equal(view.recommendations.some((recommendation) => recommendation.shared), true);
for (const candidate of semanticView.candidateInsights) {
  assert.ok(candidate.insightTitle.includes("관계"));
  assert.ok(!/^(강점|조율) \d+$/.test(candidate.insightTitle));
  assert.ok(candidate.strengths.every((item) => !/^강점 \d+$/.test(item.label)));
  assert.ok(candidate.cautions.every((item) => !/^조율 \d+$/.test(item.label)));
}

for (const recommendation of recommendations) {
  assert.ok(recommendation.candidateIds.length >= 1);
  assert.equal(new Set(recommendation.candidateIds).size, recommendation.candidateIds.length);
  assert.deepEqual(
    evidence.situationalRecommendations[recommendation.id].candidateIds,
    recommendation.candidateIds,
    "AI는 서버가 확정한 공동 추천 후보를 바꿀 수 없어야 합니다.",
  );
}

const serializedView = JSON.stringify(view);
for (const rawBirthValue of ["1990-05-15", "1992-10-24", "14:30", "05:30"]) {
  assert.equal(serializedView.includes(rawBirthValue), false, `결과 뷰에 원본 생년월일시가 노출되면 안 됩니다: ${rawBirthValue}`);
}

const resultSource = readFileSync("src/components/one-to-many-result.tsx", "utf8");
const paidSource = readFileSync("src/app/one-to-many/result/page.tsx", "utf8");
const demoSource = readFileSync("src/app/one-to-many/result/demo/page.tsx", "utf8");
const errorSource = readFileSync("src/app/one-to-many/result/demo/error.tsx", "utf8");
const formSource = readFileSync("src/components/one-to-many-form.tsx", "utf8");
assert.match(resultSource, /한눈에 보는 순위/);
assert.match(resultSource, /공동 추천/);
assert.match(resultSource, /명리 9개 항목 상세 점수/);
assert.match(resultSource, /<details/);
assert.match(resultSource, /<table/);
assert.match(resultSource, /candidate.insightTitle/);
assert.doesNotMatch(resultSource, /candidate.rank}위<\/b>/);
assert.match(paidSource, /OneToManyPaidResult/);
assert.match(demoSource, /demo/);
assert.match(errorSource, /reset/);
assert.match(formSource, /3,000원 결제로 계속하기/);

console.log("Day 15 one-to-many result UI checks: PASS");
