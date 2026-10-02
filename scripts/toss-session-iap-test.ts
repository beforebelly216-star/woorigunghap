import assert from "node:assert/strict";
import { allowedTossOrigins, parseTossBearer, isTossBrowserApi, tossCorsHeaders } from "../src/lib/toss-session-policy";
import { parseVerifiedTossOrder } from "../src/lib/toss-iap-protocol";

const origins = allowedTossOrigins("woorisajoo");
assert.deepEqual(origins, ["https://woorisajoo.apps.tossmini.com", "https://woorisajoo.private-apps.tossmini.com"]);
assert.deepEqual(allowedTossOrigins("evil.example/"), []);
assert.equal(origins.includes("https://woorisajoo.apps.tossmini.com.evil.example"), false);
assert.equal(origins.includes("http://127.0.0.1:5173"), false);
assert.equal(isTossBrowserApi("/api/auth/kakao/start"), false);
assert.equal(isTossBrowserApi("/api/auth/toss/unlink"), false);
assert.equal(isTossBrowserApi("/api/account/delete"), false);
assert.equal(parseTossBearer(`Bearer ${"a".repeat(64)}`), "a".repeat(64));
for (const candidate of [null, "Basic token", "Bearer userKey:42", `Bearer ${"a".repeat(64)} extra`]) assert.equal(parseTossBearer(candidate), null);
assert.equal(tossCorsHeaders(origins[0])["Access-Control-Allow-Origin"], origins[0]);
const orderId = "13c9a1ff-2baa-7495-bbfa-a0826ba8c7c0";
for (const status of ["PAYMENT_COMPLETED", "PURCHASED"]) {
  assert.equal(parseVerifiedTossOrder({ resultType: "SUCCESS", success: { orderId, sku: "sku", status } }, orderId, "sku").status, status);
}
for (const status of ["REFUNDED", "FAILED", "NOT_FOUND", "ORDER_IN_PROGRESS", "MINIAPP_MISMATCH"]) {
  assert.throws(() => parseVerifiedTossOrder({ resultType: "SUCCESS", success: { orderId, sku: "sku", status } }, orderId, "sku"));
}
assert.throws(() => parseVerifiedTossOrder({ resultType: "SUCCESS", success: { orderId: "other", sku: "sku", status: "PURCHASED" } }, orderId, "sku"));
assert.throws(() => parseVerifiedTossOrder({ resultType: "FAIL", success: { orderId, sku: "sku", status: "PURCHASED" } }, orderId, "sku"));
assert.throws(() => parseVerifiedTossOrder({ resultType: "SUCCESS", success: { orderId, sku: "other", status: "PURCHASED" } }, orderId, "sku"));
console.log("Toss origin/session/IAP verification: PASS");
