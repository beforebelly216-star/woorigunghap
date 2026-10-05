import type { FullbuyDatabase } from "./fullbuy-store-core";
import { validateFullbuyId } from "./fullbuy-contract";

// A hard attempt quota, not an approximate dollar cap. Uncertain provider calls
// remain counted; returning a user's item must never reopen the provider budget.
export function createTossAiBudget(db: FullbuyDatabase, limits: { user: number; global: number }) {
  if (![limits.user, limits.global].every(value => Number.isSafeInteger(value) && value >= 1 && value <= 10000) || limits.user > limits.global) throw new Error("invalid_ai_budget");
  let schema: Promise<void> | undefined;
  const stmt = (text: string, ...values: unknown[]) => ({ text, values });
  async function ensureSchema() {
    schema ??= db.transaction([
      stmt(`CREATE TABLE IF NOT EXISTS woorigunghap_toss_ai_days(day TEXT PRIMARY KEY)`),
      stmt(`CREATE TABLE IF NOT EXISTS woorigunghap_toss_ai_attempts(
        attempt_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,day TEXT NOT NULL REFERENCES woorigunghap_toss_ai_days(day),
        input_tokens INTEGER,output_tokens INTEGER,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK(input_tokens IS NULL OR input_tokens>=0),CHECK(output_tokens IS NULL OR output_tokens BETWEEN 0 AND 1000))`),
      stmt(`CREATE INDEX IF NOT EXISTS woorigunghap_toss_ai_attempts_day_user ON woorigunghap_toss_ai_attempts(day,user_id)`),
    ]).then(() => undefined).catch(error => { schema = undefined; throw error; });
    await schema;
  }
  async function reserve(userId: string, attemptId: string) {
    validateFullbuyId(userId); validateFullbuyId(attemptId); await ensureSchema();
    const results = await db.transaction([
      stmt(`INSERT INTO woorigunghap_toss_ai_days(day) VALUES(TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD')) ON CONFLICT DO NOTHING`),
      stmt(`SELECT day FROM woorigunghap_toss_ai_days WHERE day=TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') FOR UPDATE`),
      stmt(`INSERT INTO woorigunghap_toss_ai_attempts(attempt_id,user_id,day)
        SELECT $1,$2,TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD')
        WHERE (SELECT COUNT(*) FROM woorigunghap_toss_ai_attempts WHERE day=TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD'))<$3
        AND (SELECT COUNT(*) FROM woorigunghap_toss_ai_attempts WHERE day=TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') AND user_id=$2)<$4
        ON CONFLICT DO NOTHING RETURNING attempt_id`, attemptId, userId, limits.global, limits.user),
    ]);
    if (results[2].length !== 1) throw new Error("ai_attempt_budget_exhausted");
  }
  async function record(userId: string, attemptId: string, usage: { inputTokens: number; outputTokens: number }) {
    validateFullbuyId(userId); validateFullbuyId(attemptId);
    if (!Number.isSafeInteger(usage.inputTokens) || usage.inputTokens < 0 || !Number.isSafeInteger(usage.outputTokens) || usage.outputTokens < 0 || usage.outputTokens > 1000) throw new Error("invalid_ai_usage");
    await ensureSchema();
    const rows = await db.query(stmt(`UPDATE woorigunghap_toss_ai_attempts SET input_tokens=$3,output_tokens=$4
      WHERE attempt_id=$1 AND user_id=$2 AND input_tokens IS NULL RETURNING attempt_id`, attemptId, userId, usage.inputTokens, usage.outputTokens));
    if (rows.length !== 1) throw new Error("ai_usage_not_recorded");
  }
  return { reserve, record };
}
