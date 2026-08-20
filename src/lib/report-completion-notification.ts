import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { findAccountReportOwnerUserId } from "@/lib/account-report-store";
import { loadKakaoChannelNotificationTarget } from "@/lib/kakao-channel-notification-store";
import { loadCompletedServerReport } from "@/lib/server-report-store";
import {
  isKakaoChannelNotificationConfigured,
  sendKakaoChannelReportCompleted,
} from "@/lib/solapi-alimtalk";

let query: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getQuery() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!query) query = neon(connectionString);
  return query;
}

async function ensureNotificationSchema() {
  const sql = getQuery();
  if (!sql) return false;
  if (!schemaPromise) {
    schemaPromise = sql`
      CREATE TABLE IF NOT EXISTS woorigunghap_channel_notifications (
        payment_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES woorigunghap_users(user_id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'sending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

async function claimNotification(paymentId: string, userId: string) {
  if (!await ensureNotificationSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const inserted = await sql`
    INSERT INTO woorigunghap_channel_notifications (payment_id, user_id, status)
    VALUES (${paymentId}, ${userId}, 'sending')
    ON CONFLICT (payment_id) DO NOTHING
    RETURNING payment_id
  `;
  if (inserted.length > 0) return true;
  const reclaimed = await sql`
    UPDATE woorigunghap_channel_notifications
    SET status = 'sending', user_id = ${userId}, updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND status = 'failed'
    RETURNING payment_id
  `;
  return reclaimed.length > 0;
}

async function finishNotification(paymentId: string, status: "sent" | "failed") {
  const sql = getQuery();
  if (!sql) return;
  await sql`
    UPDATE woorigunghap_channel_notifications
    SET status = ${status}, updated_at = NOW()
    WHERE payment_id = ${paymentId}
  `;
}

export async function notifyReportCompleted(paymentId: string) {
  let claimed = false;
  try {
    const completed = await loadCompletedServerReport(paymentId);
    if (!completed) return false;
    const userId = await findAccountReportOwnerUserId(paymentId);
    if (!userId) return false;
    if (!isKakaoChannelNotificationConfigured()) return false;
    const target = await loadKakaoChannelNotificationTarget(userId);
    if (!target) return false;

    claimed = await claimNotification(paymentId, userId);
    if (!claimed) return false;
    await sendKakaoChannelReportCompleted(target.phoneNumber);
    await finishNotification(paymentId, "sent");
    return true;
  } catch (error) {
    if (claimed) await finishNotification(paymentId, "failed").catch(() => undefined);
    console.error(
      "[woorigunghap:kakao-channel-completion-notification]",
      error instanceof Error ? `${error.name}:${error.message}` : "unknown",
    );
    return false;
  }
}
