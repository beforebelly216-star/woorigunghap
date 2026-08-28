import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const verification = source("src/lib/payments/verification.ts");
const finalization = source("src/lib/payment-order-finalization.ts");
const paymentVerify = source("src/app/api/payments/verify/route.ts");
const paymentRedirect = source("src/app/payment/redirect/page.tsx");
const webhook = source("src/app/api/webhooks/portone/route.ts");
const paymentReady = source("src/app/api/orders/payment-ready/route.ts");
const paymentButton = source("src/components/payment-button.tsx");
const oneToOneForm = source("src/components/one-to-one-form-v3.tsx");
const nextConfig = source("next.config.ts");
const resilientPath = resolve(process.cwd(), "src/app/api/compatibility/one-to-one-resilient/route.ts");

assert.ok(
  verification.includes("loadTrustedServerPaidOrder"),
  "paid report generation must reuse the previously server-verified paid order",
);
assert.ok(
  verification.includes("PAYMENT_LOOKUP_TIMEOUT_MS"),
  "PortOne lookup must have a hard timeout",
);
assert.ok(
  verification.includes("SERVER_RECEIPT_TIMEOUT_MS"),
  "trusted server receipt lookup must have a hard timeout",
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
  paymentVerify.includes("verifyPaidPayment(paymentId, product, input)"),
  "checkout verification must bind PortOne verification to the exact product and input",
);
assert.ok(
  paymentVerify.includes("finalizeVerifiedPaidOrder"),
  "verified payments must be finalized through the authoritative paid-order writer",
);
assert.ok(
  finalization.includes("RETURNING payment_id"),
  "paid-state finalization must confirm that exactly one authoritative order row was updated",
);
assert.ok(
  finalization.includes("updated.length !== 1"),
  "zero-row paid updates must never be reported as success",
);
assert.ok(
  finalization.includes("PAYMENT_INPUT_MISMATCH"),
  "server order recovery must keep immutable input binding",
);
assert.ok(
  finalization.includes("inputBoundByPayment"),
  "missing server orders may only be recovered from a PortOne-bound input",
);
assert.ok(
  webhook.includes("const paidStored = await markExistingServerOrderPaid"),
  "PortOne webhook must check whether the authoritative paid state was actually persisted",
);
assert.ok(
  webhook.includes("if (!paidStored)"),
  "webhook processing must fail and retry instead of acknowledging a missing paid order row",
);
assert.ok(
  paymentRedirect.includes("MAX_VERIFY_ATTEMPTS"),
  "payment confirmation polling must be bounded",
);
assert.ok(
  paymentRedirect.includes("VERIFY_REQUEST_TIMEOUT_MS"),
  "each payment confirmation request must be abortable",
);
assert.ok(
  paymentRedirect.includes("same payment") === false,
  "user-facing Korean payment recovery should not accidentally expose internal English copy",
);
assert.ok(
  paymentRedirect.includes("같은 결제 다시 확인"),
  "retry exhaustion must offer a same-payment recheck rather than another charge",
);
assert.ok(
  paymentRedirect.includes("RECHECK_ONLY_PAYMENT_CODES")
    && paymentRedirect.includes("PAYMENT_STORE_NOT_CONFIGURED"),
  "missing server configuration must stop automatic retries while preserving same-payment recovery",
);
assert.ok(
  paymentReady.includes("isServerReportStoreConfigured")
    && paymentReady.includes("loadServerOrderPaymentState")
    && paymentReady.includes("PAYMENT_STORE_NOT_CONFIGURED"),
  "the payment preflight must reject checkout when the authoritative store is unavailable",
);
assert.ok(
  paymentReady.includes("storedHash !== requestedHash")
    && paymentReady.includes("PAYMENT_INPUT_MISMATCH"),
  "the payment preflight must bind the browser input to the authoritative server order",
);
assert.ok(
  paymentReady.includes('record.paymentStatus === "paid"')
    && paymentReady.includes('record.paymentStatus !== "draft"'),
  "the payment preflight must resume paid orders and reject unsupported payment states",
);
assert.ok(
  paymentButton.indexOf("/api/orders/payment-ready") < paymentButton.indexOf("PortOne.requestPayment"),
  "PortOne must never open before the authoritative server order preflight succeeds",
);
assert.ok(
  paymentButton.includes("alreadyPaid") && paymentButton.includes("resultAccessToken"),
  "an already-paid order must resume its existing result instead of opening another payment",
);
assert.ok(
  !oneToOneForm.includes("createOneToOneOrderDraft"),
  "1:1 checkout must not fall back to a browser-only order when server persistence fails",
);
assert.equal(
  existsSync(resilientPath),
  false,
  "the duplicate one-to-one resilient API wrapper must be removed",
);
assert.ok(
  !nextConfig.includes("one-to-one-resilient") && !nextConfig.includes("beforeFiles"),
  "one-to-one requests must go directly to the single authoritative API route",
);

console.log("Paid-result audit contract passed: bound verification + strict paid persistence + bounded client retries + single report route.");
