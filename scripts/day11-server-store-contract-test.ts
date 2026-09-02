import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildOneToOneResultUrl,
  createResultAccessToken,
  isResultAccessToken,
} from "../src/lib/result-access-token";

const store = readFileSync("src/lib/server-report-store.ts", "utf8");
const orderRoute = readFileSync("src/app/api/orders/one-to-one/route.ts", "utf8");
const reportRoute = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
const recoveryRoute = readFileSync("src/app/api/reports/one-to-one/recover/route.ts", "utf8");
const resultPage = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const accessToken = readFileSync("src/lib/result-access-token.ts", "utf8");
const environment = readFileSync(".env.example", "utf8");

assert.match(store, /import "server-only"/);
assert.match(store, /@neondatabase\/serverless/);
assert.match(store, /DATABASE_URL/);
assert.match(store, /CREATE TABLE IF NOT EXISTS woorigunghap_order_records/);
assert.match(store, /payment_id TEXT PRIMARY KEY/);
assert.match(store, /report_json TEXT/);
assert.match(store, /access_token_hash TEXT/);
assert.match(store, /createHash\("sha256"\)/);
assert.match(store, /stripAccessToken/);
assert.match(store, /timingSafeEqual/);
assert.match(store, /loadServerOrderForAccess/);
assert.match(store, /loadServerReportForAccess/);
assert.match(store, /saveServerReportPrepared/);
assert.match(store, /saveServerReportSegment/);
assert.match(store, /markServerOrderPaid/);
assert.match(store, /export async function markServerOrderPaid[\s\S]*RETURNING payment_id[\s\S]*return rows\.length === 1/);
assert.match(store, /hasServerOrder/);
assert.match(store, /access_token_hash IS NULL/);
assert.doesNotMatch(store, /NEXT_PUBLIC_DATABASE_URL/);

assert.match(orderRoute, /validateOneToOneReportInput/);
assert.match(orderRoute, /saveServerOrderDraft/);
assert.match(orderRoute, /if \(!persisted\)/);
assert.match(orderRoute, /status: 503/);
assert.doesNotMatch(orderRoute, /export async function GET/);
assert.match(environment, /^DATABASE_URL=/m);

assert.match(reportRoute, /verifyPaidPayment\(paymentId, "oneToOne", input\)/);
assert.match(reportRoute, /isResultAccessToken/);
assert.match(reportRoute, /loadServerOrderForAccess\(paymentId, accessToken, "oneToOne"\)/);
assert.match(reportRoute, /RESULT_ACCESS_DENIED/);
assert.match(reportRoute, /loadResumableOwnedOneToOneReport/);
assert.match(reportRoute, /SERVER_ORDER_PAID_STATE_MISSING/);
assert.doesNotMatch(reportRoute, /ensureServerOrderAccessToken/);
assert.match(reportRoute, /loadServerReportProgress/);
assert.match(reportRoute, /saveServerReportSegment/);
assert.match(recoveryRoute, /export async function POST/);
assert.doesNotMatch(recoveryRoute, /export async function GET/);
assert.match(recoveryRoute, /private, no-store/);
assert.match(recoveryRoute, /loadServerReportForAccess/);
assert.match(resultPage, /window\.location\.hash/);
assert.match(resultPage, /\/api\/reports\/one-to-one\/recover/);
assert.match(resultPage, /accessToken: draft\.resultAccessToken/);
assert.match(accessToken, /new Uint8Array\(32\)/);
assert.match(accessToken, /#\$\{/);

const generatedTokens = new Set(Array.from({ length: 128 }, createResultAccessToken));
assert.equal(generatedTokens.size, 128);
for (const token of generatedTokens) assert.equal(isResultAccessToken(token), true);
const sampleToken = generatedTokens.values().next().value;
assert.ok(sampleToken);
assert.equal(
  buildOneToOneResultUrl("woori-oneToOne-test", sampleToken),
  `/one-to-one/result?paymentId=woori-oneToOne-test#accessToken=${sampleToken}`,
);

console.log("Day 11 server storage contract checks: PASS");
