import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createOpaqueToken,
  hashOpaqueToken,
  isOpaqueToken,
  normalizeReturnTo,
  opaqueTokensMatch,
} from "../src/lib/auth-policy";

const tokens = new Set(Array.from({ length: 128 }, createOpaqueToken));
assert.equal(tokens.size, 128);
for (const token of tokens) {
  assert.equal(isOpaqueToken(token), true);
  assert.equal(hashOpaqueToken(token).length, 64);
}
const sample = [...tokens][0];
assert.equal(opaqueTokensMatch(sample, sample), true);
assert.equal(opaqueTokensMatch(sample, createOpaqueToken()), false);

assert.equal(normalizeReturnTo("/one-to-many/result?paymentId=test#secret"), "/one-to-many/result?paymentId=test");
assert.equal(normalizeReturnTo("https://evil.example"), "/");
assert.equal(normalizeReturnTo("//evil.example"), "/");
assert.equal(normalizeReturnTo("/\\evil.example"), "/");
assert.equal(normalizeReturnTo("/api/auth/kakao/callback"), "/");
assert.equal(normalizeReturnTo("/login?returnTo=%2Flogin"), "/");

const store = readFileSync("src/lib/auth-store.ts", "utf8");
const provider = readFileSync("src/lib/kakao-auth.ts", "utf8");
const start = readFileSync("src/app/api/auth/kakao/start/route.ts", "utf8");
const callback = readFileSync("src/app/api/auth/kakao/callback/route.ts", "utf8");
const session = readFileSync("src/app/api/auth/session/route.ts", "utf8");
const logout = readFileSync("src/app/api/auth/logout/route.ts", "utf8");
const loginPage = readFileSync("src/app/login/page.tsx", "utf8");

assert.match(store, /UNIQUE \(provider, provider_user_id\)/);
assert.match(store, /session_token_hash TEXT PRIMARY KEY/);
assert.match(store, /hashOpaqueToken\(sessionToken\)/);
assert.doesNotMatch(store, /access_token|refresh_token/);
assert.match(provider, /https:\/\/kauth\.kakao\.com\/oauth\/authorize/);
assert.match(provider, /https:\/\/kauth\.kakao\.com\/oauth\/token/);
assert.match(provider, /https:\/\/kapi\.kakao\.com\/v2\/user\/me/);
assert.doesNotMatch(provider, /account_email|phone_number|birthyear|birthday|gender/);
assert.match(start, /httpOnly: true/);
assert.match(start, /sameSite: "lax"/);
assert.match(callback, /opaqueTokensMatch\(state, expectedState\)/);
assert.match(callback, /exchangeKakaoAuthorizationCode/);
assert.match(callback, /retrieveKakaoIdentity/);
assert.match(callback, /createDatabaseSession/);
assert.match(callback, /priority: "high"/);
assert.match(session, /private, no-store/);
assert.doesNotMatch(session, /providerUserId|provider_user_id/);
assert.match(logout, /isSameOriginPost/);
assert.match(loginPage, /로그인하지 않아도 결제와 결과 확인은 그대로 이용/);

console.log("Day 17 Kakao auth contract checks: PASS");
