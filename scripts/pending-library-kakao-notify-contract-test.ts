import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const accountStore = readFileSync("src/lib/account-report-store.ts", "utf8");
const accountApi = readFileSync("src/app/api/account/reports/route.ts", "utf8");
const accountClaim = readFileSync("src/app/api/account/reports/claim/route.ts", "utf8");
const accountPage = readFileSync("src/app/account/reports/page.tsx", "utf8");
const mobileCss = readFileSync("src/app/day20-mobile.css", "utf8");
const verify = readFileSync("src/app/api/payments/verify/route.ts", "utf8");
const redirect = readFileSync("src/app/payment/redirect/page.tsx", "utf8");
const kickoff = readFileSync("src/lib/background-report-kickoff.ts", "utf8");
const serverStore = readFileSync("src/lib/server-report-store.ts", "utf8");
const authPolicy = readFileSync("src/lib/auth-policy.ts", "utf8");
const kakaoAuth = readFileSync("src/lib/kakao-auth.ts", "utf8");
const kakaoStart = readFileSync("src/app/api/auth/kakao/start/route.ts", "utf8");
const kakaoCallback = readFileSync("src/app/api/auth/kakao/callback/route.ts", "utf8");
const tokenStore = readFileSync("src/lib/kakao-token-store.ts", "utf8");
const notification = readFileSync("src/lib/report-completion-notification.ts", "utf8");
const oneToOne = readFileSync("src/app/api/compatibility/one-to-one/route.ts", "utf8");
const oneToMany = readFileSync("src/app/api/compatibility/one-to-many/route.ts", "utf8");
const reportV7 = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
const anthropicSampleQa = readFileSync("scripts/one-to-one-anthropic-sample-qa.ts", "utf8");

// Paid orders can be claimed/listed before report_json is complete.
assert.doesNotMatch(accountStore, /payment_status = 'paid'\s+AND report_json IS NOT NULL/);
assert.match(accountStore, /status: "generating" \| "ready"/);
assert.match(accountStore, /completed \? "ready" : "generating"/);
assert.match(accountClaim, /loadServerReportForAccess/);
assert.match(accountPage, />생성중</);
assert.match(accountPage, /setTimeout\(load, 4_000\)/);

// The library can re-kick a stalled paid order when the same browser still owns its recovery key.
assert.match(accountPage, /loadOrderDraft/);
assert.match(accountPage, /GENERATION_RESUME_INTERVAL_MS = 120_000/);
assert.match(accountPage, /fetch\("\/api\/payments\/verify"/);
assert.match(accountPage, /order\.resultAccessToken/);
assert.match(accountPage, /order\.inputSnapshot/);

// Payment verification owns the server handoff. One-to-one preparation runs first,
// then independent AI segments fan out in parallel so one function lifetime does not
// accumulate three long Anthropic calls.
assert.match(verify, /claimAccountReport\(user\.userId, paymentId, verified\.product\)/);
assert.match(verify, /after\(async \(\) =>/);
assert.match(verify, /kickOffPaidReportGeneration/);
assert.match(redirect, /accessToken: order\?\.resultAccessToken/);
assert.match(redirect, /input: order\?\.inputSnapshot/);
assert.match(kickoff, /const ONE_TO_ONE_SEGMENTS = \["intro", "dynamics", "action"\]/);
assert.match(kickoff, /phase: "prepare"/);
assert.match(kickoff, /Promise\.all\(ONE_TO_ONE_SEGMENTS\.map/);
assert.match(kickoff, /completed\.every\(Boolean\)/);
assert.match(kickoff, /REPORT_GENERATION_IN_PROGRESS/);

// Parallel segment writes must merge into report_json instead of replacing sibling writes.
assert.match(serverStore, /export async function saveServerReportSegment/);
assert.match(serverStore, /jsonb_set\(/);
assert.match(serverStore, /COALESCE\(NULLIF\(report_json, ''\)/);
assert.match(serverStore, /ARRAY\['segments', \$\{segment\}\]::text\[\]/);
assert.match(serverStore, /ARRAY\['metas', \$\{segment\}\]::text\[\]/);

// The paid report stays structurally rich but its generation contract must match the
// product decision of roughly 5k-8k characters instead of drifting back to 13k+.
assert.match(reportV7, /paid-report-v7-editorial-v10-latency-balanced/);
assert.match(reportV7, /compactLength\(value\) < 1200/);
assert.match(reportV7, /compactLength\(value\) < 2200/);
assert.match(reportV7, /전체 리포트는 5,000~8,000자 수준을 목표/);
assert.match(anthropicSampleQa, /totalCharacters >= 5_000/);
assert.match(anthropicSampleQa, /totalCharacters <= 10_000/);
assert.doesNotMatch(anthropicSampleQa, /totalCharacters >= 13_000/);

// Kakao messaging is explicit opt-in and tokens are encrypted server-side.
assert.match(kakaoStart, /\["talk_message"\]/);
assert.match(authPolicy, /KAKAO_NOTIFY_INTENT_COOKIE/);
assert.match(kakaoStart, /KAKAO_NOTIFY_INTENT_COOKIE/);
assert.match(kakaoStart, /wantsMessageNotification \? "1" : "0"/);
assert.match(kakaoCallback, /KAKAO_NOTIFY_INTENT_COOKIE/);
assert.match(kakaoCallback, /saveKakaoTokenBundle\(userId, tokenBundle\)/);
assert.match(kakaoCallback, /isKakaoMessageEnabled\(userId\)/);
assert.match(kakaoCallback, /notificationResult = enabled \? "enabled" : "failed"/);
assert.match(kakaoCallback, /searchParams\.set\("notify", notificationResult\)/);
assert.doesNotMatch(kakaoCallback, /tokenBundle\.scopes\.includes\("talk_message"\)/);
assert.match(tokenStore, /aes-256-gcm/);
assert.match(tokenStore, /KAKAO_TOKEN_ENCRYPTION_KEY/);
assert.match(kakaoAuth, /\/v2\/api\/talk\/memo\/default\/send/);
assert.match(accountApi, /kakaoNotifyEnabled/);
assert.match(accountPage, /완료 알림 받기/);
assert.match(accountPage, /notifyResult === "failed"/);
assert.match(accountPage, /완료 알림이 활성화되었습니다/);
assert.match(mobileCss, /\.library-notification-panel\s*\{/);
assert.match(mobileCss, /\.library-notification-panel[\s\S]*gap: 20px/);

// Completion notification is one-per-payment and only after a complete stored report exists.
assert.match(notification, /payment_id TEXT PRIMARY KEY/);
assert.match(notification, /loadCompletedServerReport\(paymentId\)/);
assert.match(notification, /finishNotification\(paymentId, "sent"\)/);
assert.match(kickoff, /notifyReportCompleted\(paymentId\)/);
assert.match(oneToOne, /segment === "action"[\s\S]*notifyReportCompleted/);
assert.match(oneToMany, /saveOneToManyStoredReport[\s\S]*notifyReportCompleted/);

console.log("Pending-library + Kakao notification contract checks: PASS");
