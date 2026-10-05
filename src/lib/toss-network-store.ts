import "server-only";
import { neon } from "@neondatabase/serverless";
import { createTossNetworkStore } from "./toss-network-core";

let store: ReturnType<typeof createTossNetworkStore> | undefined;
export function isTossNetworkStoreConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim() && (process.env.NETWORK_PII_ENCRYPTION_KEY?.trim().length ?? 0)>=32);
}
export function getTossNetworkStore() {
  const connection=process.env.DATABASE_URL?.trim(),secret=process.env.NETWORK_PII_ENCRYPTION_KEY?.trim();
  if (!connection || !secret || secret.length<32) throw new Error("toss_network_store_unavailable");
  if (!store) {
    const sql=neon(connection);
    store=createTossNetworkStore({
      query:({text,values})=>sql.query(text,values,{fetchOptions:{signal:AbortSignal.timeout(20000)}}),
      transaction:statements=>sql.transaction(statements.map(({text,values})=>sql.query(text,values)),
        {isolationLevel:"ReadCommitted",fetchOptions:{signal:AbortSignal.timeout(20000)}}),
    },secret);
  }
  return store;
}
