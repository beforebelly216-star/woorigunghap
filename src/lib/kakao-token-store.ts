import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { ensureAuthStoreSchema } from "@/lib/auth-store";
import type { KakaoTokenBundle } from "@/lib/kakao-auth";

let query: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getQuery() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!query) query = neon(connectionString);
  return query;
}

function encryptionKey() {
  const raw = process.env.KAKAO_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw || !/^[a-fA-F0-9]{64}$/.test(raw)) return null;
  return Buffer.from(raw, "hex");
}

function encrypt(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("kakao_token_encryption_key_missing");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("kakao_token_encryption_key_missing");
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("invalid_kakao_token_ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function ensureSchema() {
  const sql = getQuery();
  if (!sql || !encryptionKey()) return false;
  if (!schemaPromise) {
    schemaPromise = ensureAuthStoreSchema().then(async (ready) => {
      if (!ready) throw new Error("auth_store_unavailable");
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_access_token_ciphertext TEXT`;
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_access_token_expires_at TIMESTAMPTZ`;
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_refresh_token_ciphertext TEXT`;
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_refresh_token_expires_at TIMESTAMPTZ`;
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_message_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

export async function saveKakaoTokenBundle(
  userId: string,
  bundle: KakaoTokenBundle,
  explicitMessageOptIn?: boolean,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  // The OAuth callback's signed state/intent cookie is the authority for an
  // explicit notification opt-in. Kakao's token response can omit `scope`
  // even after a successful incremental-consent flow, so do not turn the
  // feature back off just because that optional response field is absent.
  const messageEnabled = explicitMessageOptIn ?? bundle.scopes.includes("talk_message");
  const accessExpiresAt = new Date(Date.now() + bundle.expiresInSeconds * 1000).toISOString();
  const refreshExpiresAt = bundle.refreshToken && bundle.refreshTokenExpiresInSeconds
    ? new Date(Date.now() + bundle.refreshTokenExpiresInSeconds * 1000).toISOString()
    : null;
  await sql`
    UPDATE woorigunghap_users
    SET kakao_access_token_ciphertext = ${encrypt(bundle.accessToken)},
        kakao_access_token_expires_at = ${accessExpiresAt},
        kakao_refresh_token_ciphertext = CASE
          WHEN ${bundle.refreshToken ?? null} IS NULL THEN kakao_refresh_token_ciphertext
          ELSE ${bundle.refreshToken ? encrypt(bundle.refreshToken) : null}
        END,
        kakao_refresh_token_expires_at = COALESCE(${refreshExpiresAt}, kakao_refresh_token_expires_at),
        kakao_message_enabled = ${messageEnabled},
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
  return true;
}

export async function isKakaoMessageEnabled(userId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const rows = await sql`
    SELECT kakao_message_enabled
    FROM woorigunghap_users
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return rows[0]?.kakao_message_enabled === true;
}

export async function loadKakaoMessagingTokens(userId: string) {
  if (!await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT kakao_access_token_ciphertext,
           kakao_access_token_expires_at,
           kakao_refresh_token_ciphertext,
           kakao_refresh_token_expires_at,
           kakao_message_enabled
    FROM woorigunghap_users
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row?.kakao_message_enabled || typeof row.kakao_access_token_ciphertext !== "string") return null;
  const accessExpiresAt = row.kakao_access_token_expires_at instanceof Date
    ? row.kakao_access_token_expires_at
    : new Date(String(row.kakao_access_token_expires_at));
  const refreshExpiresAt = row.kakao_refresh_token_expires_at instanceof Date
    ? row.kakao_refresh_token_expires_at
    : row.kakao_refresh_token_expires_at ? new Date(String(row.kakao_refresh_token_expires_at)) : null;
  return {
    accessToken: decrypt(row.kakao_access_token_ciphertext),
    accessExpiresAt,
    refreshToken: typeof row.kakao_refresh_token_ciphertext === "string"
      ? decrypt(row.kakao_refresh_token_ciphertext)
      : null,
    refreshExpiresAt,
  };
}

export async function updateKakaoAccessToken(
  userId: string,
  accessToken: string,
  expiresInSeconds: number,
  refreshToken?: string | null,
  refreshTokenExpiresInSeconds?: number | null,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const accessExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const refreshExpiresAt = refreshToken && refreshTokenExpiresInSeconds
    ? new Date(Date.now() + refreshTokenExpiresInSeconds * 1000).toISOString()
    : null;
  await sql`
    UPDATE woorigunghap_users
    SET kakao_access_token_ciphertext = ${encrypt(accessToken)},
        kakao_access_token_expires_at = ${accessExpiresAt},
        kakao_refresh_token_ciphertext = CASE
          WHEN ${refreshToken ?? null} IS NULL THEN kakao_refresh_token_ciphertext
          ELSE ${refreshToken ? encrypt(refreshToken) : null}
        END,
        kakao_refresh_token_expires_at = COALESCE(${refreshExpiresAt}, kakao_refresh_token_expires_at),
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
  return true;
}
