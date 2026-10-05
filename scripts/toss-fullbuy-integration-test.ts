import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { createFullbuyStore, type FullbuyDatabase } from "../src/lib/fullbuy-store-core";
import { createTossIapGrantHandler } from "../src/lib/toss-iap-grant-handler";
import { createTossAiBudget } from "../src/lib/toss-ai-budget-core";
import { calculateTossBasicResult, TOSS_BASIC_SAMPLE_INPUT } from "../src/lib/toss-basic-result";
import { tossShortPayload, parseTossShortNarrative, generateTossShortNarrative } from "../src/lib/toss-short-narrative";
import { generateFullbuyChapter } from "../src/lib/fullbuy-chapter-service";
import type { FullbuySnapshot } from "../src/lib/fullbuy-contract";
import { createTossNetworkStore } from "../src/lib/toss-network-core";
import { createTossChapterHandler } from "../src/lib/toss-chapter-handler";
import { tossChapterCompletionGuards } from "../src/lib/toss-chapter-guards";
import { fullbuyChapterKey } from "../src/lib/fullbuy-contract";
import { randomUUID } from "node:crypto";

async function main() {
  const pg = await PGlite.create();
  const db: FullbuyDatabase = {
    query: async ({ text, values }) => (await pg.query<Record<string, unknown>>(text, values)).rows,
    transaction: statements => pg.transaction(async tx => {
      const rows = []; for (const { text, values } of statements) rows.push((await tx.query<Record<string, unknown>>(text, values)).rows); return rows;
    }),
  };
  const store = createFullbuyStore(db);
  const orderId = "13c9a1ff-2baa-7495-bbfa-a0826ba8c7c0";
  const userKey = "verified-user";
  let provider = "toss", userId = "u1", enabled = true, status = "PAYMENT_COMPLETED", returnedSku = "sku", providerCalls = 0;
  const handler = createTossIapGrantHandler({
    authenticate: async () => ({ userId, provider, providerUserId: userKey }), allowedOrigin: value => value === "https://woorisajoo.apps.tossmini.com",
    configuration: () => enabled ? { sku: "sku", amount: 9 } : null, store: () => store,
    verify: async (id, key) => { providerCalls++; assert.equal(key, userKey); return { resultType: "SUCCESS", success: { orderId: id, sku: returnedSku, status } }; },
  });
  const req = (body: unknown = { orderId, sku: "sku", userKey: "forged", amount: 3000 }, origin = "https://woorisajoo.apps.tossmini.com") => new NextRequest("https://api.example/api/toss/iap/grant", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
  assert.equal((await handler(req(undefined, "https://evil.example"))).status, 403);
  provider = "kakao"; assert.equal((await handler(req())).status, 401); provider = "toss";
  enabled = false; assert.equal((await handler(req())).status, 503); enabled = true;
  assert.equal(providerCalls, 0);
  assert.equal((await handler(req({ orderId, sku: "other" }))).status, 400);
  assert.equal((await handler(req({ orderId, sku: "sku", extra: "x".repeat(3000) }))).status, 400);
  for (const invalid of ["REFUNDED", "NOT_FOUND", "ORDER_IN_PROGRESS", "FAILED", "MINIAPP_MISMATCH"]) {
    status = invalid; assert.equal((await handler(req())).status, 409); assert.equal((await store.wallet("u1")).balance, 0);
  }
  status = "PAYMENT_COMPLETED"; returnedSku = "other"; assert.equal((await handler(req())).status, 409); returnedSku = "sku";
  const responses = await Promise.all(Array.from({ length: 8 }, () => handler(req())));
  for (const response of responses) assert.equal((await response.json()).productGranted, true);
  assert.equal((await store.wallet("u1")).balance, 9);
  status = "PURCHASED"; assert.equal((await handler(req())).status, 200);
  userId = "u2"; assert.equal((await handler(req())).status, 409); assert.equal((await store.wallet("u2")).balance, 0); userId = "u1";

  const budget = createTossAiBudget(db, { user: 2, global: 3 });
  const attempts = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => budget.reserve("u1", `attempt-${i}`)));
  assert.equal(attempts.filter(item => item.status === "fulfilled").length, 2);
  await assert.rejects(budget.reserve("u1", "attempt-0"));
  await budget.reserve("u2", "attempt-other"); await assert.rejects(budget.reserve("u3", "attempt-over"));
  await assert.rejects(budget.record("u3", "attempt-other", { inputTokens: 100, outputTokens: 50 }));
  await budget.record("u2", "attempt-other", { inputTokens: 100, outputTokens: 50 });
  await assert.rejects(budget.record("u2", "attempt-other", { inputTokens: 100, outputTokens: 50 }));

  const result = calculateTossBasicResult(TOSS_BASIC_SAMPLE_INPUT);
  const payload = JSON.stringify(tossShortPayload(result, "conversation"));
  for (const privateValue of ["하늘", "바다", "1990-05-15", "1992-10-24", "birthDate", "names", "networkId"]) assert.equal(payload.includes(privateValue), false);
  const valid = { title: "대화를 함께 맞춰보기", paragraphs: [
    "계산 지표를 보면 서로 대화하는 방식에서 편안한 부분을 찾아볼 수 있습니다. 실제로 같은 느낌인지 평소 즐거웠던 대화의 상황을 함께 떠올리고 서로 확인해 보세요.",
    "맞춰볼 부분은 갈등이 일어날 것이라는 뜻이 아닙니다. 말하고 싶은 순간과 잠시 쉬고 싶은 순간이 달랐는지 이야기하고, 다음 대화에서 함께 시도할 방법을 정해보세요."],
    action: "서로 편안했던 대화 한 가지를 나누고, 다음에는 어떤 방식으로 이야기를 시작하면 좋을지 함께 정해보세요.",
    evidenceIds: result.dimensions.slice(0, 2).map(item => item.id) };
  const content = JSON.stringify(valid); assert.deepEqual(parseTossShortNarrative(content, result), valid);
  for (const bad of [{ ...valid, title: "성공 확률 100%" }, { ...valid, evidenceIds: ["fake", "fake"] },
    { ...valid, paragraphs: [valid.paragraphs[0], valid.paragraphs[0]] }, { ...valid, extra: true }]) assert.throws(() => parseTossShortNarrative(JSON.stringify(bad), result));
  let reason = "end_turn";
  const fetcher: typeof fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body)); assert.equal(body.max_tokens, 1000); assert.equal(body.model, "claude-sonnet-5");
    assert.equal(String(options?.body).includes("하늘"), false);
    return new Response(JSON.stringify({ stop_reason: reason, content: [{ type: "text", text: content }], usage: { input_tokens: 500, output_tokens: 400 } }));
  };
  assert.equal((await generateTossShortNarrative({ apiKey: "fake", result, chapter: "conversation", signal: new AbortController().signal, fetcher })).content, content);
  reason = "max_tokens"; await assert.rejects(generateTossShortNarrative({ apiKey: "fake", result, chapter: "conversation", signal: new AbortController().signal, fetcher }));
  const snapshot: FullbuySnapshot = { networkId: "room", members: [{ id: "a", inputVersion: "v1" }, { id: "b", inputVersion: "v1" }], relationship: "friend", calculationVersion: "calc", narrativeVersion: "short" };
  let authorized = true, calls = 0;
  await assert.rejects(generateFullbuyChapter({ store, userId: "u1", snapshot, chapter: "conversation", authorize: async () => { if (!authorized) throw new Error("revoked"); },
    generate: async () => { calls++; authorized = false; return content; }, validate: value => !!parseTossShortNarrative(value, result) }));
  assert.equal(calls, 1); assert.equal((await store.wallet("u1")).balance, 9);
  await assert.rejects(generateFullbuyChapter({ store, userId: "u1", snapshot, chapter: "conversation", authorize: async () => { throw new Error("revoked"); }, generate: async () => { calls++; return content; }, validate: () => true }));
  assert.equal(calls, 1);
  const network = createTossNetworkStore(db, "test-network-secret".repeat(3));
  const created = await network.create("u1", TOSS_BASIC_SAMPLE_INPUT.personA, true, randomUUID());
  await network.join("u2", created.invite, TOSS_BASIC_SAMPLE_INPUT.personB, true);
  const view = await network.view("u1", created.network.id);
  const [a, b] = view.members;
  const actualPair = await network.pair("u1", view.id, a.id, b.id);
  const chapterBudget = createTossAiBudget(db, { user: 20, global: 100 });
  let chapterCalls = 0, grantEnabled = true;
  const chapters = createTossChapterHandler({ authenticate: async () => ({ userId, provider: "toss" }),
    allowedOrigin: value => value === "https://woorisajoo.apps.tossmini.com", enabled: () => true, generationEnabled: () => grantEnabled,
    store: () => store, network: () => network, budget: () => chapterBudget,
    generate: async () => { chapterCalls++; return { content, usage: { inputTokens: 500, outputTokens: 400 }, model: "claude-sonnet-5" }; },
  });
  const chapterReq = (action: string, extra: object = {}) => new NextRequest("https://api.example/api/toss/chapters", { method: "POST",
    headers: { origin: "https://woorisajoo.apps.tossmini.com" }, body: JSON.stringify({ action, chapter: "conversation", networkId: view.id, memberAId: a.id, memberBId: b.id, ...extra }) });
  grantEnabled = false; assert.equal((await chapters(chapterReq("open"))).status, 503); assert.equal(chapterCalls, 0); grantEnabled = true;
  const opened = await (await chapters(chapterReq("open"))).json(); assert.equal(opened.status, "ready");
  assert.equal((await store.wallet("u1")).balance, 6); assert.equal(chapterCalls, 1); assert.equal(opened.attemptId, undefined);
  assert.equal((await (await chapters(chapterReq("open", { memberAId: b.id, memberBId: a.id }))).json()).status, "ready");
  assert.equal(chapterCalls, 1); assert.equal((await store.wallet("u1")).balance, 6);
  userId = "outsider"; assert.equal((await chapters(chapterReq("open"))).status, 404);
  assert.equal((await (await chapters(chapterReq("read", { chapterKey: opened.chapterKey }))).json()).status, "unopened"); userId = "u1";
  const lockedKey = fullbuyChapterKey(actualPair.snapshot, "conflict");
  const reserved = await store.reserve("u1", lockedKey); if (!reserved.attemptId) throw new Error("missing_attempt");
  await network.leave("u2", view.id);
  await assert.rejects(store.complete("u1", lockedKey, reserved.attemptId, content, tossChapterCompletionGuards("u1", actualPair.snapshot)));
  assert.equal((await store.read("u1", lockedKey)).status, "pending");
  await store.release("u1", lockedKey, reserved.attemptId); assert.equal((await store.wallet("u1")).balance, 6);
  await network.close("u1", view.id);
  assert.equal((await (await chapters(chapterReq("read", { chapterKey: opened.chapterKey }))).json()).content, content);
  assert.equal((await (await chapters(chapterReq("library"))).json()).chapters.length, 1);
  assert.equal(chapterCalls, 1);
  await pg.close(); console.log("Toss durable IAP grants, daily attempt budgets, private short narratives and revocation: PASS");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
