import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { productFromPaymentId } from "../src/lib/payments/verification";

assert.equal(productFromPaymentId("woori-oneToOne-abc"), "oneToOne");
assert.equal(productFromPaymentId("woori-oneToMany-abc"), "oneToMany");
assert.equal(productFromPaymentId("woori-unknown-abc"), null);
assert.equal(productFromPaymentId("oneToOne-abc"), null);

const liveRoute = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
assert.match(liveRoute, /verifyPaidPayment\(paymentId,\s*"oneToOne",\s*input\)/);
assert.match(liveRoute, /phase === "prepare"/);
assert.match(liveRoute, /generatePaidReportSegmentV7/);
assert.match(liveRoute, /retryable:/);
assert.doesNotMatch(liveRoute, /generateDetailedPaidReportV6/);
assert.doesNotMatch(liveRoute, /phase === "legacy"/);

const verification = readFileSync("src/lib/payments/verification.ts", "utf8");
assert.match(verification, /PAYMENT_INPUT_MISMATCH/);
assert.match(verification, /hashOneToOneInput\(expectedInput as OneToOneReportInput, bindingVersion\)/);
assert.match(verification, /hashOneToManyInput\(expectedInput as OneToManyReportInput, bindingVersion\)/);
assert.match(verification, /PREVIOUS_ORDER_BINDING_VERSION/);
assert.match(verification, /OLDER_ORDER_BINDING_VERSION/);
assert.match(verification, /LEGACY_ORDER_BINDING_VERSION/);
assert.match(verification, /isBindingVersion\(bindingVersion\)/);
assert.match(verification, /PAYMENT_LOOKUP_TIMEOUT_MS/);
assert.match(verification, /SERVER_RECEIPT_TIMEOUT_MS/);
assert.match(verification, /PAYMENT_TERMINAL/);
assert.match(verification, /status === "FAILED"/);
assert.match(verification, /status === "CANCELLED"/);
assert.match(verification, /status === "PARTIAL_CANCELLED"/);

const binding = readFileSync("src/lib/order-binding.ts", "utf8");
assert.match(binding, /input-sha256-v4/);
assert.match(binding, /input-sha256-v3/);
assert.match(binding, /input-sha256-v2/);
assert.match(binding, /input-sha256-v1/);
assert.match(binding, /coworkerHierarchy/);
assert.match(binding, /relationshipDurationMonths/);
assert.match(binding, /mostCurious/);
assert.match(binding, /displayName: value\.displayName/);
assert.match(binding, /version === LEGACY_ORDER_BINDING_VERSION/);
assert.match(binding, /canonicalizeOneToManyInput/);
assert.match(binding, /version: OrderBindingVersion = ORDER_BINDING_VERSION/);

const paymentButton = readFileSync("src/components/payment-button.tsx", "utf8");
assert.match(paymentButton, /customData:/);
assert.match(paymentButton, /inputHash/);
assert.match(paymentButton, /hashOneToOneInput\(inputSnapshot as OneToOneReportInput\)/);
assert.match(paymentButton, /bindingVersion: ORDER_BINDING_VERSION/);

const paymentVerify = readFileSync("src/app/api/payments/verify/route.ts", "utf8");
assert.match(paymentVerify, /verifyPaidPayment\(paymentId, product, input\)/);
assert.match(paymentVerify, /finalizeVerifiedPaidOrder/);

const resultPage = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
assert.match(resultPage, /paymentId: draft\.paymentId/);
assert.match(resultPage, /input: draft\.inputSnapshot/);
assert.match(resultPage, /phase,/);

const redirectPage = readFileSync("src/app/payment/redirect/page.tsx", "utf8");
assert.doesNotMatch(redirectPage, /while \(!cancelled\)/);
assert.match(redirectPage, /MAX_VERIFY_ATTEMPTS/);
assert.match(redirectPage, /VERIFY_REQUEST_TIMEOUT_MS/);
assert.match(redirectPage, /PORTONE_LOOKUP_FAILED/);
assert.match(redirectPage, /PAYMENT_NOT_PAID/);
assert.match(redirectPage, /PAYMENT_PAID_STORE_PENDING/);
assert.match(redirectPage, /같은 결제 다시 확인/);

const demoRoute = readFileSync("src/app/api/compatibility/one-to-one/demo/route.ts", "utf8");
assert.doesNotMatch(demoRoute, /request\.json\(/);
assert.match(demoRoute, /const DEMO_INPUT/);

console.log("Day 8 payment gate v5 + bounded recovery + v4/v3/v2/v1 backward compatibility regression checks passed");
