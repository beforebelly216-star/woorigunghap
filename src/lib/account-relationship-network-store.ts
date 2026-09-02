import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  hashOpaqueToken,
  isOpaqueToken,
  opaqueTokensMatch,
} from "@/lib/auth-policy";
import { ensureAuthStoreSchema } from "@/lib/auth-store";
import { ensureRelationshipNetworkStoreSchema } from "@/lib/relationship-network-store";

const TOKEN_CIPHER_VERSION = "v1";
const TOKEN_CIPHER_CONTEXT = "woorigunghap-account-relationship-network-token-v1";

export type AccountRelationshipNetworkSummary = {
  token: string;
  hostName: string;
  memberCount: number;
  isOpen: boolean;
  expiresAt: string;
  savedAt: string;
};

export type ClaimAccountRelationshipNetworkResult =
  | "claimed"
  | "missing"
  | "conflict"
  | "unavailable";

let query: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getQuery() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;
  if (!query) query = neon(connectionString);
  return query;
}

function getTokenCipherKey() {
  const dedicatedSecret = process.env.NETWORK_PII_ENCRYPTION_KEY?.trim();
  const developmentFallback = process.env.NODE_ENV === "production"
    ? ""
    : process.env.PORTONE_WEBHOOK_SECRET?.trim();
  const secret = dedicatedSecret || developmentFallback;
  if (!secret) return null;
  return createHash("sha256")
    .update(`${TOKEN_CIPHER_CONTEXT}:${secret}`)
    .digest();
}

function encryptNetworkToken(token: string) {
  const key = getTokenCipherKey();
  if (!key || !isOpaqueToken(token)) throw new Error("ACCOUNT_NETWORK_TOKEN_CIPHER_UNAVAILABLE");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(TOKEN_CIPHER_CONTEXT, "utf8"));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    TOKEN_CIPHER_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptNetworkToken(value: string) {
  const key = getTokenCipherKey();
  if (!key) throw new Error("ACCOUNT_NETWORK_TOKEN_CIPHER_UNAVAILABLE");
  const [version, encodedIv, encodedTag, encodedPayload] = value.split(".");
  if (version !== TOKEN_CIPHER_VERSION || !encodedIv || !encodedTag || !encodedPayload) {
    throw new Error("ACCOUNT_NETWORK_TOKEN_CIPHERTEXT_INVALID");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encodedIv, "base64url"));
  decipher.setAAD(Buffer.from(TOKEN_CIPHER_CONTEXT, "utf8"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const token = Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  if (!isOpaqueToken(token)) throw new Error("ACCOUNT_NETWORK_TOKEN_CIPHERTEXT_INVALID");
  return token;
}

function toIsoString(value: unknown) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("ACCOUNT_NETWORK_DATE_INVALID");
  return date.toISOString();
}

async function ensureSchema() {
  const sql = getQuery();
  if (!sql || !getTokenCipherKey()) return false;
  if (!schemaPromise) {
    schemaPromise = Promise.all([
      ensureAuthStoreSchema(),
      ensureRelationshipNetworkStoreSchema(),
    ]).then(async ([authReady, networkReady]) => {
      if (!authReady || !networkReady) throw new Error("account_relationship_network_store_unavailable");
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_account_relationship_networks (
          token_hash TEXT PRIMARY KEY
            REFERENCES woorigunghap_relationship_networks(token_hash) ON DELETE CASCADE,
          user_id TEXT NOT NULL
            REFERENCES woorigunghap_users(user_id) ON DELETE CASCADE,
          network_token_ciphertext TEXT NOT NULL,
          claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_account_relationship_networks_user_claimed_idx
        ON woorigunghap_account_relationship_networks(user_id, claimed_at DESC)
      `;
    }).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

export async function ensureAccountRelationshipNetworkStoreSchema() {
  return ensureSchema();
}

export async function claimAccountRelationshipNetwork(input: {
  userId: string;
  token: string;
  ownerToken: string;
}): Promise<ClaimAccountRelationshipNetworkResult> {
  if (!input.userId || !isOpaqueToken(input.token) || !isOpaqueToken(input.ownerToken)) {
    return "missing";
  }
  if (!await ensureSchema()) return "unavailable";
  const sql = getQuery();
  if (!sql) return "unavailable";

  const tokenHash = hashOpaqueToken(input.token);
  const ownerTokenHash = hashOpaqueToken(input.ownerToken);
  const tokenCiphertext = encryptNetworkToken(input.token);
  const rows = await sql`
    INSERT INTO woorigunghap_account_relationship_networks (
      token_hash, user_id, network_token_ciphertext
    )
    SELECT token_hash, ${input.userId}, ${tokenCiphertext}
    FROM woorigunghap_relationship_networks
    WHERE token_hash = ${tokenHash}
      AND owner_token_hash = ${ownerTokenHash}
      AND expires_at > NOW()
    ON CONFLICT (token_hash) DO UPDATE SET
      network_token_ciphertext = EXCLUDED.network_token_ciphertext,
      updated_at = NOW()
    WHERE woorigunghap_account_relationship_networks.user_id = EXCLUDED.user_id
    RETURNING user_id
  `;
  if (rows[0]?.user_id === input.userId) return "claimed";

  const diagnosis = await sql`
    SELECT account.user_id
    FROM woorigunghap_relationship_networks network
    LEFT JOIN woorigunghap_account_relationship_networks account
      ON account.token_hash = network.token_hash
    WHERE network.token_hash = ${tokenHash}
      AND network.owner_token_hash = ${ownerTokenHash}
      AND network.expires_at > NOW()
    LIMIT 1
  `;
  if (!diagnosis[0]) return "missing";
  return typeof diagnosis[0].user_id === "string" && diagnosis[0].user_id !== input.userId
    ? "conflict"
    : "claimed";
}

export async function listAccountRelationshipNetworks(
  userId: string,
): Promise<AccountRelationshipNetworkSummary[]> {
  if (!userId || !await ensureSchema()) return [];
  const sql = getQuery();
  if (!sql) return [];
  const rows = await sql`
    SELECT
      account.token_hash,
      account.network_token_ciphertext,
      account.claimed_at,
      network.status,
      network.expires_at,
      host.display_name AS host_name,
      (
        SELECT COUNT(*)::int
        FROM woorigunghap_relationship_network_members member_count
        WHERE member_count.token_hash = network.token_hash
          AND member_count.status = 'active'
      ) AS member_count
    FROM woorigunghap_account_relationship_networks account
    JOIN woorigunghap_relationship_networks network
      ON network.token_hash = account.token_hash
    JOIN woorigunghap_relationship_network_members host
      ON host.token_hash = network.token_hash
      AND host.member_id = network.host_member_id
      AND host.status = 'active'
    WHERE account.user_id = ${userId}
      AND network.expires_at > NOW()
    ORDER BY account.claimed_at DESC
  `;

  return rows.flatMap((row) => {
    try {
      const token = decryptNetworkToken(String(row.network_token_ciphertext));
      if (!opaqueTokensMatch(hashOpaqueToken(token), String(row.token_hash))) return [];
      return [{
        token,
        hostName: String(row.host_name).trim().slice(0, 40) || "내",
        memberCount: Math.max(1, Number(row.member_count) || 1),
        isOpen: row.status === "active",
        expiresAt: toIsoString(row.expires_at),
        savedAt: toIsoString(row.claimed_at),
      } satisfies AccountRelationshipNetworkSummary];
    } catch {
      return [];
    }
  });
}
