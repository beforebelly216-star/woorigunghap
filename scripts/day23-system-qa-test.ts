import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oneToOneOrder = readFileSync("src/app/api/orders/one-to-one/route.ts", "utf8");
const oneToOneReport = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
const oneToManyReport = readFileSync("src/app/api/compatibility/one-to-many/route.ts", "utf8");
const store = readFileSync("src/lib/server-report-store.ts", "utf8");
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

// AI failures remain bounded/retryable and output is server-validated.
assert.match(requestEngine, /for \(let attempt = 1; attempt <= 2; attempt \+= 1\)/);
assert.match(requestEngine, /response\.status === 429 \|\| response\.status === 529/);
assert.match(requestEngine, /matchesJsonSchema/);
assert.match(requestEngine, /MAX_TOKENS/);

// Account deletion strips sensitive report/input material while preserving a minimal legal record.
assert.match(accountStore, /legal-retention-v1/);
assert.match(accountStore, /report_json = NULL/);
assert.match(accountStore, /access_token_hash = NULL/);

// CI must include the modern account/payment/policy QA contracts, not stop at Day 9.
assert.match(workflow, /test:day16:one-to-many-paid-e2e/);
assert.match(workflow, /test:day18:account-report-library/);
assert.match(workflow, /test:day22:operating-policy/);
assert.match(workflow, /test:day23:system-qa/);

console.log("Day 23 system QA contract checks: PASS");
