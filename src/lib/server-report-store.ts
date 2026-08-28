import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { OneToManyCalculationSnapshot } from "@/lib/compatibility/one-to-many";
import type { OneToManyNarrativeContent, OneToManyNarrativeMeta } from "@/lib/narrative/one-to-many-report-engine";
import type { PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import type {
  ActionSegment,
  DynamicsSegment,
  IntroSegment,
  PaidReportSegmentMeta,
  PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import type { OrderDraft, OneToManyOrderDraft, OneToOneOrderDraft } from "@/lib/orders";
import { isResultAccessToken } from "@/lib/result-access-token";

export const SERVER_REPORT_STORE_VERSION = "server-report-store-v1" as const;
export const ONE_TO_MANY_STORED_REPORT_VERSION = "one-to-many-stored-report-v1" as const;

export type ServerReportProgress = {
  version: typeof SERVER_REPORT_STORE_VERSION;
  paymentId: string;
  snapshot: CompatibilityCalculationSnapshot | null;
  facts: PaidReportFacts | null;
  segments: Partial<Record<PaidReportSegmentName, IntroSegment | DynamicsSegment | ActionSegment>>;
  metas: Partial<Record<PaidReportSegmentName, PaidReportSegmentMeta>>;
  updatedAt: string;
};

export type OneToManyStoredReport = {
  version: typeof ONE_TO_MANY_STORED_REPORT_VERSION;
  paymentId: string;
  snapshot: OneToManyCalculationSnapshot;
  narrative: OneToManyNarrativeContent;
  meta: OneToManyNarrativeMeta;
  updatedAt: string;
};

export type StoredOrderDraft =
  | Omit<OneToOneOrderDraft, "resultAccessToken">
  | Omit<OneToManyOrderDraft, "resultAccessToken">;

export type CompletedAccountReport =
  | {
      product: "oneToOne";
      order: Omit<OneToOneOrderDraft, "resultAccessToken">;
      progress: ServerReportProgress;
    }
  | {
      product: "oneToMany";
      order: Omit<OneToManyOrderDraft, "resultAccessToken">;
      report: OneToManyStoredReport;
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
        generation_status TEXT NOT NULL DEFAULT 'idle',
        generation_started_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(async () => {
      await sql`
        ALTER TABLE woorigunghap_order_records
        ADD COLUMN IF NOT EXISTS access_token_hash TEXT
      `;
      await sql`
        ALTER TABLE woorigunghap_order_records
        ADD COLUMN IF NOT EXISTS generation_status TEXT NOT NULL DEFAULT 'idle'
      `;
      await sql`
        ALTER TABLE woorigunghap_order_records
        ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_webhook_events (
          webhook_id TEXT PRIMARY KEY,
          payment_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'processing',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return true;
}

export async function ensureServerReportStoreSchema() {
  return ensureSchema();
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

function hashAccessToken(accessToken: string) {
  return createHash("sha256").update(accessToken).digest("hex");
}

function stripAccessToken(order: OrderDraft): StoredOrderDraft {
  const storedOrder = { ...order } as Partial<OrderDraft>;
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
      || (order.product !== "oneToOne" && order.product !== "oneToMany")
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

export async function saveServerOrderDraft(order: OrderDraft) {
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
      order_json = CASE
        WHEN woorigunghap_order_records.generation_status = 'deleted' THEN woorigunghap_order_records.order_json
        WHEN woorigunghap_order_records.payment_status = 'paid' THEN woorigunghap_order_records.order_json
        ELSE EXCLUDED.order_json
      END,
      access_token_hash = CASE
        WHEN woorigunghap_order_records.generation_status = 'deleted' THEN NULL
        ELSE COALESCE(
          woorigunghap_order_records.access_token_hash,
          EXCLUDED.access_token_hash
        )
      END,
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
      AND access_token_hash IS NULL
      AND generation_status <> 'deleted'
    RETURNING payment_id
  `;
  return result.length > 0;
}

export async function hasServerOrderAccess(
  paymentId: string,
  accessToken: string,
  product?: OrderDraft["product"],
) {
  return Boolean(await loadServerOrderForAccess(paymentId, accessToken, product));
}

async function loadServerOrderRecordForAccess(
  paymentId: string,
  accessToken: string,
  product?: OrderDraft["product"],
) {
  if (!isResultAccessToken(accessToken) || !await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT order_json, access_token_hash, payment_status, generation_status
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
    LIMIT 1
  `;
  const row = rows[0];
  const storedHash = typeof row?.access_token_hash === "string" ? row.access_token_hash : "";
  const candidateHash = hashAccessToken(accessToken);
  if (
    storedHash.length !== candidateHash.length
    || !timingSafeEqual(Buffer.from(storedHash), Buffer.from(candidateHash))
  ) return null;
  const order = parseStoredOrder(row?.order_json);
  if (!order || order.paymentId !== paymentId || (product && order.product !== product)) return null;
  return {
    order: { ...order, resultAccessToken: accessToken } as OrderDraft,
    paymentStatus: typeof row?.payment_status === "string" ? row.payment_status : "unknown",
    generationStatus: typeof row?.generation_status === "string" ? row.generation_status : "unknown",
  };
}

export async function loadServerOrderForAccess(
  paymentId: string,
  accessToken: string,
  product?: OrderDraft["product"],
) {
  const record = await loadServerOrderRecordForAccess(paymentId, accessToken, product);
  return record?.order ?? null;
}

export async function loadServerOrderPaymentState(
  paymentId: string,
  accessToken: string,
  product?: OrderDraft["product"],
) {
  return loadServerOrderRecordForAccess(paymentId, accessToken, product);
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
    order: { ...storedOrder, resultAccessToken: accessToken } as OrderDraft,
    progress: parseProgress(row?.report_json, paymentId),
  };
}

function parseOneToManyStoredReport(raw: unknown, paymentId: string): OneToManyStoredReport | null {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw) as Partial<OneToManyStoredReport>;
    if (
      value.version !== ONE_TO_MANY_STORED_REPORT_VERSION
      || value.paymentId !== paymentId
      || !value.snapshot
      || !value.narrative
      || !value.meta
    ) return null;
    return value as OneToManyStoredReport;
  } catch {
    return null;
  }
}

function isCompleteOneToOneProgress(progress: ServerReportProgress | null): progress is ServerReportProgress {
  return Boolean(
    progress?.snapshot
    && progress.facts
    && progress.segments.intro
    && progress.segments.dynamics
    && progress.segments.action,
  );
}

export async function loadCompletedServerReport(paymentId: string): Promise<CompletedAccountReport | null> {
  if (!await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT order_json, report_json
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND report_json IS NOT NULL
    LIMIT 1
  `;
  const row = rows[0];
  const order = parseStoredOrder(row?.order_json);
  if (!order || order.paymentId !== paymentId) return null;

  if (order.product === "oneToOne") {
    const progress = parseProgress(row?.report_json, paymentId);
    if (!isCompleteOneToOneProgress(progress)) return null;
    return { product: "oneToOne", order, progress };
  }

  const report = parseOneToManyStoredReport(row?.report_json, paymentId);
  if (!report) return null;
  return { product: "oneToMany", order, report };
}

export async function loadCompletedServerReportForAccess(
  paymentId: string,
  accessToken: string,
) {
  const recovered = await loadServerReportForAccess(paymentId, accessToken);
  if (!recovered) return null;
  const completed = await loadCompletedServerReport(paymentId);
  if (!completed || completed.product !== recovered.order.product) return null;
  return completed;
}

export async function loadOneToManyReportForAccess(paymentId: string, accessToken: string) {
  const recovered = await loadServerReportForAccess(paymentId, accessToken);
  if (!recovered || recovered.order.product !== "oneToMany") return null;
  const report = await loadOneToManyStoredReport(paymentId);
  return { order: recovered.order as OneToManyOrderDraft, report };
}

export async function loadOneToManyStoredReport(paymentId: string) {
  if (!await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT report_json
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    LIMIT 1
  `;
  return parseOneToManyStoredReport(rows[0]?.report_json, paymentId);
}

export async function claimOneToManyGeneration(paymentId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const rows = await sql`
    UPDATE woorigunghap_order_records
    SET generation_status = 'generating', generation_started_at = NOW(), updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND report_json IS NULL
      AND generation_status <> 'deleted'
      AND (
        generation_status <> 'generating'
        OR generation_started_at IS NULL
        OR generation_started_at < NOW() - INTERVAL '5 minutes'
      )
    RETURNING payment_id
  `;
  return rows.length > 0;
}

export async function saveOneToManyStoredReport(
  paymentId: string,
  snapshot: OneToManyCalculationSnapshot,
  narrative: OneToManyNarrativeContent,
  meta: OneToManyNarrativeMeta,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const report: OneToManyStoredReport = {
    version: ONE_TO_MANY_STORED_REPORT_VERSION,
    paymentId,
    snapshot,
    narrative,
    meta,
    updatedAt: new Date().toISOString(),
  };
  const rows = await sql`
    UPDATE woorigunghap_order_records
    SET report_json = ${JSON.stringify(report)},
        generation_status = 'complete',
        updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
      AND generation_status <> 'deleted'
    RETURNING payment_id
  `;
  return rows.length > 0;
}

export async function releaseOneToManyGeneration(paymentId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    UPDATE woorigunghap_order_records
    SET generation_status = 'idle', generation_started_at = NULL, updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND report_json IS NULL
      AND generation_status = 'generating'
  `;
  return true;
}

export async function claimPaymentWebhook(webhookId: string, paymentId: string, eventType: string) {
  if (!await ensureSchema()) return "unavailable" as const;
  const sql = getQuery();
  if (!sql) return "unavailable" as const;
  const inserted = await sql`
    INSERT INTO woorigunghap_webhook_events (webhook_id, payment_id, event_type, status)
    VALUES (${webhookId}, ${paymentId}, ${eventType}, 'processing')
    ON CONFLICT (webhook_id) DO NOTHING
    RETURNING webhook_id
  `;
  if (inserted.length > 0) return "claimed" as const;

  const rows = await sql`
    SELECT status, payment_id, event_type, updated_at
    FROM woorigunghap_webhook_events
    WHERE webhook_id = ${webhookId}
    LIMIT 1
  `;
  const row = rows[0];
  if (row?.payment_id !== paymentId || row?.event_type !== eventType) return "conflict" as const;
  if (row?.status === "processed") return "processed" as const;

  const reclaimed = await sql`
    UPDATE woorigunghap_webhook_events
    SET status = 'processing', updated_at = NOW()
    WHERE webhook_id = ${webhookId}
      AND payment_id = ${paymentId}
      AND event_type = ${eventType}
      AND (
        status = 'failed'
        OR (status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes')
      )
    RETURNING webhook_id
  `;
  if (reclaimed.length > 0) return "claimed" as const;
  return "in_progress" as const;
}

export async function completePaymentWebhook(webhookId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    UPDATE woorigunghap_webhook_events
    SET status = 'processed', updated_at = NOW()
    WHERE webhook_id = ${webhookId}
  `;
  return true;
}

export async function failPaymentWebhook(webhookId: string) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    UPDATE woorigunghap_webhook_events
    SET status = 'failed', updated_at = NOW()
    WHERE webhook_id = ${webhookId}
      AND status = 'processing'
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
      AND generation_status <> 'deleted'
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
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;

  const baseProgress = JSON.stringify(emptyProgress(paymentId));
  const updatedAt = new Date().toISOString();
  const rows = await sql`
    UPDATE woorigunghap_order_records
    SET report_json = jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(NULLIF(report_json, ''), ${baseProgress})::jsonb,
              ARRAY['segments', ${segment}]::text[],
              ${JSON.stringify(content)}::jsonb,
              true
            ),
            ARRAY['metas', ${segment}]::text[],
            ${JSON.stringify(meta)}::jsonb,
            true
          ),
          ARRAY['updatedAt']::text[],
          to_jsonb(${updatedAt}::text),
          true
        )::text,
        updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    RETURNING payment_id
  `;
  return rows.length > 0;
}
