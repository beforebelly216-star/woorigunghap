import "server-only";
import { neon } from "@neondatabase/serverless";
import { createFullbuyStore } from "@/lib/fullbuy-store-core";

let store: ReturnType<typeof createFullbuyStore> | undefined;
export function getFullbuyStore() {
  const connection = process.env.DATABASE_URL?.trim();
  if (!connection) throw new Error("fullbuy_store_unavailable");
  if (!store) {
    const sql = neon(connection);
    store = createFullbuyStore({
      query: ({text,values}) => sql.query(text,values,{fetchOptions:{signal:AbortSignal.timeout(20000)}}),
      transaction: statements => sql.transaction(statements.map(({text,values}) => sql.query(text,values)),
        {isolationLevel:"ReadCommitted",fetchOptions:{signal:AbortSignal.timeout(20000)}}),
    });
  }
  return store;
}
