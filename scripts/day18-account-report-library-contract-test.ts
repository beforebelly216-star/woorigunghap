import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const accountStore = readFileSync("src/lib/account-report-store.ts", "utf8");
const serverStore = readFileSync("src/lib/server-report-store.ts", "utf8");
const claimRoute = readFileSync("src/app/api/account/reports/claim/route.ts", "utf8");
const listRoute = readFileSync("src/app/api/account/reports/route.ts", "utf8");
const detailRoute = readFileSync("src/app/api/account/reports/[paymentId]/route.ts", "utf8");
const accountLink = readFileSync("src/components/report-account-link.tsx", "utf8");
const libraryPage = readFileSync("src/app/account/reports/page.tsx", "utf8");
const oneToOne = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const oneToMany = readFileSync("src/app/one-to-many/result/one-to-many-paid-result.tsx", "utf8");

assert.match(accountStore, /payment_id TEXT PRIMARY KEY/);
assert.match(accountStore, /REFERENCES woorigunghap_order_records/);
assert.match(accountStore, /REFERENCES woorigunghap_users/);
assert.match(accountStore, /WHERE woorigunghap_account_reports\.user_id = EXCLUDED\.user_id/);
assert.match(accountStore, /WHERE user_id = \$\{userId\}[\s\S]*payment_id = \$\{paymentId\}/);
assert.doesNotMatch(accountStore, /access_token_hash|resultAccessToken/);

assert.match(serverStore, /loadCompletedServerReportForAccess/);
assert.match(serverStore, /isCompleteOneToOneProgress/);
assert.match(serverStore, /parseOneToManyStoredReport/);
assert.match(serverStore, /payment_status = 'paid'/);

assert.match(claimRoute, /isSameOriginPost\(request\)/);
assert.match(claimRoute, /loadAuthenticatedRequestUser/);
assert.match(claimRoute, /loadCompletedServerReportForAccess/);
assert.match(claimRoute, /status: 409/);
assert.match(claimRoute, /private, no-store/);
assert.match(listRoute, /listAccountReports\(user\.userId\)/);
assert.match(listRoute, /status: 401/);
assert.match(detailRoute, /params: Promise<\{ paymentId: string \}>/);
assert.match(detailRoute, /loadOwnedAccountReport\(user\.userId, paymentId\)/);
assert.match(detailRoute, /status: 404/);
assert.doesNotMatch(detailRoute, /accessToken|generateOneToManyNarrative|generatePaidReport/);

assert.match(accountLink, /\/api\/account\/reports\/claim/);
assert.match(accountLink, /JSON\.stringify\(\{ paymentId, accessToken \}\)/);
assert.doesNotMatch(accountLink, /accessToken=.*href|searchParams.*accessToken/);
assert.match(libraryPage, /source: "account"/);
assert.match(libraryPage, /다시 계산하거나 AI를 다시 호출하지 않고/);
assert.match(oneToOne, /\/api\/account\/reports\/\$\{encodeURIComponent\(paymentId\)\}/);
assert.match(oneToOne, /alreadyClaimed=\{accountOwned\}/);
assert.match(oneToMany, /\/api\/account\/reports\/\$\{encodeURIComponent\(paymentId\)\}/);
assert.match(oneToMany, /alreadyClaimed=\{accountOwned\}/);

console.log("Day 18 account report library contract checks: PASS");
