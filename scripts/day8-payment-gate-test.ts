import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { productFromPaymentId } from "../src/lib/payments/verification";

assert.equal(productFromPaymentId("woori-oneToOne-abc"), "oneToOne");
assert.equal(productFromPaymentId("woori-oneToMany-abc"), "oneToMany");
assert.equal(productFromPaymentId("woori-unknown-abc"), null);
assert.equal(productFromPaymentId("oneToOne-abc"), null);

const liveRoute = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
assert.match(liveRoute, /verifyPaidPayment\(paymentId, "oneToOne"\)/);
assert.match(liveRoute, /paymentId: draft\.paymentId|paymentId/);

const resultPage = readFileSync("src/app/one-to-one/result/page.tsx", "utf8");
assert.match(resultPage, /paymentId: draft\.paymentId/);
assert.match(resultPage, /input: draft\.inputSnapshot/);
assert.match(resultPage, /\/api\/compatibility\/one-to-one\/demo/);

const demoRoute = readFileSync("src/app/api/compatibility/one-to-one/demo/route.ts", "utf8");
assert.doesNotMatch(demoRoute, /request\.json\(/);
assert.match(demoRoute, /const DEMO_INPUT/);

console.log("Day 8 payment gate regression checks passed");
