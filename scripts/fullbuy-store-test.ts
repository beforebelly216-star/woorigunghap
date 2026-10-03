import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { fullbuyChapterKey, type FullbuySnapshot } from "../src/lib/fullbuy-contract";
import { createFullbuyStore, type FullbuyDatabase, type FullbuyStatement } from "../src/lib/fullbuy-store-core";
import { isTossBrowserApi } from "../src/lib/toss-session-policy";
import { generateFullbuyChapter } from "../src/lib/fullbuy-chapter-service";

async function main() {
  const pg = await PGlite.create();
  let failNextTransaction = false;
  const db: FullbuyDatabase = {
    query: async ({text,values}) => (await pg.query<Record<string,unknown>>(text,values)).rows,
    transaction: statements => pg.transaction(async tx => {
      const results = [];
      for (const {text,values} of statements) results.push((await tx.query<Record<string,unknown>>(text,values)).rows);
      if (failNextTransaction) { failNextTransaction=false; await tx.query("SELECT 1/0"); }
      return results;
    }),
  };
  const store = createFullbuyStore(db);
  const snapshot: FullbuySnapshot = { networkId:"room-1", members:[{id:"a",inputVersion:"v1"},{id:"b",inputVersion:"v1"}],
    relationship:"friend",calculationVersion:"calc-1",narrativeVersion:"narrative-1" };
  const key = fullbuyChapterKey(snapshot,"conversation");
  const secondKey = fullbuyChapterKey(snapshot,"strengths");
  assert.equal(fullbuyChapterKey({...snapshot,members:[snapshot.members[1],snapshot.members[0]]},"conversation"),key);
  assert.notEqual(fullbuyChapterKey({...snapshot,members:[snapshot.members[0],{id:"b",inputVersion:"v2"}]},"conversation"),key);
  assert.notEqual(fullbuyChapterKey({...snapshot,narrativeVersion:"new"},"conversation"),key);
  assert.throws(()=>fullbuyChapterKey({...snapshot,members:[snapshot.members[0],snapshot.members[0]]},"conversation"));
  assert.equal(isTossBrowserApi("/api/toss/wallet"),true);
  assert.equal(isTossBrowserApi("/api/toss/wallet/credit"),false);
  await store.ensureSchema();
  assert.deepEqual(await store.wallet("u1"),{balance:0,paid:0,reward:0,reserved:0});
  assert.equal((await store.reserve("u1",key)).status,"insufficient");
  await Promise.all(Array.from({length:10},()=>store.credit("u1","iap","order-1",9)));
  assert.equal((await store.wallet("u1")).balance,9);
  await assert.rejects(store.credit("u2","iap","order-1",9),/credit_conflict/);
  await assert.rejects(store.credit("u1","iap","order-1",3),/credit_conflict/);
  assert.equal((await store.wallet("u2")).balance,0);
  await assert.rejects(store.credit("u1","reward","ad-1",9),/invalid_fullbuy_credit/);
  await assert.rejects(store.credit("u1","iap","order-bad",-3),/invalid_fullbuy_credit/);
  await store.credit("u1","reward","ad-1",3);
  await store.credit("u1","reward","ad-1",3);
  assert.equal((await store.wallet("u1")).balance,12);

  const attempts = await Promise.all(Array.from({length:10},()=>store.reserve("u1",key)));
  assert.equal(attempts.filter(result=>result.status==="reserved").length,1);
  assert.equal(attempts.filter(result=>result.status==="pending").length,9);
  const reservation = attempts.find(result=>result.status==="reserved")!;
  if (!reservation.attemptId) throw new Error("missing_attempt");
  assert.deepEqual(await store.wallet("u1"),{balance:9,paid:9,reward:0,reserved:3});
  await assert.rejects(store.complete("u2",key,reservation.attemptId,"stolen"),/stale_fullbuy_attempt/);
  assert.deepEqual(await store.release("u2",key,reservation.attemptId),{released:false});
  assert.deepEqual(await store.release("u1",key,reservation.attemptId),{released:true});
  assert.deepEqual(await store.release("u1",key,reservation.attemptId),{released:false});
  assert.deepEqual(await store.wallet("u1"),{balance:12,paid:9,reward:3,reserved:0});
  const retry = await store.reserve("u1",key);
  assert.equal(retry.status,"reserved");
  if (!retry.attemptId) throw new Error("missing_retry");
  await assert.rejects(store.complete("u1",key,reservation.attemptId,"late worker"),/stale_fullbuy_attempt/);
  await assert.rejects(store.complete("u1",key,retry.attemptId,""),/invalid_fullbuy_content/);
  await store.complete("u1",key,retry.attemptId,"Saved explanation");
  assert.deepEqual(await store.complete("u1",key,retry.attemptId,"Replacement refused"),{content:"Saved explanation"});
  assert.deepEqual(await store.reserve("u1",key),{status:"ready",content:"Saved explanation"});
  assert.deepEqual(await store.release("u1",key,retry.attemptId),{released:false});
  assert.deepEqual(await store.wallet("u1"),{balance:9,paid:9,reward:0,reserved:0});

  failNextTransaction=true;
  await assert.rejects(store.credit("u1","iap","rollback-order",3));
  assert.equal((await store.wallet("u1")).balance,9);
  failNextTransaction=true;
  await assert.rejects(store.reserve("u1",secondKey));
  assert.equal((await store.wallet("u1")).balance,9);
  const failed = await store.reserve("u1",secondKey);
  if (!failed.attemptId) throw new Error("missing_failed");
  failNextTransaction=true;
  await assert.rejects(store.release("u1",secondKey,failed.attemptId));
  assert.equal((await store.wallet("u1")).reserved,3);
  await store.release("u1",secondKey,failed.attemptId);
  const failedRetry = await store.reserve("u1",secondKey);
  if (!failedRetry.attemptId) throw new Error("missing_failed_retry");
  await store.release("u1",secondKey,failedRetry.attemptId);
  assert.equal((await store.reserve("u1",secondKey)).status,"exhausted");
  assert.equal((await store.wallet("u1")).balance,9);

  await store.credit("u3","iap","order-3",3);
  const distinct = await Promise.all([store.reserve("u3",key),store.reserve("u3",secondKey)]);
  assert.deepEqual(distinct.map(row=>row.status).sort(),["insufficient","reserved"]);
  assert.equal((await store.wallet("u3")).balance,0);
  assert.equal((await store.wallet("u3")).reserved,3);
  await store.credit("u4","iap","order-4",3);
  const fourth = await store.reserve("u4",key);
  assert.equal(fourth.status,"reserved");
  // SQL constraints reject invalid credit amounts even if the helper is bypassed.
  await db.query({text:"INSERT INTO woorigunghap_fullbuy_wallets(user_id) VALUES('mixed')",values:[]});
  const invalid: FullbuyStatement = {text:"INSERT INTO woorigunghap_fullbuy_ledger VALUES('bad','mixed','reward','bad',0,1,NOW())",values:[]};
  await assert.rejects(db.query(invalid));
  await db.query({text:"UPDATE woorigunghap_fullbuy_chapters SET updated_at=NOW()-INTERVAL '11 minutes' WHERE user_id='u4'",values:[]});
  assert.deepEqual(await store.releaseStale("u4"),{released:1});
  assert.deepEqual(await store.releaseStale("u4"),{released:0});
  assert.equal((await store.wallet("u4")).balance,3);
  if (!fourth.attemptId) throw new Error("missing_fourth");
  await assert.rejects(store.complete("u4",key,fourth.attemptId,"too late"),/stale_fullbuy_attempt/);

  await store.credit("worker","iap","worker-order",9);
  let generations=0;
  const generate = async () => { generations+=1; return "validated result"; };
  const workerOptions = {store,userId:"worker",snapshot,chapter:"conversation" as const,generate,validate:()=>true};
  const workerResults = await Promise.all(Array.from({length:5},()=>generateFullbuyChapter(workerOptions)));
  assert.equal(generations,1);
  assert.equal(workerResults.some(result=>result.status==="ready"),true);
  assert.equal((await store.wallet("worker")).balance,6);
  await generateFullbuyChapter(workerOptions);
  assert.equal(generations,1);
  await assert.rejects(generateFullbuyChapter({...workerOptions,chapter:"strengths",validate:()=>false}),/fullbuy_generation_failed/);
  assert.equal((await store.wallet("worker")).balance,6);
  await assert.rejects(generateFullbuyChapter({...workerOptions,chapter:"conflict",generate:async()=>{throw new Error("provider error");}}),/fullbuy_generation_failed/);
  assert.equal((await store.wallet("worker")).balance,6);
  const persisted = createFullbuyStore(db);
  assert.deepEqual(await persisted.reserve("u1",key),{status:"ready",content:"Saved explanation"});
  assert.deepEqual(await persisted.wallet("u1"),{balance:9,paid:9,reward:0,reserved:0});
  await pg.close();
  console.log("Fullbuy actual PostgreSQL SQL: credit dedup/ownership conflict, reserve, source return, fencing, retry limit, rollback, persistence PASS");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
