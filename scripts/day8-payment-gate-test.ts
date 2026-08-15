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

const verification = readFileSync("src/lib/payments/verification.ts", "utf8");
assert.match(verification, /PAYMENT_INPUT_MISMATCH/);
assert.match(verification, /hashOneToOneInput\(expectedInput\)/);
assert.match(verification, /bindingVersion === ORDER_BINDING_VERSION/);

const paymentButton = readFileSync("src/components/payment-button.tsx", "utf8");
assert.match(paymentButton, /customData:/);
assert.match(paymentButton, /inputHash/);
assert.match(paymentButton, /hashOneToOneInput\(inputSnapshot\)/);

const resultPage = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
assert.match(resultPage, /paymentId: draft\.paymentId/);
assert.match(resultPage, /input: draft\.inputSnapshot/);
assert.match(resultPage, /phase,/);

const demoRoute = readFileSync("src/app/api/compatibility/one-to-one/demo/route.ts", "utf8");
assert.doesNotMatch(demoRoute, /request\.json\(/);
assert.match(demoRoute, /const DEMO_INPUT/);

console.log("Day 8 payment gate regression checks passed");
