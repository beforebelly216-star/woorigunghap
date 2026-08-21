import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const accountStore = readFileSync("src/lib/account-report-store.ts", "utf8");
const accountApi = readFileSync("src/app/api/account/reports/route.ts", "utf8");
const accountClaim = readFileSync("src/app/api/account/reports/claim/route.ts", "utf8");
const accountPage = readFileSync("src/app/account/reports/page.tsx", "utf8");
const channelNotifyApi = readFileSync("src/app/api/account/notifications/kakao-channel/route.ts", "utf8");
const channelStore = readFileSync("src/lib/kakao-channel-notification-store.ts", "utf8");
const solapi = readFileSync("src/lib/solapi-alimtalk.ts", "utf8");
const mobileCss = readFileSync("src/app/day20-mobile.css", "utf8");
const privacy = readFileSync("src/app/privacy/page.tsx", "utf8");
const verify = readFileSync("src/app/api/payments/verify/route.ts", "utf8");
const redirect = readFileSync("src/app/payment/redirect/page.tsx", "utf8");
const kickoff = readFileSync("src/lib/background-report-kickoff.ts", "utf8");
const serverStore = readFileSync("src/lib/server-report-store.ts", "utf8");
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
// then independent AI segments fan out in parallel.
assert.match(verify, /claimAccountReport\(user\.userId, paymentId, verified\.product\)/);
assert.match(verify, /after\(async \(\) =>/);
assert.match(verify, /kickOffPaidReportGeneration/);
assert.match(redirect, /accessToken: order\?\.resultAccessToken/);
assert.match(redirect, /input: order\?\.inputSnapshot/);
assert.match(kickoff, /const ONE_TO_ONE_SEGMENTS = \["intro", "dynamics", "action"\]/);
assert.match(kickoff, /phase: "prepare"/);
assert.match(kickoff, /Promise\.all\(ONE_TO_ONE_SEGMENTS\.map/);
assert.match(kickoff, /completed\.every\(Boolean\)/);

// Parallel segment writes merge instead of replacing sibling writes.
assert.match(serverStore, /export async function saveServerReportSegment/);
assert.match(serverStore, /jsonb_set\(/);
assert.match(serverStore, /ARRAY\['segments', \$\{segment\}\]::text\[\]/);
assert.match(serverStore, /ARRAY\['metas', \$\{segment\}\]::text\[\]/);

// Paid report length stays aligned to the product contract.
assert.match(reportV7, /paid-report-v7-editorial-v12-persona-inner-mind/);
assert.match(reportV7, /compactLength\(value\) < 1200/);
assert.match(reportV7, /compactLength\(value\) < 2200/);
assert.match(reportV7, /전체 리포트는 5,000~8,000자 수준을 목표/);
assert.match(anthropicSampleQa, /totalCharacters >= 5_000/);
assert.match(anthropicSampleQa, /totalCharacters <= 10_000/);
assert.doesNotMatch(anthropicSampleQa, /totalCharacters >= 13_000/);

// Completion notifications use KakaoTalk Channel Alimtalk, not the OAuth "My Chatroom" memo API.
assert.match(solapi, /https:\/\/api\.solapi\.com\/messages\/v4\/send-many\/detail/);
assert.match(solapi, /SOLAPI_API_KEY/);
assert.match(solapi, /SOLAPI_API_SECRET/);
assert.match(solapi, /SOLAPI_KAKAO_PF_ID/);
assert.match(solapi, /SOLAPI_KAKAO_TEMPLATE_ID/);
assert.match(solapi, /createHmac\("sha256"/);
assert.match(solapi, /type: "ATA"/);
assert.match(solapi, /disableSms: true/);
assert.match(solapi, /allowDuplicates: false/);
assert.match(notification, /woorigunghap_channel_notifications/);
assert.match(notification, /loadKakaoChannelNotificationTarget/);
assert.match(notification, /sendKakaoChannelReportCompleted/);
assert.doesNotMatch(notification, /sendKakaoMemo/);
assert.doesNotMatch(notification, /loadKakaoMessagingTokens/);

// Recipient phone numbers are opt-in, validated and encrypted at rest.
assert.match(channelStore, /aes-256-gcm/);
assert.match(channelStore, /KAKAO_TOKEN_ENCRYPTION_KEY/);
assert.match(channelStore, /\^010\\d\{8\}\$/);
assert.match(channelStore, /kakao_channel_phone_ciphertext/);
assert.match(channelStore, /kakao_channel_notify_enabled/);
assert.match(channelStore, /kakao_channel_notify_consented_at/);
assert.match(channelStore, /disableKakaoChannelNotification/);
assert.match(channelNotifyApi, /payload\?\.consent !== true/);
assert.match(channelNotifyApi, /saveKakaoChannelNotificationTarget/);
assert.match(channelNotifyApi, /disableKakaoChannelNotification/);
assert.match(accountApi, /kakaoChannelNotifyEnabled/);
assert.match(accountApi, /kakaoChannelNotifyPhoneMasked/);
assert.match(accountApi, /kakaoChannelNotifyConfigured/);
assert.match(accountPage, /카카오톡 채널 완료 알림/);
assert.match(accountPage, /type="tel"/);
assert.match(accountPage, /채널 알림 받기/);
assert.match(accountPage, /휴대전화 번호를 암호화 저장/);
assert.match(accountPage, /알림 해제/);
assert.match(mobileCss, /\.library-notification-form/);
assert.match(privacy, /선택 완료 알림/);
assert.match(privacy, /SOLAPI/);

// Completion notification remains one-per-payment and only after a complete stored report exists.
assert.match(notification, /payment_id TEXT PRIMARY KEY/);
assert.match(notification, /loadCompletedServerReport\(paymentId\)/);
assert.match(notification, /finishNotification\(paymentId, "sent"\)/);
assert.match(kickoff, /notifyReportCompleted\(paymentId\)/);
assert.match(oneToOne, /segment === "action"[\s\S]*notifyReportCompleted/);
assert.match(oneToMany, /saveOneToManyStoredReport[\s\S]*notifyReportCompleted/);

console.log("Pending-library + Kakao Channel Alimtalk contract checks: PASS");
