import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import type {
  ActionSegment,
  DynamicsSegment,
  IntroSegment,
  PaidReportSegmentMeta,
  PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import type { OneToOneOrderDraft } from "@/lib/orders";

export const SERVER_REPORT_STORE_VERSION = "server-report-store-v1" as const;

export type ServerReportProgress = {
  version: typeof SERVER_REPORT_STORE_VERSION;
  paymentId: string;
  snapshot: CompatibilityCalculationSnapshot | null;
  facts: PaidReportFacts | null;
  segments: Partial<Record<PaidReportSegmentName, IntroSegment | DynamicsSegment | ActionSegment>>;
  metas: Partial<Record<PaidReportSegmentName, PaidReportSegmentMeta>>;
  updatedAt: string;
};

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
      CREATE TABLE IF NOT EXISTS woorigunghap_order_records (
        payment_id TEXT PRIMARY KEY,
        order_json TEXT NOT NULL,
        report_json TEXT,
        payment_status TEXT NOT NULL DEFAULT 'draft',
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

function parseProgress(raw: unknown, paymentId: string): ServerReportProgress | null {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw) as Partial<ServerReportProgress>;
    if (
      value.version !== SERVER_REPORT_STORE_VERSION
      || value.paymentId !== paymentId
      || !value.segments
      || !value.metas
    ) return null;
    return value as ServerReportProgress;
  } catch {
    return null;
  }
}

function emptyProgress(paymentId: string): ServerReportProgress {
  return {
    version: SERVER_REPORT_STORE_VERSION,
    paymentId,
    snapshot: null,
    facts: null,
    segments: {},
    metas: {},
    updatedAt: new Date().toISOString(),
  };
}

export function isServerReportStoreConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function saveServerOrderDraft(order: OneToOneOrderDraft) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;

  await sql`
    INSERT INTO woorigunghap_order_records (payment_id, order_json, payment_status)
    VALUES (${order.paymentId}, ${JSON.stringify(order)}, ${order.status})
    ON CONFLICT (payment_id) DO UPDATE SET
      order_json = EXCLUDED.order_json,
      payment_status = EXCLUDED.payment_status,
      updated_at = NOW()
  `;
  return true;
}

export async function markServerOrderPaid(paymentId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    UPDATE woorigunghap_order_records
    SET payment_status = 'paid', updated_at = NOW()
    WHERE payment_id = ${paymentId}
  `;
  return true;
}

export async function hasServerOrder(paymentId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const rows = await sql`
    SELECT payment_id
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function loadServerReportProgress(paymentId: string) {
  if (!await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT report_json
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
    LIMIT 1
  `;
  return parseProgress(rows[0]?.report_json, paymentId);
}

async function updateProgress(
  paymentId: string,
  update: (current: ServerReportProgress) => ServerReportProgress,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;

  const rows = await sql`
    SELECT report_json
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
    LIMIT 1
  `;
  const current = parseProgress(rows[0]?.report_json, paymentId) ?? emptyProgress(paymentId);
  const next = { ...update(current), updatedAt: new Date().toISOString() };
  const result = await sql`
    UPDATE woorigunghap_order_records
    SET report_json = ${JSON.stringify(next)}, updated_at = NOW()
    WHERE payment_id = ${paymentId}
    RETURNING payment_id
  `;
  return result.length > 0;
}

export async function saveServerReportPrepared(
  paymentId: string,
  snapshot: CompatibilityCalculationSnapshot,
  facts: PaidReportFacts,
) {
  return updateProgress(paymentId, (current) => ({ ...current, snapshot, facts }));
}

export async function saveServerReportSegment(
  paymentId: string,
  segment: PaidReportSegmentName,
  content: IntroSegment | DynamicsSegment | ActionSegment,
  meta: PaidReportSegmentMeta,
) {
  return updateProgress(paymentId, (current) => ({
    ...current,
    segments: { ...current.segments, [segment]: content },
    metas: { ...current.metas, [segment]: meta },
  }));
}
