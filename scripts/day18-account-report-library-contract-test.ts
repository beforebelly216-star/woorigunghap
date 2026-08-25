import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const accountStore = readFileSync("src/lib/account-report-store.ts", "utf8");
const serverStore = readFileSync("src/lib/server-report-store.ts", "utf8");
const claimRoute = readFileSync("src/app/api/account/reports/claim/route.ts", "utf8");
const listRoute = readFileSync("src/app/api/account/reports/route.ts", "utf8");
const detailRoute = readFileSync("src/app/api/account/reports/[paymentId]/route.ts", "utf8");
const accountLink = readFileSync("src/components/report-account-link.tsx", "utf8");
const accountDeletion = readFileSync("src/components/account-deletion-panel.tsx", "utf8");
const libraryPage = readFileSync("src/app/account/reports/page.tsx", "utf8");
const loginPage = readFileSync("src/app/login/page.tsx", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");
const accountCss = readFileSync("src/app/account-foundation.css", "utf8");
const mobileCss = readFileSync("src/app/day20-mobile.css", "utf8");
const oneToOne = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const oneToMany = readFileSync("src/app/one-to-many/result/one-to-many-paid-result.tsx", "utf8");
const orderStorage = readFileSync("src/lib/order-storage.ts", "utf8");
const progressStorage = readFileSync("src/lib/report-progress-storage.ts", "utf8");

assert.match(accountStore, /payment_id TEXT PRIMARY KEY/);
assert.match(accountStore, /REFERENCES woorigunghap_order_records/);
assert.match(accountStore, /REFERENCES woorigunghap_users/);
assert.match(accountStore, /WHERE woorigunghap_account_reports\.user_id = EXCLUDED\.user_id/);
assert.match(accountStore, /WHERE user_id = \$\{userId\}[\s\S]*payment_id = \$\{paymentId\}/);

// Claim/list/detail must never expose recovery tokens. Day 22 deletion is allowed to null the hash internally.
const claimSection = accountStore.slice(accountStore.indexOf("export async function claimAccountReport"), accountStore.indexOf("export async function deleteOwnedAccountReport"));
assert.doesNotMatch(claimSection, /access_token_hash|resultAccessToken/);
assert.match(accountStore, /access_token_hash = NULL/);
assert.match(accountStore, /export async function deleteOwnedAccountReport/);
assert.match(accountStore, /generation_status = 'deleted'/);
assert.match(accountStore, /retainedFor[\s\S]*electronic-commerce-record/);

assert.match(serverStore, /loadCompletedServerReportForAccess/);
assert.match(serverStore, /isCompleteOneToOneProgress/);
assert.match(serverStore, /parseOneToManyStoredReport/);
assert.match(serverStore, /payment_status = 'paid'/);
assert.match(serverStore, /generation_status <> 'deleted'/);
assert.match(serverStore, /generation_status = 'deleted'[\s\S]*access_token_hash[\s\S]*NULL/);
assert.match(accountStore, /payment_status = 'paid'[\s\S]*generation_status <> 'deleted'/);

assert.match(claimRoute, /isSameOriginPost\(request\)/);
assert.match(claimRoute, /loadAuthenticatedRequestUser/);
// A paid order may be claimed before its report is complete, but the original access token is still required.
assert.match(claimRoute, /loadServerReportForAccess\(paymentId, accessToken\)/);
assert.match(claimRoute, /status: 409/);
assert.match(claimRoute, /private, no-store/);
assert.match(listRoute, /listAccountReports\(user\.userId\)/);
assert.match(listRoute, /status: 401/);
assert.match(detailRoute, /params: Promise<\{ paymentId: string \}>/);
assert.match(detailRoute, /loadOwnedAccountReport\(user\.userId, paymentId\)/);
assert.match(detailRoute, /status: 404/);
assert.doesNotMatch(detailRoute, /accessToken|generateOneToManyNarrative|generatePaidReport/);
assert.match(detailRoute, /export async function DELETE/);
assert.match(detailRoute, /isSameOriginPost\(request\)/);
assert.match(detailRoute, /loadOwnedAccountReport\(user\.userId, paymentId\)/);
assert.match(detailRoute, /deleteOwnedAccountReport\(user\.userId, paymentId\)/);

assert.match(accountLink, /\/api\/account\/reports\/claim/);
assert.match(accountLink, /JSON\.stringify\(\{ paymentId, accessToken \}\)/);
assert.doesNotMatch(accountLink, /accessToken=.*href|searchParams.*accessToken/);
assert.match(libraryPage, /source: "account"/);
assert.match(libraryPage, /결제 완료 즉시 보관함에 저장되고/);
assert.match(libraryPage, />생성중</);
assert.match(libraryPage, /결과 삭제/);
assert.match(libraryPage, /method: "DELETE"/);
assert.match(libraryPage, /removeOrderDraft\(report\.paymentId\)/);
assert.match(libraryPage, /removeReportProgress\(report\.paymentId, report\.createdAt\)/);
assert.match(loginPage, /normalizeReturnTo/);
assert.match(loginPage, /카카오로 계속하기/);
assert.match(loginPage, /이메일·전화번호·생년정보는 요청하지 않습니다/);
assert.match(accountDeletion, /aria-expanded=\{open\}/);
assert.match(accountDeletion, /aria-controls="account-delete-details"/);
assert.match(accountDeletion, /confirmation !== "탈퇴"/);
assert.match(accountDeletion, /\/api\/account\/delete/);

// Foundation v2 owns account surfaces after legacy CSS.
assert.match(layout, /account-foundation\.css/);
assert.match(accountCss, /var\(--saju-width-compact\)/);
assert.match(accountCss, /width: min\(100%, 760px\)/);
assert.match(accountCss, /\.account-save-panel/);
assert.match(accountCss, /\.account-delete-box/);
assert.match(accountCss, /box-shadow: none/);
assert.match(accountCss, /@media \(max-width: 640px\)/);
assert.doesNotMatch(accountCss, /linear-gradient|radial-gradient|99999px/);
assert.doesNotMatch(mobileCss, /library-notification-panel|library-notification-form|library-notification-enabled/);
const broadMobile = mobileCss.slice(mobileCss.indexOf("@media (max-width: 99999px)"));
assert.doesNotMatch(broadMobile, /\.library-page\s*\{/);

assert.match(orderStorage, /export function removeOrderDraft/);
assert.match(progressStorage, /export function removeReportProgress/);
assert.match(oneToOne, /\/api\/account\/reports\/\$\{encodeURIComponent\(paymentId\)\}/);
assert.match(oneToOne, /alreadyClaimed=\{accountOwned\}/);
assert.match(oneToMany, /\/api\/account\/reports\/\$\{encodeURIComponent\(paymentId\)\}/);
assert.match(oneToMany, /alreadyClaimed=\{accountOwned\}/);

console.log("Day 18 account report library + Foundation v2 UI contract checks: PASS");
