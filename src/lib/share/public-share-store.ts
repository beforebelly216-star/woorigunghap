import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { createOpaqueToken, hashOpaqueToken, isOpaqueToken } from "@/lib/auth-policy";
import { parsePublicSharePayload, type PublicSharePayload } from "@/lib/share/public-share-contract";

let query: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getQuery() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!query) query = neon(connectionString);
  return query;
}

async function ensureSchema() {
  const sql = getQuery();
  if (!sql) return false;

  if (!schemaPromise) {
    schemaPromise = sql`
      CREATE TABLE IF NOT EXISTS woorigunghap_public_shares (
        token_hash TEXT PRIMARY KEY,
        source_payment_id TEXT NOT NULL,
        product TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(async () => {
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_public_shares_source_payment_idx
        ON woorigunghap_public_shares (source_payment_id)
      `;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return true;
}

export async function createPublicShare(sourcePaymentId: string, payload: PublicSharePayload) {
  if (!sourcePaymentId || sourcePaymentId.length > 160 || !await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = createOpaqueToken();
    const rows = await sql`
      INSERT INTO woorigunghap_public_shares (
        token_hash, source_payment_id, product, payload_json
      )
      VALUES (
        ${hashOpaqueToken(token)},
        ${sourcePaymentId},
        ${payload.product},
        ${JSON.stringify(payload)}
      )
      ON CONFLICT (token_hash) DO NOTHING
      RETURNING token_hash
    `;
    if (rows.length > 0) return token;
  }

  throw new Error("PUBLIC_SHARE_TOKEN_COLLISION");
}

export async function loadPublicShare(token: string) {
  if (!isOpaqueToken(token) || !await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;

  const rows = await sql`
    SELECT payload_json
    FROM woorigunghap_public_shares
    WHERE token_hash = ${hashOpaqueToken(token)}
    LIMIT 1
  `;
  return parsePublicSharePayload(rows[0]?.payload_json ? JSON.parse(String(rows[0].payload_json)) : null);
}

export async function deletePublicSharesForPayment(sourcePaymentId: string) {
  if (!sourcePaymentId || !await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    DELETE FROM woorigunghap_public_shares
    WHERE source_payment_id = ${sourcePaymentId}
  `;
  return true;
}
