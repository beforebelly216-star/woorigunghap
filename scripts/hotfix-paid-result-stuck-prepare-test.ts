import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const verification = source("src/lib/payments/verification.ts");
const resilientRoute = source("src/app/api/compatibility/one-to-one-resilient/route.ts");
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
  resilientRoute.includes('code: payload?.code ?? "REPORT_STATE_TRANSIENT"'),
  "transient recovery must preserve the underlying failure code for diagnostics",
);
assert.ok(
  nextConfig.includes("beforeFiles"),
  "the resilient paid-result route must continue to run before the concrete filesystem API route",
);

console.log("Paid-result stuck-prepare hotfix contract passed: server-verified receipt reuse + immutable input binding + resilient route precedence.");
