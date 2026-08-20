import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { ensureAuthStoreSchema } from "@/lib/auth-store";

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
  if (!key) throw new Error("notification_encryption_key_missing");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("notification_encryption_key_missing");
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("invalid_notification_ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function normalizeKoreanMobileNumber(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8210") && digits.length === 12) digits = `0${digits.slice(2)}`;
  if (!/^010\d{8}$/.test(digits)) return null;
  return digits;
}

export function maskMobileNumber(value: string) {
  return `${value.slice(0, 3)}-****-${value.slice(-4)}`;
}

async function ensureSchema() {
  const sql = getQuery();
  if (!sql || !encryptionKey()) return false;
  if (!schemaPromise) {
    schemaPromise = ensureAuthStoreSchema().then(async (ready) => {
      if (!ready) throw new Error("auth_store_unavailable");
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_channel_phone_ciphertext TEXT`;
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_channel_notify_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE woorigunghap_users ADD COLUMN IF NOT EXISTS kakao_channel_notify_consented_at TIMESTAMPTZ`;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

export async function saveKakaoChannelNotificationTarget(userId: string, phoneNumber: string) {
  const normalized = normalizeKoreanMobileNumber(phoneNumber);
  if (!normalized) throw new Error("invalid_notification_phone");
  if (!await ensureSchema()) throw new Error("notification_store_unavailable");
  const sql = getQuery();
  if (!sql) throw new Error("notification_store_unavailable");
  await sql`
    UPDATE woorigunghap_users
    SET kakao_channel_phone_ciphertext = ${encrypt(normalized)},
        kakao_channel_notify_enabled = TRUE,
        kakao_channel_notify_consented_at = NOW(),
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
  return { enabled: true, phoneMasked: maskMobileNumber(normalized) };
}

export async function disableKakaoChannelNotification(userId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    UPDATE woorigunghap_users
    SET kakao_channel_phone_ciphertext = NULL,
        kakao_channel_notify_enabled = FALSE,
        kakao_channel_notify_consented_at = NULL,
        updated_at = NOW()
    WHERE user_id = ${userId}
  `;
  return true;
}

export async function loadKakaoChannelNotificationPreference(userId: string) {
  if (!await ensureSchema()) return { enabled: false, phoneMasked: null };
  const sql = getQuery();
  if (!sql) return { enabled: false, phoneMasked: null };
  const rows = await sql`
    SELECT kakao_channel_phone_ciphertext, kakao_channel_notify_enabled
    FROM woorigunghap_users
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (row?.kakao_channel_notify_enabled !== true || typeof row.kakao_channel_phone_ciphertext !== "string") {
    return { enabled: false, phoneMasked: null };
  }
  const phoneNumber = decrypt(row.kakao_channel_phone_ciphertext);
  return { enabled: true, phoneMasked: maskMobileNumber(phoneNumber) };
}

export async function loadKakaoChannelNotificationTarget(userId: string) {
  if (!await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT kakao_channel_phone_ciphertext, kakao_channel_notify_enabled
    FROM woorigunghap_users
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (row?.kakao_channel_notify_enabled !== true || typeof row.kakao_channel_phone_ciphertext !== "string") return null;
  const phoneNumber = normalizeKoreanMobileNumber(decrypt(row.kakao_channel_phone_ciphertext));
  return phoneNumber ? { phoneNumber } : null;
}
