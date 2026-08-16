import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
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
import { isResultAccessToken } from "@/lib/result-access-token";

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
        access_token_hash TEXT,
        report_json TEXT,
        payment_status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(async () => {
      await sql`
        ALTER TABLE woorigunghap_order_records
        ADD COLUMN IF NOT EXISTS access_token_hash TEXT
      `;
    }).catch((error) => {
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

type StoredOrderDraft = Omit<OneToOneOrderDraft, "resultAccessToken">;

function hashAccessToken(accessToken: string) {
  return createHash("sha256").update(accessToken).digest("hex");
}

function stripAccessToken(order: OneToOneOrderDraft): StoredOrderDraft {
  const storedOrder = { ...order } as Partial<OneToOneOrderDraft>;
  delete storedOrder.resultAccessToken;
  return storedOrder as StoredOrderDraft;
}

function parseStoredOrder(raw: unknown): StoredOrderDraft | null {
  if (typeof raw !== "string") return null;
  try {
    const order = JSON.parse(raw) as Partial<StoredOrderDraft>;
    if (
      order.version !== "order-draft-v1"
      || typeof order.paymentId !== "string"
      || typeof order.orderId !== "string"
      || order.product !== "oneToOne"
      || !order.inputSnapshot
    ) return null;
    return order as StoredOrderDraft;
  } catch {
    return null;
  }
}

export function isServerReportStoreConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function saveServerOrderDraft(order: OneToOneOrderDraft) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;

  await sql`
    INSERT INTO woorigunghap_order_records (
      payment_id, order_json, access_token_hash, payment_status
    )
    VALUES (
      ${order.paymentId},
      ${JSON.stringify(stripAccessToken(order))},
      ${hashAccessToken(order.resultAccessToken)},
      ${order.status}
    )
    ON CONFLICT (payment_id) DO UPDATE SET
      order_json = EXCLUDED.order_json,
      access_token_hash = COALESCE(
        woorigunghap_order_records.access_token_hash,
        EXCLUDED.access_token_hash
      ),
      payment_status = CASE
        WHEN woorigunghap_order_records.payment_status = 'paid' THEN 'paid'
        ELSE EXCLUDED.payment_status
      END,
      updated_at = NOW()
  `;
  return true;
}

export async function ensureServerOrderAccessToken(paymentId: string, accessToken: string) {
  if (!isResultAccessToken(accessToken) || !await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const result = await sql`
    UPDATE woorigunghap_order_records
    SET access_token_hash = ${hashAccessToken(accessToken)},
        updated_at = NOW()
    WHERE payment_id = ${paymentId}
    RETURNING payment_id
  `;
  return result.length > 0;
}

export async function loadServerReportForAccess(paymentId: string, accessToken: string) {
  if (!isResultAccessToken(accessToken) || !await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT order_json, report_json, access_token_hash
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    LIMIT 1
  `;
  const row = rows[0];
  const storedHash = typeof row?.access_token_hash === "string"
    ? row.access_token_hash
    : "";
  const candidateHash = hashAccessToken(accessToken);
  if (
    storedHash.length !== candidateHash.length
    || !timingSafeEqual(Buffer.from(storedHash), Buffer.from(candidateHash))
  ) return null;

  const storedOrder = parseStoredOrder(row?.order_json);
  if (!storedOrder || storedOrder.paymentId !== paymentId) return null;
  return {
    order: { ...storedOrder, resultAccessToken: accessToken } as OneToOneOrderDraft,
    progress: parseProgress(row?.report_json, paymentId),
  };
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
