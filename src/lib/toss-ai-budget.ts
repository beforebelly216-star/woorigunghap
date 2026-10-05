import "server-only";
import { neon } from "@neondatabase/serverless";
import { createTossAiBudget } from "./toss-ai-budget-core";
let budget: ReturnType<typeof createTossAiBudget> | undefined;
export function getTossAiBudget() {
  const connection = process.env.DATABASE_URL?.trim(); if (!connection) throw new Error("ai_budget_not_configured");
  if (!budget) {
    const sql = neon(connection);
    budget = createTossAiBudget({
      query: ({ text, values }) => sql.query(text, values, { fetchOptions: { signal: AbortSignal.timeout(20000) } }),
      transaction: statements => sql.transaction(statements.map(({ text, values }) => sql.query(text, values)),
        { isolationLevel: "ReadCommitted", fetchOptions: { signal: AbortSignal.timeout(20000) } }),
    }, { user: Number(process.env.APPS_IN_TOSS_AI_USER_DAILY_ATTEMPTS), global: Number(process.env.APPS_IN_TOSS_AI_GLOBAL_DAILY_ATTEMPTS) });
  }
  return budget;
}
