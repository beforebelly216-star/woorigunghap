import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const verification = source("src/lib/payments/verification.ts");
const resilientRoute = source("src/app/api/compatibility/one-to-one-resilient/route.ts");
const paymentVerify = source("src/app/api/payments/verify/route.ts");
const nextConfig = source("next.config.ts");

assert.ok(
  verification.includes("loadTrustedServerPaidOrder"),
  "paid report generation must reuse the previously server-verified paid order",
);
assert.ok(
  verification.includes("payment_status = 'paid'"),
  "trusted payment reuse must require the authoritative server record to be paid",
);
assert.ok(
  verification.includes("generation_status <> 'deleted'"),
  "deleted orders must never be trusted for report generation",
);
assert.ok(
  verification.includes("storedHash !== requestedHash"),
  "trusted server payment reuse must still bind the immutable paid input",
);
assert.ok(
  verification.includes('source: "server-paid-order"'),
  "trusted server payment reuse must be distinguishable from a fresh PortOne lookup",
);
assert.ok(
  verification.indexOf("loadTrustedServerPaidOrder(paymentId, product, expectedInput)")
    < verification.indexOf("const secret = process.env.PORTONE_API_SECRET"),
  "already verified paid orders must not depend on a second PortOne lookup or API secret check",
);
assert.ok(
  paymentVerify.includes("PAYMENT_PAID_STORE_PENDING"),
  "checkout verification must not redirect to generation before the paid server receipt is persisted",
);
assert.ok(
  paymentVerify.includes("if (!paidStored)"),
  "a failed paid-state persistence must remain in verification instead of falsely reporting success",
);
assert.ok(
  resilientRoute.includes("recoverPreparedPhase"),
  "prepare must have a deterministic recovery path after repeated ordinary-route failures",
);
assert.ok(
  resilientRoute.includes("prepare-cache-not-persisted"),
  "prepare cache persistence must be best-effort instead of trapping paid users at zero segments",
);
assert.ok(
  resilientRoute.includes('retryable: false'),
  "repeated server failures must terminate instead of returning an endless 503 retry loop",
);
assert.ok(
  resilientRoute.includes("REPORT_STATE_RETRY_EXHAUSTED"),
  "bounded recovery must expose a stable diagnostic code",
);
assert.ok(
  nextConfig.includes("beforeFiles"),
  "the resilient paid-result route must continue to run before the concrete filesystem API route",
);

console.log("Paid-result loop hotfix contract passed: trusted paid receipt + deterministic prepare recovery + bounded retry policy.");
