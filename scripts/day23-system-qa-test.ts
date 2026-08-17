import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { collectPaidNarrativeQualityIssues } from "../src/lib/narrative/report-engine-v6-request";

const oneToOneOrder = readFileSync("src/app/api/orders/one-to-one/route.ts", "utf8");
const oneToOneReport = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
const oneToManyReport = readFileSync("src/app/api/compatibility/one-to-many/route.ts", "utf8");
const store = readFileSync("src/lib/server-report-store.ts", "utf8");
const segmentLock = readFileSync("src/lib/report-generation-lock.ts", "utf8");
const webhook = readFileSync("src/app/api/webhooks/portone/route.ts", "utf8");
const payment = readFileSync("src/lib/payments/verification.ts", "utf8");
const requestEngine = readFileSync("src/lib/narrative/report-engine-v6-request.ts", "utf8");
const accountStore = readFileSync("src/lib/account-report-store.ts", "utf8");
const workflow = readFileSync(".github/workflows/manse-validation.yml", "utf8");

// New 1:1 orders must have authoritative server storage before checkout.
assert.match(oneToOneOrder, /if \(!persisted\)/);
assert.match(oneToOneOrder, /status: 503/);

// Existing 1:1 orders may only be opened with the original recovery token.
assert.match(oneToOneReport, /loadServerOrderForAccess\(paymentId, accessToken, "oneToOne"\)/);
assert.match(oneToOneReport, /RESULT_ACCESS_DENIED/);
assert.match(oneToOneReport, /storedOrder\.inputSnapshot/);
assert.match(oneToOneReport, /PAYMENT_INPUT_BINDING_REQUIRED/);
assert.doesNotMatch(oneToOneReport, /ensureServerOrderAccessToken/);

// Access hashes and paid order snapshots are immutable after first persistence.
assert.match(store, /access_token_hash IS NULL/);
assert.match(store, /WHEN woorigunghap_order_records\.payment_status = 'paid' THEN woorigunghap_order_records\.order_json/);

// Payment verification remains server-authoritative for amount/product/input.
assert.match(payment, /payment\.amount\.total !== expected\.amount/);
assert.match(payment, /PAYMENT_INPUT_MISMATCH/);
assert.match(oneToManyReport, /PAYMENT_INPUT_BINDING_REQUIRED/);

// Webhook processing can recover from a dead worker, but an ID cannot be reused for another event.
assert.match(store, /status = 'processing' AND updated_at < NOW\(\) - INTERVAL '5 minutes'/);
assert.match(store, /return "conflict" as const/);
assert.match(webhook, /claim === "conflict"/);
assert.match(webhook, /status: 409/);

// 1:1 AI generation is single-flight per paid segment, with stale/failed recovery.
assert.match(segmentLock, /PRIMARY KEY \(payment_id, segment\)/);
assert.match(segmentLock, /status = 'failed'/);
assert.match(segmentLock, /updated_at < NOW\(\) - INTERVAL '5 minutes'/);
assert.match(oneToOneReport, /claimReportSegmentGeneration\(paymentId, segment\)/);
assert.match(oneToOneReport, /REPORT_GENERATION_IN_PROGRESS/);
assert.match(oneToOneReport, /completeReportSegmentGeneration\(paymentId, segment\)/);
assert.match(oneToOneReport, /releaseReportSegmentGeneration/);
assert.match(oneToOneReport, /SERVER_REPORT_SEGMENT_SAVE_FAILED/);

// AI failures remain bounded/retryable and structurally valid but weak output gets one quality retry.
assert.match(requestEngine, /for \(let attempt = 1; attempt <= 2; attempt \+= 1\)/);
assert.match(requestEngine, /response\.status === 429 \|\| response\.status === 529/);
assert.match(requestEngine, /matchesJsonSchema/);
assert.match(requestEngine, /shape\.type === "number"/);
assert.match(requestEngine, /QUALITY_SHORTFALL/);
assert.match(requestEngine, /bestQualityCandidate/);
assert.match(requestEngine, /MAX_TOKENS/);
assert.match(requestEngine, /collectPaidNarrativeQualityIssues/);
assert.match(requestEngine, /EXACT_LONG_TEXT_DUPLICATE/);
assert.match(requestEngine, /DEVELOPER_LABEL_A_B_EXPOSED/);
assert.match(requestEngine, /INTERNAL_METRIC_EXPOSED/);
assert.match(requestEngine, /MIND_READING_CERTAINTY/);
assert.match(requestEngine, /FUTURE_TIMING_LEAK/);
assert.match(requestEngine, /DURATION_CAUSAL_OVERREACH/);
assert.match(requestEngine, /NAME_TOKEN_OVERUSE/);
assert.match(requestEngine, /QUALITY_CRITICAL/);
assert.match(requestEngine, /RELATIONSHIP_ROMANCE_LEAK/);
assert.match(requestEngine, /COWORKER_HIERARCHY_NOT_REFLECTED/);
assert.match(requestEngine, /INTRO" \? 2600/);
assert.match(requestEngine, /5200/);
assert.match(requestEngine, /totalBudgetMs = isLongSegment \? 220_000 : 180_000/);

const repeated = "업무 상황에서는 감정 추정보다 확인 가능한 기준과 책임 범위를 먼저 맞추는 편이 좋습니다.";
const badCoworkerOutput = {
  first: `A는 상대를 무조건 이해해야 합니다. 두 사람은 데이트를 통해 가까워질 수 있습니다. ${repeated}`,
  second: repeated,
  third: repeated,
};
const badIssues = collectPaidNarrativeQualityIssues(
  badCoworkerOutput,
  "ACTION",
  '{"relationshipType":"coworker","coworkerHierarchy":"boss"}',
);
assert.ok(badIssues.includes("ACTION_TOTAL_DENSITY_SHORT"));
assert.ok(badIssues.includes("EXACT_LONG_TEXT_DUPLICATE"));
assert.ok(badIssues.includes("DEVELOPER_LABEL_A_B_EXPOSED"));
assert.ok(badIssues.includes("DETERMINISTIC_CERTAINTY"));
assert.ok(badIssues.includes("RELATIONSHIP_ROMANCE_LEAK"));
assert.ok(badIssues.includes("COWORKER_HIERARCHY_NOT_REFLECTED"));

const manualQaRegressionIssues = collectPaidNarrativeQualityIssues(
  {
    first: "{{SELF}}은 {{PARTNER}}와 2027년 범위값을 보면 관계가 자동으로 좋아질 확률이 높아집니다.",
    second: "{{PARTNER}}는 내부적으로 사랑받을 자격이 없다고 내면화하며 갈망합니다.",
    third: "26개월 유지된 것은 이 조합의 강점이 증명합니다. 배우자 역할 점수와 유용신 적합도를 확인하세요.",
    fourth: Array.from({ length: 80 }, () => "{{SELF}} {{PARTNER}}").join(" "),
  },
  "ACTION",
  '{"relationshipType":"lover","relationshipDurationMonths":26}',
);
assert.ok(manualQaRegressionIssues.includes("FUTURE_TIMING_LEAK"));
assert.ok(manualQaRegressionIssues.includes("INTERNAL_METRIC_EXPOSED"));
assert.ok(manualQaRegressionIssues.includes("DETERMINISTIC_CERTAINTY"));
assert.ok(manualQaRegressionIssues.includes("MIND_READING_CERTAINTY"));
assert.ok(manualQaRegressionIssues.includes("DURATION_CAUSAL_OVERREACH"));
assert.ok(manualQaRegressionIssues.includes("NAME_TOKEN_OVERUSE"));

const hierarchyAwareText = Array.from(
  { length: 130 },
  (_, index) => `업무 장면 ${index + 1}에서는 보고 시점을 먼저 합의하고, 이견이 있으면 근거를 짧게 정리해 상사에게 요청하며 피드백 기준을 확인합니다.`,
).join(" ");
const hierarchyAwareIssues = collectPaidNarrativeQualityIssues(
  { detail: hierarchyAwareText },
  "ACTION",
  '{"relationshipType":"coworker","coworkerHierarchy":"boss"}',
);
assert.ok(!hierarchyAwareIssues.includes("COWORKER_HIERARCHY_NOT_REFLECTED"));
assert.ok(!hierarchyAwareIssues.includes("ACTION_TOTAL_DENSITY_SHORT"));

// Account deletion strips sensitive report/input material while preserving a minimal legal record.
assert.match(accountStore, /legal-retention-v1/);
assert.match(accountStore, /report_json = NULL/);
assert.match(accountStore, /access_token_hash = NULL/);

// CI must include the modern account/payment/policy QA contracts, not stop at Day 9.
assert.match(workflow, /test:day16:one-to-many-paid-e2e/);
assert.match(workflow, /test:day18:account-report-library/);
assert.match(workflow, /test:day22:operating-policy/);
assert.match(workflow, /test:day23:system-qa/);

console.log("Day 23 system QA + real-sample narrative quality regression checks: PASS");
