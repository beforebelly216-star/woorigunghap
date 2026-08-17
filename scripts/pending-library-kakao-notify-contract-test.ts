import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const accountStore = readFileSync("src/lib/account-report-store.ts", "utf8");
const accountApi = readFileSync("src/app/api/account/reports/route.ts", "utf8");
const accountClaim = readFileSync("src/app/api/account/reports/claim/route.ts", "utf8");
const accountPage = readFileSync("src/app/account/reports/page.tsx", "utf8");
const verify = readFileSync("src/app/api/payments/verify/route.ts", "utf8");
const redirect = readFileSync("src/app/payment/redirect/page.tsx", "utf8");
const kickoff = readFileSync("src/lib/background-report-kickoff.ts", "utf8");
const kakaoAuth = readFileSync("src/lib/kakao-auth.ts", "utf8");
const kakaoStart = readFileSync("src/app/api/auth/kakao/start/route.ts", "utf8");
const kakaoCallback = readFileSync("src/app/api/auth/kakao/callback/route.ts", "utf8");
const tokenStore = readFileSync("src/lib/kakao-token-store.ts", "utf8");
const notification = readFileSync("src/lib/report-completion-notification.ts", "utf8");
const oneToOne = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
const oneToMany = readFileSync("src/app/api/compatibility/one-to-many/route.ts", "utf8");

// Paid orders can be claimed/listed before report_json is complete.
assert.doesNotMatch(accountStore, /payment_status = 'paid'\s+AND report_json IS NOT NULL/);
assert.match(accountStore, /status: "generating" \| "ready"/);
assert.match(accountStore, /completed \? "ready" : "generating"/);
assert.match(accountClaim, /loadServerReportForAccess/);
assert.match(accountPage, />생성중</);
assert.match(accountPage, /setTimeout\(load, 4_000\)/);

// Payment verification owns the handoff: auto-claim first, then response-lifetime background work.
assert.match(verify, /claimAccountReport\(user\.userId, paymentId, verified\.product\)/);
assert.match(verify, /after\(async \(\) =>/);
assert.match(verify, /kickOffPaidReportGeneration/);
assert.match(redirect, /accessToken: order\?\.resultAccessToken/);
assert.match(redirect, /input: order\?\.inputSnapshot/);
assert.match(kickoff, /\["prepare", "intro", "dynamics", "action"\]/);
assert.match(kickoff, /REPORT_GENERATION_IN_PROGRESS/);

// Kakao messaging is explicit opt-in and tokens are encrypted server-side.
assert.match(kakaoStart, /\["talk_message"\]/);
assert.match(kakaoCallback, /tokenBundle\.scopes\.includes\("talk_message"\)/);
assert.match(tokenStore, /aes-256-gcm/);
assert.match(tokenStore, /KAKAO_TOKEN_ENCRYPTION_KEY/);
assert.match(kakaoAuth, /\/v2\/api\/talk\/memo\/default\/send/);
assert.match(accountApi, /kakaoNotifyEnabled/);
assert.match(accountPage, /완료 알림 받기/);

// Completion notification is one-per-payment and only after a complete stored report exists.
assert.match(notification, /payment_id TEXT PRIMARY KEY/);
assert.match(notification, /loadCompletedServerReport\(paymentId\)/);
assert.match(notification, /finishNotification\(paymentId, "sent"\)/);
assert.match(oneToOne, /segment === "action".*notifyReportCompleted/s);
assert.match(oneToMany, /saveOneToManyStoredReport[\s\S]*notifyReportCompleted/);

console.log("Pending-library + Kakao notification contract checks: PASS");
