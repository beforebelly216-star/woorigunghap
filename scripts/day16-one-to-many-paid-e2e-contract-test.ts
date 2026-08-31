import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/lib/catalog";
import { hashOneToManyInput } from "../src/lib/order-binding";
import { createOneToManyOrderDraft } from "../src/lib/orders";
import { buildOneToManyResultUrl, isResultAccessToken } from "../src/lib/result-access-token";
import type { OneToManyReportInput } from "../src/lib/report-input";

async function main() {
const input: OneToManyReportInput = {
  relationshipType: "lover",
  referencePerson: { displayName: "나", gender: "male", calendarType: "solar", birthDate: "1990-05-15", birthTimeKnown: true, birthTime: "14:30", isLeapMonth: false },
  candidates: [
    { displayName: "가", gender: "female", calendarType: "solar", birthDate: "1992-10-24", birthTimeKnown: true, birthTime: "05:30", isLeapMonth: false },
    { displayName: "나", gender: "female", calendarType: "solar", birthDate: "1991-08-11", birthTimeKnown: false, birthTime: null, isLeapMonth: false },
  ],
};

assert.equal(PRODUCTS.oneToMany.amount, 3000);
const order = createOneToManyOrderDraft(input);
assert.equal(order.product, "oneToMany");
assert.equal(order.amount, 3000);
assert.match(order.paymentId, /^woori-oneToMany-/);
assert.equal(isResultAccessToken(order.resultAccessToken), true);
assert.notEqual(order.inputSnapshot, input);
assert.equal(buildOneToManyResultUrl(order.paymentId, order.resultAccessToken), `/one-to-many/result?paymentId=${order.paymentId}#accessToken=${order.resultAccessToken}`);

const renamed = structuredClone(input);
renamed.referencePerson.displayName = "기준자 새 이름";
renamed.candidates[0].displayName = "후보 새 이름";
assert.equal(await hashOneToManyInput(input), await hashOneToManyInput(renamed), "표시 이름은 결제 입력 해시에서 제외해야 합니다.");
const changedBirth = structuredClone(input);
changedBirth.candidates[0].birthDate = "1992-10-25";
assert.notEqual(await hashOneToManyInput(input), await hashOneToManyInput(changedBirth));
const reversed = structuredClone(input);
reversed.candidates.reverse();
assert.notEqual(await hashOneToManyInput(input), await hashOneToManyInput(reversed), "후보 순서는 익명 ID·순위 연결의 일부입니다.");

const orderRoute = readFileSync("src/app/api/orders/one-to-many/route.ts", "utf8");
const reportRoute = readFileSync("src/app/api/compatibility/one-to-many/route.ts", "utf8");
const recoveryRoute = readFileSync("src/app/api/reports/one-to-many/recover/route.ts", "utf8");
const store = readFileSync("src/lib/server-report-store.ts", "utf8");
const paymentButton = readFileSync("src/components/payment-button.tsx", "utf8");
const resultClient = readFileSync("src/app/one-to-many/result/one-to-many-paid-result.tsx", "utf8");
const webhook = readFileSync("src/app/api/webhooks/portone/route.ts", "utf8");
const checkout = readFileSync("src/app/one-to-many/checkout/page.tsx", "utf8");

assert.match(orderRoute, /ONE_TO_MANY_NOW_FREE/);
assert.match(orderRoute, /status: 410/);
assert.doesNotMatch(orderRoute, /saveServerOrderDraft|createOneToManyOrderDraft/);
assert.match(checkout, /redirect\("\/one-to-many"\)/);
assert.match(paymentButton, /hashOneToManyInput/);
assert.match(paymentButton, /bindingVersion: ORDER_BINDING_VERSION/);
assert.match(reportRoute, /loadServerOrderForAccess/);
assert.match(reportRoute, /verifyPaidPayment\(paymentId, "oneToMany", input\)/);
assert.match(reportRoute, /PAYMENT_INPUT_BINDING_REQUIRED/);
assert.match(reportRoute, /claimOneToManyGeneration/);
assert.match(reportRoute, /generateOneToManyNarrative\(snapshot\)/);
assert.equal((reportRoute.match(/generateOneToManyNarrative\(snapshot\)/g) ?? []).length, 1);
assert.ok(reportRoute.indexOf("verifyPaidPayment") < reportRoute.indexOf("calculateOneToManyCompatibility(input)"));
assert.ok(reportRoute.indexOf("claimOneToManyGeneration") < reportRoute.indexOf("generateOneToManyNarrative(snapshot)"));
assert.doesNotMatch(reportRoute, /candidate\.inputSnapshot/);

assert.match(store, /generation_status/);
assert.match(store, /generation_started_at < NOW\(\) - INTERVAL '5 minutes'/);
assert.match(store, /report_json IS NULL/);
assert.match(store, /ONE_TO_MANY_STORED_REPORT_VERSION/);
assert.match(store, /snapshot: OneToManyCalculationSnapshot/);
assert.match(store, /narrative: OneToManyNarrativeContent/);
assert.match(store, /meta: OneToManyNarrativeMeta/);
assert.match(store, /access_token_hash/);
assert.match(store, /timingSafeEqual/);

assert.match(recoveryRoute, /loadOneToManyReportForAccess/);
assert.match(recoveryRoute, /private, no-store/);
assert.doesNotMatch(recoveryRoute, /export async function GET/);
assert.match(resultClient, /\/api\/reports\/one-to-many\/recover/);
assert.match(resultClient, /REPORT_GENERATION_IN_PROGRESS/);
assert.match(resultClient, /같은 결제로 다시 확인하기/);
assert.match(webhook, /claimPaymentWebhook/);
assert.match(webhook, /verifyPaidPayment/);
assert.match(webhook, /duplicate: true/);

console.log("Day 16 one-to-many paid E2E contract checks: PASS");
}

void main();
