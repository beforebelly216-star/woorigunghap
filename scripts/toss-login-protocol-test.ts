import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseTossLoginInput, verifyTossIdentity, type TossTransport } from "../src/lib/toss-login-protocol";

async function main() {
  for (const value of [null, {}, { userKey: 42 }, { authorizationCode: "", referrer: "DEFAULT" },
    { authorizationCode: "code", referrer: "FAKE" }, { authorizationCode: "code\n", referrer: "DEFAULT" }]) {
    assert.equal(parseTossLoginInput(value), null);
  }
  const input = parseTossLoginInput({ authorizationCode: "code", referrer: "SANDBOX", userKey: 999 })!;
  assert.deepEqual(input, { authorizationCode: "code", referrer: "SANDBOX" });
  const calls: string[] = [];
  const transport: TossTransport = async (path, body, token) => {
    calls.push(path);
    if (body) { assert.deepEqual(body, input); return { resultType: "SUCCESS", success: { accessToken: "server-token" } }; }
    assert.equal(token, "server-token");
    return { resultType: "SUCCESS", success: { userKey: 42, name: "ENCRYPTED_PII" } };
  };
  assert.deepEqual(await verifyTossIdentity(input, transport), { providerUserId: "42", displayName: null });
  assert.equal(calls.length, 2);
  await assert.rejects(verifyTossIdentity(input, async () => ({ resultType: "FAIL", success: { userKey: 42 } })));
  const deletion = readFileSync("src/app/api/account/delete/route.ts", "utf8");
  assert.match(deletion, /deleted\.provider === "kakao"\s*\? await unlinkKakaoUserByAdminKey/);
  await assert.rejects(verifyTossIdentity(input, async () => ({ resultType: "SUCCESS", success: { accessToken: "injected\r\nheader" } })));
  for (const userKey of ["42", -1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(verifyTossIdentity(input, async (_path, body) => ({ resultType: "SUCCESS", success: body ? { accessToken: "token" } : { userKey } })));
  }
  console.log("Toss login protocol: PASS");
}
void main();
