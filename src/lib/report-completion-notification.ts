import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { findAccountReportOwnerUserId } from "@/lib/account-report-store";
import {
  getKakaoAuthConfig,
  refreshKakaoAccessToken,
  sendKakaoMemo,
} from "@/lib/kakao-auth";
import {
  loadKakaoMessagingTokens,
  updateKakaoAccessToken,
} from "@/lib/kakao-token-store";
import { loadCompletedServerReport } from "@/lib/server-report-store";

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
      CREATE TABLE IF NOT EXISTS woorigunghap_report_notifications (
        payment_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
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

function appBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function resolveAccessToken(userId: string) {
  const stored = await loadKakaoMessagingTokens(userId);
  if (!stored) return null;
  if (stored.accessExpiresAt.getTime() > Date.now() + 60_000) return stored.accessToken;
  if (
    !stored.refreshToken
    || (stored.refreshExpiresAt && stored.refreshExpiresAt.getTime() <= Date.now() + 60_000)
  ) return null;
  const config = getKakaoAuthConfig();
  if (!config) return null;
  const refreshed = await refreshKakaoAccessToken(config, stored.refreshToken);
  await updateKakaoAccessToken(
    userId,
    refreshed.accessToken,
    refreshed.expiresInSeconds,
    refreshed.refreshToken,
    refreshed.refreshTokenExpiresInSeconds,
  );
  return refreshed.accessToken;
}

async function claimNotification(paymentId: string, userId: string) {
  if (!await ensureNotificationSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const inserted = await sql`
    INSERT INTO woorigunghap_report_notifications (payment_id, user_id, status)
    VALUES (${paymentId}, ${userId}, 'sending')
    ON CONFLICT (payment_id) DO NOTHING
    RETURNING payment_id
  `;
  if (inserted.length > 0) return true;
  const reclaimed = await sql`
    UPDATE woorigunghap_report_notifications
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
    UPDATE woorigunghap_report_notifications
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
    const accessToken = await resolveAccessToken(userId);
    const origin = appBaseUrl();
    if (!accessToken || !origin) return false;
    claimed = await claimNotification(paymentId, userId);
    if (!claimed) return false;
    const url = `${origin}/account/reports`;
    await sendKakaoMemo(
      accessToken,
      "우리궁합 결과 생성이 완료됐어요. 보관함에서 구매한 결과를 확인해 보세요.",
      url,
    );
    await finishNotification(paymentId, "sent");
    return true;
  } catch (error) {
    if (claimed) await finishNotification(paymentId, "failed").catch(() => undefined);
    console.error("[woorigunghap:kakao-completion-notification]", error);
    return false;
  }
}
