import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = readFileSync("src/lib/server-report-store.ts", "utf8");
const orderRoute = readFileSync("src/app/api/orders/one-to-one/route.ts", "utf8");
const environment = readFileSync(".env.example", "utf8");

assert.match(store, /import "server-only"/);
assert.match(store, /@neondatabase\/serverless/);
assert.match(store, /DATABASE_URL/);
assert.match(store, /CREATE TABLE IF NOT EXISTS woorigunghap_order_records/);
assert.match(store, /payment_id TEXT PRIMARY KEY/);
assert.match(store, /report_json TEXT/);
assert.match(store, /saveServerReportPrepared/);
assert.match(store, /saveServerReportSegment/);
assert.match(store, /markServerOrderPaid/);
assert.match(store, /hasServerOrder/);
assert.doesNotMatch(store, /NEXT_PUBLIC_DATABASE_URL/);
assert.match(orderRoute, /validateOneToOneReportInput/);
assert.match(orderRoute, /saveServerOrderDraft/);
assert.doesNotMatch(orderRoute, /export async function GET/);
assert.match(environment, /^DATABASE_URL=/m);

const reportRoute = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
assert.match(reportRoute, /verifyPaidPayment\(paymentId, "oneToOne", input\)/);
assert.match(reportRoute, /loadServerReportProgress/);
assert.match(reportRoute, /saveServerReportSegment/);

console.log("Day 11 server storage contract checks: PASS");
