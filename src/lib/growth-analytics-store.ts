import "server-only";

import { randomUUID } from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { hashOpaqueToken, isOpaqueToken } from "@/lib/auth-policy";
import type { GrowthAnalyticsEvent } from "@/lib/growth-analytics-contract";
import { ensurePublicShareStoreSchema } from "@/lib/share/public-share-store";

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
    schemaPromise = ensurePublicShareStoreSchema().then(async (publicShareReady) => {
      if (!publicShareReady) throw new Error("growth_analytics_store_unavailable");
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_growth_events (
          event_id TEXT PRIMARY KEY,
          event_name TEXT NOT NULL,
          product TEXT NOT NULL CHECK (product IN ('oneToOne', 'oneToMany')),
          relationship_type TEXT NOT NULL CHECK (relationship_type IN ('crush', 'flirting', 'lover', 'friend', 'coworker')),
          surface TEXT NOT NULL CHECK (surface IN ('one_to_one_share_card', 'one_to_many_share_card', 'shared_view')),
          share_purpose TEXT,
          reaction TEXT,
          cta_target TEXT,
          public_share_token_hash TEXT REFERENCES woorigunghap_public_shares(token_hash) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_growth_events_name_created_idx
        ON woorigunghap_growth_events (event_name, created_at DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_growth_events_share_created_idx
        ON woorigunghap_growth_events (public_share_token_hash, created_at DESC)
      `;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return true;
}

export async function recordGrowthEvent(event: GrowthAnalyticsEvent) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;

  let tokenHash: string | null = null;
  if (event.shareToken) {
    if (!isOpaqueToken(event.shareToken)) return false;
    tokenHash = hashOpaqueToken(event.shareToken);
    const shareRows = await sql`
      SELECT token_hash
      FROM woorigunghap_public_shares
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;
    if (shareRows.length === 0) return false;
  }

  await sql`
    INSERT INTO woorigunghap_growth_events (
      event_id,
      event_name,
      product,
      relationship_type,
      surface,
      share_purpose,
      reaction,
      cta_target,
      public_share_token_hash
    )
    VALUES (
      ${randomUUID()},
      ${event.eventName},
      ${event.product},
      ${event.relationshipType},
      ${event.surface},
      ${event.sharePurpose ?? null},
      ${event.reaction ?? null},
      ${event.ctaTarget ?? null},
      ${tokenHash}
    )
  `;
  return true;
}
