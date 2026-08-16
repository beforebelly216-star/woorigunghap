import "server-only";

import { randomUUID } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { hashOpaqueToken, isOpaqueToken } from "@/lib/auth-policy";

export type AuthenticatedUser = {
  userId: string;
  displayName: string | null;
};

let query: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getQuery() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!query) query = neon(connectionString);
  return query;
}

async function ensureAuthSchema() {
  const sql = getQuery();
  if (!sql) return false;
  if (!schemaPromise) {
    schemaPromise = sql`
      CREATE TABLE IF NOT EXISTS woorigunghap_users (
        user_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (provider, provider_user_id)
      )
    `.then(async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_auth_sessions (
          session_token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES woorigunghap_users(user_id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_auth_sessions_user_id_idx
        ON woorigunghap_auth_sessions(user_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_auth_sessions_expires_at_idx
        ON woorigunghap_auth_sessions(expires_at)
      `;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

export function isAuthStoreConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function upsertKakaoUser(
  providerUserId: string,
  displayName: string | null,
): Promise<AuthenticatedUser> {
  if (!await ensureAuthSchema()) throw new Error("auth_store_unavailable");
  const sql = getQuery();
  if (!sql) throw new Error("auth_store_unavailable");
  const proposedUserId = randomUUID();
  const rows = await sql`
    INSERT INTO woorigunghap_users (
      user_id, provider, provider_user_id, display_name
    ) VALUES (
      ${proposedUserId}, 'kakao', ${providerUserId}, ${displayName}
    )
    ON CONFLICT (provider, provider_user_id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, woorigunghap_users.display_name),
      updated_at = NOW(),
      last_login_at = NOW()
    RETURNING user_id, display_name
  `;
  const row = rows[0];
  if (typeof row?.user_id !== "string") throw new Error("auth_user_upsert_failed");
  return {
    userId: row.user_id,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
  };
}

export async function createDatabaseSession(
  userId: string,
  sessionToken: string,
  expiresAt: Date,
) {
  if (!isOpaqueToken(sessionToken) || !await ensureAuthSchema()) {
    throw new Error("invalid_auth_session");
  }
  const sql = getQuery();
  if (!sql) throw new Error("auth_store_unavailable");
  await sql`DELETE FROM woorigunghap_auth_sessions WHERE expires_at <= NOW()`;
  await sql`
    INSERT INTO woorigunghap_auth_sessions (
      session_token_hash, user_id, expires_at
    ) VALUES (
      ${hashOpaqueToken(sessionToken)}, ${userId}, ${expiresAt.toISOString()}
    )
  `;
}

export async function loadDatabaseSession(sessionToken: string) {
  if (!isOpaqueToken(sessionToken) || !await ensureAuthSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT users.user_id, users.display_name
    FROM woorigunghap_auth_sessions sessions
    JOIN woorigunghap_users users ON users.user_id = sessions.user_id
    WHERE sessions.session_token_hash = ${hashOpaqueToken(sessionToken)}
      AND sessions.expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  if (typeof row?.user_id !== "string") return null;
  return {
    userId: row.user_id,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
  } satisfies AuthenticatedUser;
}

export async function revokeDatabaseSession(sessionToken: string) {
  if (!isOpaqueToken(sessionToken) || !await ensureAuthSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    DELETE FROM woorigunghap_auth_sessions
    WHERE session_token_hash = ${hashOpaqueToken(sessionToken)}
  `;
  return true;
}
