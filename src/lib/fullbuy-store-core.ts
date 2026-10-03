import { randomUUID } from "node:crypto";
import { FULLBUY_CHAPTER_COST, validateFullbuyId, validateFullbuyKey } from "./fullbuy-contract";

type Row = Record<string, unknown>;
export type FullbuyStatement = { text: string; values: unknown[] };
export interface FullbuyDatabase {
  query(statement: FullbuyStatement): Promise<Row[]>;
  transaction(statements: FullbuyStatement[]): Promise<Row[][]>;
}
const statement = (text: string, ...values: unknown[]): FullbuyStatement => ({ text, values });

export const FULLBUY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS woorigunghap_fullbuy_wallets (
    user_id TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS woorigunghap_fullbuy_ledger (
    event_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES woorigunghap_fullbuy_wallets(user_id),
    kind TEXT NOT NULL CHECK (kind IN ('iap','reward','reserve','release')),
    reference TEXT NOT NULL, paid_delta INTEGER NOT NULL, reward_delta INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (paid_delta BETWEEN -3000 AND 3000 AND reward_delta BETWEEN -3000 AND 3000),
    CHECK ((kind='iap' AND paid_delta>0 AND reward_delta=0) OR
      (kind='reward' AND reward_delta=3 AND paid_delta=0) OR
      (kind='reserve' AND paid_delta<=0 AND reward_delta<=0 AND paid_delta+reward_delta=-3) OR
      (kind='release' AND paid_delta>=0 AND reward_delta>=0 AND paid_delta+reward_delta=3)))`,
  `CREATE INDEX IF NOT EXISTS woorigunghap_fullbuy_ledger_user ON woorigunghap_fullbuy_ledger(user_id)`,
  `CREATE TABLE IF NOT EXISTS woorigunghap_fullbuy_chapters (
    user_id TEXT NOT NULL REFERENCES woorigunghap_fullbuy_wallets(user_id), chapter_key TEXT NOT NULL,
    attempt_id TEXT NOT NULL UNIQUE, attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 2),
    state TEXT NOT NULL CHECK (state IN ('pending','ready','failed')),
    paid_reserved INTEGER NOT NULL, reward_reserved INTEGER NOT NULL,
    content TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,chapter_key), CHECK (paid_reserved>=0 AND reward_reserved>=0 AND paid_reserved+reward_reserved=3),
    CHECK ((state='ready' AND content IS NOT NULL) OR (state<>'ready' AND content IS NULL)))`,
];

const lock = (userId: string) => statement(
  "SELECT user_id FROM woorigunghap_fullbuy_wallets WHERE user_id=$1 FOR UPDATE", userId);
const balances = `SELECT COALESCE(SUM(paid_delta),0)::INTEGER AS paid,
  COALESCE(SUM(reward_delta),0)::INTEGER AS reward FROM woorigunghap_fullbuy_ledger WHERE user_id=$1`;

export function createFullbuyStore(db: FullbuyDatabase) {
  let schema: Promise<void> | undefined;
  async function ensureSchema() {
    schema ??= db.transaction(FULLBUY_SCHEMA.map(text => statement(text))).then(() => undefined)
      .catch(error => { schema = undefined; throw error; });
    await schema;
  }
  async function wallet(userId: string) {
    validateFullbuyId(userId); await ensureSchema();
    // One SQL snapshot keeps available and pending amounts consistent during writes.
    const rows = await db.query(statement(`WITH available AS (${balances})
      SELECT paid,reward,(SELECT COUNT(*)::INTEGER*3 FROM woorigunghap_fullbuy_chapters
        WHERE user_id=$1 AND state='pending') AS reserved FROM available`, userId));
    const paid = Number(rows[0].paid), reward = Number(rows[0].reward), reserved = Number(rows[0].reserved);
    if (![paid,reward,reserved].every(value => Number.isSafeInteger(value) && value>=0)) throw new Error("fullbuy_balance_corrupt");
    return { balance: paid+reward, paid, reward, reserved };
  }
  // Internal only. Caller must independently verify ownership/status/reward proof before calling.
  async function credit(userId: string, source: "iap" | "reward", reference: string, amount: number) {
    validateFullbuyId(userId); validateFullbuyId(reference);
    if (!["iap","reward"].includes(source) || !Number.isInteger(amount) || amount<3 || amount>3000 || amount%3
      || (source==="reward" && amount!==3)) throw new Error("invalid_fullbuy_credit");
    await ensureSchema();
    const event = `${source}:${reference}`;
    const results = await db.transaction([
      statement("INSERT INTO woorigunghap_fullbuy_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING", userId),
      lock(userId),
      statement(`INSERT INTO woorigunghap_fullbuy_ledger(event_id,user_id,kind,reference,paid_delta,reward_delta)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, event,userId,source,reference,source==="iap"?amount:0,source==="reward"?amount:0),
      statement("SELECT user_id,paid_delta,reward_delta FROM woorigunghap_fullbuy_ledger WHERE event_id=$1", event),
    ]);
    const row = results[3][0];
    if (row?.user_id!==userId || Number(row.paid_delta)!==(source==="iap"?amount:0)
      || Number(row.reward_delta)!==(source==="reward"?amount:0)) throw new Error("fullbuy_credit_conflict");
    return wallet(userId);
  }
  async function reserve(userId: string, key: string) {
    validateFullbuyId(userId); validateFullbuyKey(key); await ensureSchema();
    const attempt = randomUUID();
    const results = await db.transaction([
      lock(userId),
      statement(`WITH available AS (${balances}), reservation AS (
        INSERT INTO woorigunghap_fullbuy_chapters(user_id,chapter_key,attempt_id,attempts,state,paid_reserved,reward_reserved)
        SELECT $1,$2,$3,1,'pending',3-LEAST(reward,3),LEAST(reward,3) FROM available WHERE paid+reward>=3
        ON CONFLICT(user_id,chapter_key) DO UPDATE SET attempt_id=EXCLUDED.attempt_id,
          attempts=woorigunghap_fullbuy_chapters.attempts+1,state='pending',content=NULL,
          paid_reserved=EXCLUDED.paid_reserved,reward_reserved=EXCLUDED.reward_reserved,updated_at=NOW()
        WHERE woorigunghap_fullbuy_chapters.state='failed' AND woorigunghap_fullbuy_chapters.attempts<2
        RETURNING paid_reserved,reward_reserved)
        INSERT INTO woorigunghap_fullbuy_ledger(event_id,user_id,kind,reference,paid_delta,reward_delta)
        SELECT 'reserve:'||$3,$1,'reserve',$3,-paid_reserved,-reward_reserved FROM reservation`,userId,key,attempt),
      statement("SELECT state,attempt_id,attempts,content FROM woorigunghap_fullbuy_chapters WHERE user_id=$1 AND chapter_key=$2",userId,key),
    ]);
    const row = results[2][0];
    if (!row) return { status: "insufficient" as const };
    if (row.state==="ready") return { status: "ready" as const, content: String(row.content) };
    if (row.state==="failed") return { status: Number(row.attempts)>=2?"exhausted" as const:"insufficient" as const };
    return { status: row.attempt_id===attempt?"reserved" as const:"pending" as const, attemptId:String(row.attempt_id), cost:FULLBUY_CHAPTER_COST };
  }
  async function complete(userId: string, key: string, attemptId: string, content: string) {
    validateFullbuyId(userId); validateFullbuyKey(key); validateFullbuyId(attemptId);
    if (typeof content!=="string" || !content.trim() || content.length>8000) throw new Error("invalid_fullbuy_content");
    await ensureSchema();
    const results = await db.transaction([lock(userId),
      statement(`UPDATE woorigunghap_fullbuy_chapters SET state='ready',content=$4,updated_at=NOW()
        WHERE user_id=$1 AND chapter_key=$2 AND attempt_id=$3 AND state='pending'`,userId,key,attemptId,content),
      statement("SELECT state,attempt_id,content FROM woorigunghap_fullbuy_chapters WHERE user_id=$1 AND chapter_key=$2",userId,key),
    ]);
    const row = results[2][0];
    if (row?.state!=="ready" || row.attempt_id!==attemptId) throw new Error("stale_fullbuy_attempt");
    return { content:String(row.content) };
  }
  async function release(userId: string, key: string, attemptId: string) {
    validateFullbuyId(userId); validateFullbuyKey(key); validateFullbuyId(attemptId); await ensureSchema();
    const results = await db.transaction([lock(userId),
      statement(`WITH released AS (UPDATE woorigunghap_fullbuy_chapters SET state='failed',updated_at=NOW()
        WHERE user_id=$1 AND chapter_key=$2 AND attempt_id=$3 AND state='pending'
        RETURNING paid_reserved,reward_reserved)
        INSERT INTO woorigunghap_fullbuy_ledger(event_id,user_id,kind,reference,paid_delta,reward_delta)
        SELECT 'release:'||$3,$1,'release',$3,paid_reserved,reward_reserved FROM released RETURNING event_id`,userId,key,attemptId),
    ]);
    return { released:results[1].length===1 };
  }
  // Server recovery only. The generation deadline is 120s; abandoned reservations
  // are released after 10 minutes. Late workers cannot complete a failed attempt.
  async function releaseStale(userId: string) {
    validateFullbuyId(userId); await ensureSchema();
    const results = await db.transaction([lock(userId),
      statement(`WITH released AS (UPDATE woorigunghap_fullbuy_chapters SET state='failed',updated_at=NOW()
        WHERE user_id=$1 AND state='pending' AND updated_at<=NOW()-INTERVAL '10 minutes'
        RETURNING attempt_id,paid_reserved,reward_reserved)
        INSERT INTO woorigunghap_fullbuy_ledger(event_id,user_id,kind,reference,paid_delta,reward_delta)
        SELECT 'release:'||attempt_id,$1,'release',attempt_id,paid_reserved,reward_reserved FROM released RETURNING event_id`,userId),
    ]);
    return { released:results[1].length };
  }
  return { ensureSchema, wallet, credit, reserve, complete, release, releaseStale };
}
