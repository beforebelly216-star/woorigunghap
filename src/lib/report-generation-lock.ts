import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { PaidReportSegmentName } from "@/lib/narrative/report-engine-v7";

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
      CREATE TABLE IF NOT EXISTS woorigunghap_report_segment_claims (
        payment_id TEXT NOT NULL REFERENCES woorigunghap_order_records(payment_id) ON DELETE CASCADE,
        segment TEXT NOT NULL CHECK (segment IN ('intro', 'dynamics', 'action')),
        status TEXT NOT NULL DEFAULT 'generating',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (payment_id, segment)
      )
    `.then(() => undefined).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

export async function claimReportSegmentGeneration(
  paymentId: string,
  segment: PaidReportSegmentName,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;

  const rows = await sql`
    INSERT INTO woorigunghap_report_segment_claims (
      payment_id, segment, status, started_at, updated_at
    ) VALUES (
      ${paymentId}, ${segment}, 'generating', NOW(), NOW()
    )
    ON CONFLICT (payment_id, segment) DO UPDATE SET
      status = 'generating',
      started_at = NOW(),
      updated_at = NOW()
    WHERE woorigunghap_report_segment_claims.status = 'failed'
       OR (
         woorigunghap_report_segment_claims.status = 'generating'
         AND woorigunghap_report_segment_claims.updated_at < NOW() - INTERVAL '5 minutes'
       )
    RETURNING payment_id
  `;
  return rows.length > 0;
}

export async function completeReportSegmentGeneration(
  paymentId: string,
  segment: PaidReportSegmentName,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    UPDATE woorigunghap_report_segment_claims
    SET status = 'complete', updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND segment = ${segment}
  `;
  return true;
}

export async function releaseReportSegmentGeneration(
  paymentId: string,
  segment: PaidReportSegmentName,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  await sql`
    UPDATE woorigunghap_report_segment_claims
    SET status = 'failed', updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND segment = ${segment}
      AND status = 'generating'
  `;
  return true;
}
