import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { ensureAuthStoreSchema } from "@/lib/auth-store";
import { RELATIONSHIP_LABELS } from "@/lib/report-input";
import {
  ensureServerReportStoreSchema,
  loadCompletedServerReport,
  type CompletedAccountReport,
  type StoredOrderDraft,
} from "@/lib/server-report-store";

export type AccountReportSummary = {
  paymentId: string;
  product: "oneToOne" | "oneToMany";
  productLabel: string;
  relationshipLabel: string;
  title: string;
  createdAt: string;
  claimedAt: string;
  status: "generating" | "ready";
};

let query: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getQuery() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!query) query = neon(connectionString);
  return query;
}

async function ensureAccountReportSchema() {
  const sql = getQuery();
  if (!sql) return false;
  if (!schemaPromise) {
    schemaPromise = Promise.all([
      ensureAuthStoreSchema(),
      ensureServerReportStoreSchema(),
    ]).then(async ([authReady, reportReady]) => {
      if (!authReady || !reportReady) throw new Error("account_report_store_unavailable");
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_account_reports (
          payment_id TEXT PRIMARY KEY REFERENCES woorigunghap_order_records(payment_id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES woorigunghap_users(user_id) ON DELETE CASCADE,
          product TEXT NOT NULL CHECK (product IN ('oneToOne', 'oneToMany')),
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_account_reports_user_claimed_idx
        ON woorigunghap_account_reports(user_id, claimed_at DESC)
      `;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

function parseStoredOrder(raw: unknown): StoredOrderDraft | null {
  if (typeof raw !== "string") return null;
  try {
    const order = JSON.parse(raw) as Partial<StoredOrderDraft>;
    if (
      order.version !== "order-draft-v1"
      || typeof order.paymentId !== "string"
      || typeof order.orderId !== "string"
      || (order.product !== "oneToOne" && order.product !== "oneToMany")
      || typeof order.createdAt !== "string"
      || !order.inputSnapshot
    ) return null;
    return order as StoredOrderDraft;
  } catch {
    return null;
  }
}

function summarizeOrder(
  order: StoredOrderDraft,
  claimedAt: string,
  status: AccountReportSummary["status"],
): AccountReportSummary {
  const relationshipLabel = RELATIONSHIP_LABELS[order.inputSnapshot.relationshipType];
  if (order.product === "oneToOne") {
    return {
      paymentId: order.paymentId,
      product: order.product,
      productLabel: "1:1 궁합",
      relationshipLabel,
      title: `${order.inputSnapshot.personA.displayName} × ${order.inputSnapshot.personB.displayName}`,
      createdAt: order.createdAt,
      claimedAt,
      status,
    };
  }
  return {
    paymentId: order.paymentId,
    product: order.product,
    productLabel: "1:다 비교",
    relationshipLabel,
    title: `${order.inputSnapshot.referencePerson.displayName} 외 ${order.inputSnapshot.candidates.length}명 비교`,
    createdAt: order.createdAt,
    claimedAt,
    status,
  };
}

export async function claimAccountReport(
  userId: string,
  paymentId: string,
  product: "oneToOne" | "oneToMany",
) {
  if (!await ensureAccountReportSchema()) return "unavailable" as const;
  const sql = getQuery();
  if (!sql) return "unavailable" as const;
  const rows = await sql`
    INSERT INTO woorigunghap_account_reports (payment_id, user_id, product)
    SELECT payment_id, ${userId}, ${product}
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    ON CONFLICT (payment_id) DO UPDATE SET
      updated_at = NOW()
    WHERE woorigunghap_account_reports.user_id = EXCLUDED.user_id
    RETURNING user_id
  `;
  if (rows[0]?.user_id === userId) return "claimed" as const;
  return "conflict" as const;
}

export async function listAccountReports(userId: string): Promise<AccountReportSummary[]> {
  if (!await ensureAccountReportSchema()) return [];
  const sql = getQuery();
  if (!sql) return [];
  const rows = await sql`
    SELECT records.payment_id, records.order_json, account.claimed_at
    FROM woorigunghap_account_reports account
    JOIN woorigunghap_order_records records ON records.payment_id = account.payment_id
    WHERE account.user_id = ${userId}
      AND records.payment_status = 'paid'
    ORDER BY account.claimed_at DESC
  `;

  const reports = await Promise.all(rows.map(async (row) => {
    const order = parseStoredOrder(row.order_json);
    const claimedAt = row.claimed_at instanceof Date
      ? row.claimed_at.toISOString()
      : typeof row.claimed_at === "string" ? row.claimed_at : null;
    if (!order || !claimedAt) return null;
    const completed = await loadCompletedServerReport(order.paymentId);
    return summarizeOrder(order, claimedAt, completed ? "ready" : "generating");
  }));
  return reports.filter((report): report is AccountReportSummary => Boolean(report));
}

export async function findAccountReportOwnerUserId(paymentId: string) {
  if (!await ensureAccountReportSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT user_id
    FROM woorigunghap_account_reports
    WHERE payment_id = ${paymentId}
    LIMIT 1
  `;
  return typeof rows[0]?.user_id === "string" ? rows[0].user_id : null;
}

export async function loadOwnedAccountReport(
  userId: string,
  paymentId: string,
): Promise<CompletedAccountReport | null> {
  if (!await ensureAccountReportSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const ownership = await sql`
    SELECT payment_id
    FROM woorigunghap_account_reports
    WHERE user_id = ${userId}
      AND payment_id = ${paymentId}
    LIMIT 1
  `;
  if (ownership.length === 0) return null;
  return loadCompletedServerReport(paymentId);
}

export async function deleteAccountAndScrubReports(userId: string) {
  if (!await ensureAccountReportSchema()) throw new Error("account_report_store_unavailable");
  const sql = getQuery();
  if (!sql) throw new Error("account_report_store_unavailable");

  const rows = await sql`
    WITH target_user AS (
      SELECT provider_user_id
      FROM woorigunghap_users
      WHERE user_id = ${userId}
    ), owned AS (
      SELECT payment_id
      FROM woorigunghap_account_reports
      WHERE user_id = ${userId}
    ), scrubbed AS (
      UPDATE woorigunghap_order_records records
      SET order_json = jsonb_build_object(
            'version', 'legal-retention-v1',
            'paymentId', records.payment_id,
            'orderId', COALESCE(records.order_json::jsonb ->> 'orderId', ''),
            'product', COALESCE(records.order_json::jsonb ->> 'product', ''),
            'amount', COALESCE((records.order_json::jsonb ->> 'amount')::int, 0),
            'status', records.payment_status,
            'createdAt', records.created_at,
            'retainedFor', 'electronic-commerce-record'
          )::text,
          report_json = NULL,
          access_token_hash = NULL,
          generation_status = 'deleted',
          generation_started_at = NULL,
          updated_at = NOW()
      WHERE records.payment_id IN (SELECT payment_id FROM owned)
      RETURNING records.payment_id
    ), deleted AS (
      DELETE FROM woorigunghap_users
      WHERE user_id = ${userId}
      RETURNING user_id
    )
    SELECT provider_user_id FROM target_user
  `;

  return typeof rows[0]?.provider_user_id === "string"
    ? { providerUserId: rows[0].provider_user_id }
    : null;
}
