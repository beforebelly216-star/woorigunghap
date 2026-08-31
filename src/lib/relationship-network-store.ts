import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  hashOpaqueToken,
  isOpaqueToken,
  opaqueTokensMatch,
} from "@/lib/auth-policy";
import {
  calculateOneToOneCompatibility,
  COMPATIBILITY_ENGINE_VERSION,
} from "@/lib/compatibility/engine";
import { COMPATIBILITY_SCORING_VERSION } from "@/lib/compatibility/weights";
import {
  getRelationshipNetworkGrade,
  normalizeRelationshipNetworkName,
  RELATIONSHIP_NETWORK_DIMENSION_LABELS,
  RELATIONSHIP_NETWORK_GRADES,
  RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION,
  RELATIONSHIP_NETWORK_MEMBER_LIMIT,
  RELATIONSHIP_NETWORK_VERSION,
  relationshipNetworkPairKey,
  type RelationshipNetworkEdge,
  type RelationshipNetworkGrade,
  type RelationshipNetworkPublic,
  type RelationshipNetworkStoredMember,
} from "@/lib/relationship-network-contract";
import {
  parsePersonBirthInput,
  type PersonBirthInput,
} from "@/lib/report-input";

const NETWORK_CONSENT_VERSION = "relationship-network-consent-v1";
const NETWORK_RETENTION_DAYS = 30;
const PENDING_MEMBER_TTL_MINUTES = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let query: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

function getQuery() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) return null;
  if (!query) query = neon(connectionString);
  return query;
}

function getEncryptionKey() {
  const dedicatedSecret = process.env.NETWORK_PII_ENCRYPTION_KEY?.trim();
  const developmentFallback = process.env.NODE_ENV === "production"
    ? ""
    : process.env.PORTONE_WEBHOOK_SECRET?.trim();
  const secret = dedicatedSecret || developmentFallback;
  if (!secret) return null;
  return createHash("sha256")
    .update(`woorigunghap-network-pii-v1:${secret}`)
    .digest();
}

function encryptPerson(person: PersonBirthInput) {
  const key = getEncryptionKey();
  if (!key) throw new Error("RELATIONSHIP_NETWORK_ENCRYPTION_NOT_CONFIGURED");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(person), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptPerson(value: string) {
  const key = getEncryptionKey();
  if (!key) throw new Error("RELATIONSHIP_NETWORK_ENCRYPTION_NOT_CONFIGURED");
  const [version, encodedIv, encodedTag, encodedPayload] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedPayload) {
    throw new Error("RELATIONSHIP_NETWORK_BIRTH_PAYLOAD_INVALID");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const decoded = Buffer.concat([
    decipher.update(Buffer.from(encodedPayload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  const person = parsePersonBirthInput(JSON.parse(decoded));
  if (!person) throw new Error("RELATIONSHIP_NETWORK_BIRTH_PAYLOAD_INVALID");
  return person;
}

function toIsoString(value: unknown) {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error("RELATIONSHIP_NETWORK_DATE_INVALID");
  return parsed.toISOString();
}

function currentKoreanYear() {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date()));
}

function hashPersonInput(person: PersonBirthInput) {
  const key = getEncryptionKey();
  if (!key) throw new Error("RELATIONSHIP_NETWORK_ENCRYPTION_NOT_CONFIGURED");
  return createHmac("sha256", key)
    .update("woorigunghap-person-input-hash-v1\0")
    .update(JSON.stringify([
      person.displayName.trim(),
      person.gender,
      person.calendarType,
      person.birthDate,
      person.birthTimeKnown,
      person.birthTime,
      person.isLeapMonth,
    ]))
    .digest("hex");
}

async function ensureSchema() {
  const sql = getQuery();
  if (!sql) return false;

  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_relationship_networks (
          token_hash TEXT PRIMARY KEY,
          owner_token_hash TEXT NOT NULL,
          create_idempotency_hash TEXT UNIQUE,
          host_member_id UUID NOT NULL,
          relationship_type TEXT NOT NULL DEFAULT 'friend',
          timing_base_year INTEGER NOT NULL,
          engine_version TEXT NOT NULL,
          scoring_version TEXT NOT NULL,
          grade_policy_version TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
          member_limit INTEGER NOT NULL DEFAULT 12 CHECK (member_limit BETWEEN 2 AND 30),
          graph_version BIGINT NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
        )
      `;
      await sql`
        ALTER TABLE woorigunghap_relationship_networks
        ADD COLUMN IF NOT EXISTS create_idempotency_hash TEXT
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS woorigunghap_relationship_network_create_idempotency_idx
        ON woorigunghap_relationship_networks (create_idempotency_hash)
        WHERE create_idempotency_hash IS NOT NULL
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_relationship_network_members (
          token_hash TEXT NOT NULL REFERENCES woorigunghap_relationship_networks(token_hash) ON DELETE CASCADE,
          member_id UUID NOT NULL,
          member_token_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          display_name_key TEXT NOT NULL,
          person_input_hash TEXT NOT NULL,
          birth_ciphertext TEXT NOT NULL,
          is_host BOOLEAN NOT NULL DEFAULT FALSE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
          consent_version TEXT NOT NULL,
          join_idempotency_hash TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (token_hash, member_id),
          UNIQUE (token_hash, display_name_key),
          UNIQUE (token_hash, join_idempotency_hash)
        )
      `;
      await sql`
        ALTER TABLE woorigunghap_relationship_network_members
        ADD COLUMN IF NOT EXISTS person_input_hash TEXT
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_relationship_network_edges (
          token_hash TEXT NOT NULL REFERENCES woorigunghap_relationship_networks(token_hash) ON DELETE CASCADE,
          member_low_id UUID NOT NULL,
          member_high_id UUID NOT NULL,
          score SMALLINT NOT NULL CHECK (score BETWEEN 30 AND 100),
          grade CHAR(1) NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D', 'E')),
          score_min SMALLINT NOT NULL CHECK (score_min BETWEEN 30 AND 100),
          score_max SMALLINT NOT NULL CHECK (score_max BETWEEN 30 AND 100),
          calculation_version TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (token_hash, member_low_id, member_high_id),
          CHECK (member_low_id::text < member_high_id::text),
          FOREIGN KEY (token_hash, member_low_id)
            REFERENCES woorigunghap_relationship_network_members(token_hash, member_id) ON DELETE CASCADE,
          FOREIGN KEY (token_hash, member_high_id)
            REFERENCES woorigunghap_relationship_network_members(token_hash, member_id) ON DELETE CASCADE
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS woorigunghap_relationship_network_rate_limits (
          scope_hash TEXT PRIMARY KEY,
          window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          request_count INTEGER NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_relationship_network_members_status_idx
        ON woorigunghap_relationship_network_members (token_hash, status, created_at)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS woorigunghap_relationship_network_expiry_idx
        ON woorigunghap_relationship_networks (expires_at)
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  await schemaPromise;
  return true;
}

async function purgeExpiredData() {
  const sql = getQuery();
  if (!sql) return;
  await sql`
    DELETE FROM woorigunghap_relationship_network_members
    WHERE status = 'pending'
      AND created_at < NOW() - (${PENDING_MEMBER_TTL_MINUTES} * INTERVAL '1 minute')
  `;
  await sql`
    DELETE FROM woorigunghap_relationship_networks
    WHERE expires_at <= NOW()
  `;
  await sql`
    DELETE FROM woorigunghap_relationship_network_rate_limits
    WHERE updated_at < NOW() - INTERVAL '1 day'
  `;
}

export async function purgeExpiredRelationshipNetworkData() {
  if (!await ensureSchema()) return false;
  await purgeExpiredData();
  return true;
}

export function isRelationshipNetworkStoreConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim() && getEncryptionKey());
}

export async function ensureRelationshipNetworkStoreSchema() {
  return ensureSchema();
}

export async function consumeRelationshipNetworkRateLimit(
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  if (!await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const rateLimitKey = getEncryptionKey();
  if (!rateLimitKey) return false;
  const scopeHash = createHmac("sha256", rateLimitKey).update(scope).digest("hex");
  const rows = await sql`
    INSERT INTO woorigunghap_relationship_network_rate_limits (
      scope_hash, window_started_at, request_count, updated_at
    )
    VALUES (${scopeHash}, NOW(), 1, NOW())
    ON CONFLICT (scope_hash) DO UPDATE SET
      request_count = CASE
        WHEN woorigunghap_relationship_network_rate_limits.window_started_at
          <= NOW() - (${windowSeconds} * INTERVAL '1 second')
          THEN 1
        ELSE woorigunghap_relationship_network_rate_limits.request_count + 1
      END,
      window_started_at = CASE
        WHEN woorigunghap_relationship_network_rate_limits.window_started_at
          <= NOW() - (${windowSeconds} * INTERVAL '1 second')
          THEN NOW()
        ELSE woorigunghap_relationship_network_rate_limits.window_started_at
      END,
      updated_at = NOW()
    RETURNING request_count
  `;
  return Number(rows[0]?.request_count ?? limit + 1) <= limit;
}

type InternalRoom = {
  tokenHash: string;
  ownerTokenHash: string;
  hostMemberId: string;
  status: "active" | "closed";
  memberLimit: number;
  graphVersion: number;
  timingBaseYear: number;
  engineVersion: string;
  scoringVersion: string;
  gradePolicyVersion: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

async function loadRoomByHash(tokenHash: string): Promise<InternalRoom | null> {
  const sql = getQuery();
  if (!sql) return null;
  const rows = await sql`
    SELECT token_hash, owner_token_hash, host_member_id, status, member_limit,
      graph_version, timing_base_year, engine_version, scoring_version,
      grade_policy_version, created_at, updated_at, expires_at
    FROM woorigunghap_relationship_networks
    WHERE token_hash = ${tokenHash}
      AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    tokenHash: String(row.token_hash),
    ownerTokenHash: String(row.owner_token_hash),
    hostMemberId: String(row.host_member_id),
    status: row.status === "closed" ? "closed" : "active",
    memberLimit: Number(row.member_limit),
    graphVersion: Number(row.graph_version),
    timingBaseYear: Number(row.timing_base_year),
    engineVersion: String(row.engine_version),
    scoringVersion: String(row.scoring_version),
    gradePolicyVersion: String(row.grade_policy_version),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    expiresAt: toIsoString(row.expires_at),
  };
}

async function loadStoredMembers(tokenHash: string, includePending = false) {
  const sql = getQuery();
  if (!sql) return [];
  const rows = includePending
    ? await sql`
        SELECT member_id, display_name, birth_ciphertext, is_host, created_at
        FROM woorigunghap_relationship_network_members
        WHERE token_hash = ${tokenHash}
          AND status IN ('active', 'pending')
        ORDER BY is_host DESC, created_at ASC, member_id ASC
      `
    : await sql`
        SELECT member_id, display_name, birth_ciphertext, is_host, created_at
        FROM woorigunghap_relationship_network_members
        WHERE token_hash = ${tokenHash}
          AND status = 'active'
        ORDER BY is_host DESC, created_at ASC, member_id ASC
      `;
  return rows.map((row) => ({
    id: String(row.member_id),
    displayName: String(row.display_name),
    isHost: Boolean(row.is_host),
    joinedAt: toIsoString(row.created_at),
    person: decryptPerson(String(row.birth_ciphertext)),
  } satisfies RelationshipNetworkStoredMember));
}

async function loadPublicMembers(tokenHash: string) {
  const sql = getQuery();
  if (!sql) return [];
  const rows = await sql`
    SELECT member_id, display_name, is_host
    FROM woorigunghap_relationship_network_members
    WHERE token_hash = ${tokenHash}
      AND status = 'active'
    ORDER BY is_host DESC, created_at ASC, member_id ASC
  `;
  return rows.map((row) => ({
    id: String(row.member_id),
    displayName: String(row.display_name),
    isHost: Boolean(row.is_host),
  }));
}

function parseStoredEdge(row: Record<string, unknown>): RelationshipNetworkEdge | null {
  try {
    const payload = JSON.parse(String(row.payload_json)) as Partial<RelationshipNetworkEdge>;
    const score = Number(row.score);
    const scoreMin = Number(row.score_min);
    const scoreMax = Number(row.score_max);
    const grade = String(row.grade);
    if (
      !Number.isFinite(score)
      || !Number.isFinite(scoreMin)
      || !Number.isFinite(scoreMax)
      || !RELATIONSHIP_NETWORK_GRADES.includes(grade as RelationshipNetworkGrade)
      || !Array.isArray(payload.strengths)
      || payload.strengths.some((item) => typeof item !== "string")
      || !Array.isArray(payload.adjustments)
      || payload.adjustments.some((item) => typeof item !== "string")
    ) return null;
    return {
      memberAId: String(row.member_low_id),
      memberBId: String(row.member_high_id),
      score,
      grade: grade as RelationshipNetworkGrade,
      scoreRange: { min: scoreMin, max: scoreMax },
      strengths: payload.strengths,
      adjustments: payload.adjustments,
      calculationVersion: String(row.calculation_version),
    };
  } catch {
    return null;
  }
}

async function loadRelationshipNetworkByHash(tokenHash: string): Promise<RelationshipNetworkPublic | null> {
  const room = await loadRoomByHash(tokenHash);
  const sql = getQuery();
  if (!room || !sql) return null;
  const members = await loadPublicMembers(tokenHash);
  const memberIds = new Set(members.map((member) => member.id));
  const edgeRows = await sql`
    SELECT member_low_id, member_high_id, score, grade, score_min, score_max,
      calculation_version, payload_json
    FROM woorigunghap_relationship_network_edges
    WHERE token_hash = ${tokenHash}
    ORDER BY score DESC, member_low_id ASC, member_high_id ASC
  `;
  const edges = edgeRows
    .map((row) => parseStoredEdge(row as Record<string, unknown>))
    .filter((edge): edge is RelationshipNetworkEdge => Boolean(
      edge && memberIds.has(edge.memberAId) && memberIds.has(edge.memberBId),
    ));

  return {
    version: RELATIONSHIP_NETWORK_VERSION,
    hostMemberId: room.hostMemberId,
    memberLimit: room.memberLimit,
    memberCount: members.length,
    graphVersion: room.graphVersion,
    isOpen: room.status === "active",
    members,
    edges,
  };
}

export async function loadRelationshipNetwork(token: string) {
  if (!isOpaqueToken(token) || !await ensureSchema()) return null;
  return loadRelationshipNetworkByHash(hashOpaqueToken(token));
}

export async function createRelationshipNetwork(host: PersonBirthInput, credentials: {
  token: string;
  ownerToken: string;
  memberToken: string;
  idempotencyKey: string;
}) {
  if (
    !isOpaqueToken(credentials.token)
    || !isOpaqueToken(credentials.ownerToken)
    || !isOpaqueToken(credentials.memberToken)
    || !UUID_PATTERN.test(credentials.idempotencyKey)
  ) return null;
  if (!await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  await purgeExpiredData();
  const birthCiphertext = encryptPerson(host);
  const tokenHash = hashOpaqueToken(credentials.token);
  const ownerTokenHash = hashOpaqueToken(credentials.ownerToken);
  const memberTokenHash = hashOpaqueToken(credentials.memberToken);
  const personInputHash = hashPersonInput(host);
  const idempotencyHash = createHash("sha256")
    .update(`create:${credentials.idempotencyKey}`)
    .digest("hex");
  const existingRows = await sql`
    SELECT token_hash, owner_token_hash, host_member_id
    FROM woorigunghap_relationship_networks
    WHERE create_idempotency_hash = ${idempotencyHash}
    LIMIT 1
  `;
  if (existingRows[0]) {
    const existingTokenHash = String(existingRows[0].token_hash);
    const hostMemberId = String(existingRows[0].host_member_id);
    const hostRows = await sql`
      SELECT member_token_hash, person_input_hash
      FROM woorigunghap_relationship_network_members
      WHERE token_hash = ${existingTokenHash}
        AND member_id = ${hostMemberId}
      LIMIT 1
    `;
    if (
      !opaqueTokensMatch(tokenHash, existingTokenHash)
      || !opaqueTokensMatch(ownerTokenHash, String(existingRows[0].owner_token_hash))
      || !hostRows[0]
      || !opaqueTokensMatch(memberTokenHash, String(hostRows[0].member_token_hash))
      || String(hostRows[0].person_input_hash ?? "") !== personInputHash
    ) throw new Error("RELATIONSHIP_NETWORK_CREATE_IDEMPOTENCY_CONFLICT");
    const network = await loadRelationshipNetworkByHash(existingTokenHash);
    if (!network) throw new Error("RELATIONSHIP_NETWORK_CREATE_READ_FAILED");
    return { ...credentials, memberId: hostMemberId, network };
  }

  const memberId = randomUUID();
  const rows = await sql`
    WITH inserted_network AS (
      INSERT INTO woorigunghap_relationship_networks (
        token_hash, owner_token_hash, create_idempotency_hash, host_member_id, relationship_type,
        timing_base_year, engine_version, scoring_version, grade_policy_version,
        status, member_limit, graph_version, expires_at
      )
      VALUES (
        ${tokenHash}, ${ownerTokenHash}, ${idempotencyHash}, ${memberId}, 'friend',
        ${currentKoreanYear()}, ${COMPATIBILITY_ENGINE_VERSION},
        ${COMPATIBILITY_SCORING_VERSION}, ${RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION},
        'active', ${RELATIONSHIP_NETWORK_MEMBER_LIMIT}, 1,
        NOW() + (${NETWORK_RETENTION_DAYS} * INTERVAL '1 day')
      )
      ON CONFLICT DO NOTHING
      RETURNING token_hash
    )
    INSERT INTO woorigunghap_relationship_network_members (
      token_hash, member_id, member_token_hash, display_name, display_name_key,
      person_input_hash, birth_ciphertext, is_host, status, consent_version
    )
    SELECT token_hash, ${memberId}, ${memberTokenHash},
      ${host.displayName.trim()}, ${normalizeRelationshipNetworkName(host.displayName)},
      ${personInputHash}, ${birthCiphertext}, TRUE, 'active', ${NETWORK_CONSENT_VERSION}
    FROM inserted_network
    RETURNING member_id
  `;
  if (rows.length === 0) throw new Error("RELATIONSHIP_NETWORK_CREATE_CONFLICT");
  const network = await loadRelationshipNetworkByHash(tokenHash);
  if (!network) throw new Error("RELATIONSHIP_NETWORK_CREATE_READ_FAILED");
  return { ...credentials, memberId, network };
}

function buildEdge(left: RelationshipNetworkStoredMember, right: RelationshipNetworkStoredMember, timingBaseYear: number) {
  const [low, high] = [left, right].sort((a, b) => a.id.localeCompare(b.id));
  const snapshot = calculateOneToOneCompatibility({
    relationshipType: "friend",
    personA: low.person,
    personB: high.person,
  }, { timingBaseYear });
  const edge: RelationshipNetworkEdge = {
    memberAId: low.id,
    memberBId: high.id,
    score: snapshot.score,
    grade: getRelationshipNetworkGrade(snapshot.score),
    scoreRange: {
      min: snapshot.uncertaintyRange.min,
      max: snapshot.uncertaintyRange.max,
    },
    strengths: snapshot.strengths.map((dimension) => RELATIONSHIP_NETWORK_DIMENSION_LABELS[dimension]),
    adjustments: snapshot.adjustmentPoints.map((dimension) => RELATIONSHIP_NETWORK_DIMENSION_LABELS[dimension]),
    calculationVersion: `${snapshot.engineVersion}/${snapshot.scoringVersion}/${RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION}`,
  };
  return edge;
}

async function reconcileMissingEdges(room: InternalRoom) {
  const sql = getQuery();
  if (!sql) throw new Error("RELATIONSHIP_NETWORK_STORE_NOT_CONFIGURED");
  const members = await loadStoredMembers(room.tokenHash, true);
  const existingRows = await sql`
    SELECT member_low_id, member_high_id
    FROM woorigunghap_relationship_network_edges
    WHERE token_hash = ${room.tokenHash}
  `;
  const existing = new Set(existingRows.map((row) => relationshipNetworkPairKey(
    String(row.member_low_id),
    String(row.member_high_id),
  )));
  const missing: RelationshipNetworkEdge[] = [];
  for (let leftIndex = 0; leftIndex < members.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex += 1) {
      const left = members[leftIndex];
      const right = members[rightIndex];
      if (existing.has(relationshipNetworkPairKey(left.id, right.id))) continue;
      missing.push(buildEdge(left, right, room.timingBaseYear));
    }
  }
  if (missing.length === 0) return 0;
  const results = await sql.transaction(missing.map((edge) => sql`
    INSERT INTO woorigunghap_relationship_network_edges (
      token_hash, member_low_id, member_high_id, score, grade,
      score_min, score_max, calculation_version, payload_json
    )
    VALUES (
      ${room.tokenHash}, ${edge.memberAId}, ${edge.memberBId}, ${edge.score}, ${edge.grade},
      ${edge.scoreRange.min}, ${edge.scoreRange.max}, ${edge.calculationVersion}, ${JSON.stringify({
        strengths: edge.strengths,
        adjustments: edge.adjustments,
      })}
    )
    ON CONFLICT (token_hash, member_low_id, member_high_id) DO NOTHING
    RETURNING member_low_id
  `));
  return results.reduce((sum, rows) => sum + rows.length, 0);
}

export type JoinRelationshipNetworkResult =
  | { kind: "success"; memberId: string; memberToken: string; network: RelationshipNetworkPublic }
  | { kind: "missing" | "closed" | "full" | "duplicate" | "idempotency_conflict" | "version_expired" };

export async function joinRelationshipNetwork(input: {
  token: string;
  person: PersonBirthInput;
  idempotencyKey: string;
  memberToken: string;
}): Promise<JoinRelationshipNetworkResult> {
  if (
    !isOpaqueToken(input.token)
    || !isOpaqueToken(input.memberToken)
    || !UUID_PATTERN.test(input.idempotencyKey)
    || !await ensureSchema()
  ) return { kind: "missing" };
  const sql = getQuery();
  if (!sql) return { kind: "missing" };
  await purgeExpiredData();

  const tokenHash = hashOpaqueToken(input.token);
  const memberTokenHash = hashOpaqueToken(input.memberToken);
  const personInputHash = hashPersonInput(input.person);
  const idempotencyHash = createHash("sha256")
    .update(`${tokenHash}:${input.idempotencyKey}`)
    .digest("hex");
  let memberId: string | null = null;

  const existingRows = await sql`
    SELECT member_id, member_token_hash, person_input_hash, status
    FROM woorigunghap_relationship_network_members
    WHERE token_hash = ${tokenHash}
      AND join_idempotency_hash = ${idempotencyHash}
    LIMIT 1
  `;
  if (existingRows[0]) {
    const storedHash = String(existingRows[0].member_token_hash);
    if (
      !opaqueTokensMatch(memberTokenHash, storedHash)
      || String(existingRows[0].person_input_hash ?? "") !== personInputHash
    ) return { kind: "idempotency_conflict" };
    memberId = String(existingRows[0].member_id);
    if (existingRows[0].status === "active") {
      const network = await loadRelationshipNetworkByHash(tokenHash);
      if (!network) return { kind: "missing" };
      return { kind: "success", memberId, memberToken: input.memberToken, network };
    }
  } else {
    memberId = randomUUID();
    const birthCiphertext = encryptPerson(input.person);
    const reservationResults = await sql.transaction((transaction) => [
      transaction`SELECT pg_advisory_xact_lock(hashtextextended(${tokenHash}, 0))`,
      transaction`
        WITH eligible_network AS (
          SELECT token_hash
          FROM woorigunghap_relationship_networks
          WHERE token_hash = ${tokenHash}
            AND status = 'active'
            AND expires_at > NOW()
            AND engine_version = ${COMPATIBILITY_ENGINE_VERSION}
            AND scoring_version = ${COMPATIBILITY_SCORING_VERSION}
            AND grade_policy_version = ${RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION}
            AND (
              SELECT COUNT(*)
              FROM woorigunghap_relationship_network_members
              WHERE token_hash = ${tokenHash}
            ) < member_limit
        )
        INSERT INTO woorigunghap_relationship_network_members (
          token_hash, member_id, member_token_hash, display_name, display_name_key,
          person_input_hash, birth_ciphertext, is_host, status, consent_version, join_idempotency_hash
        )
        SELECT token_hash, ${memberId}, ${memberTokenHash}, ${input.person.displayName.trim()},
          ${normalizeRelationshipNetworkName(input.person.displayName)}, ${personInputHash}, ${birthCiphertext},
          FALSE, 'pending', ${NETWORK_CONSENT_VERSION}, ${idempotencyHash}
        FROM eligible_network
        ON CONFLICT DO NOTHING
        RETURNING member_id
      `,
    ]);
    const rows = reservationResults[1];
    let recoveredConcurrentReservation = false;
    if (rows.length === 0) {
      const racedRows = await sql`
        SELECT member_id, member_token_hash, person_input_hash
        FROM woorigunghap_relationship_network_members
        WHERE token_hash = ${tokenHash}
          AND join_idempotency_hash = ${idempotencyHash}
        LIMIT 1
      `;
      if (
        racedRows[0]
        && opaqueTokensMatch(memberTokenHash, String(racedRows[0].member_token_hash))
        && String(racedRows[0].person_input_hash ?? "") === personInputHash
      ) {
        memberId = String(racedRows[0].member_id);
        recoveredConcurrentReservation = true;
      } else if (racedRows[0]) {
        return { kind: "idempotency_conflict" };
      }
    }
    if (rows.length === 0 && !recoveredConcurrentReservation) {
      const room = await loadRoomByHash(tokenHash);
      if (!room) return { kind: "missing" };
      if (room.status === "closed") return { kind: "closed" };
      if (
        room.engineVersion !== COMPATIBILITY_ENGINE_VERSION
        || room.scoringVersion !== COMPATIBILITY_SCORING_VERSION
        || room.gradePolicyVersion !== RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION
      ) return { kind: "version_expired" };
      const diagnosticRows = await sql`
        SELECT
          COUNT(*)::int AS member_count,
          BOOL_OR(display_name_key = ${normalizeRelationshipNetworkName(input.person.displayName)}) AS duplicate
        FROM woorigunghap_relationship_network_members
        WHERE token_hash = ${tokenHash}
      `;
      if (Number(diagnosticRows[0]?.member_count ?? 0) >= room.memberLimit) return { kind: "full" };
      if (Boolean(diagnosticRows[0]?.duplicate)) return { kind: "duplicate" };
      return { kind: "idempotency_conflict" };
    }
  }

  const room = await loadRoomByHash(tokenHash);
  if (!room || !memberId) return { kind: "missing" };
  if (
    room.engineVersion !== COMPATIBILITY_ENGINE_VERSION
    || room.scoringVersion !== COMPATIBILITY_SCORING_VERSION
    || room.gradePolicyVersion !== RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION
  ) return { kind: "version_expired" };
  const insertedEdges = await reconcileMissingEdges(room);
  await sql`
    WITH activated AS (
      UPDATE woorigunghap_relationship_network_members
      SET status = 'active', updated_at = NOW()
      WHERE token_hash = ${tokenHash}
        AND member_id = ${memberId}
        AND status = 'pending'
      RETURNING member_id
    )
    UPDATE woorigunghap_relationship_networks
    SET
      graph_version = graph_version + CASE
        WHEN EXISTS (SELECT 1 FROM activated) OR ${insertedEdges > 0} THEN 1
        ELSE 0
      END,
      updated_at = CASE
        WHEN EXISTS (SELECT 1 FROM activated) OR ${insertedEdges > 0} THEN NOW()
        ELSE updated_at
      END
    WHERE token_hash = ${tokenHash}
  `;
  const network = await loadRelationshipNetworkByHash(tokenHash);
  if (!network) throw new Error("RELATIONSHIP_NETWORK_JOIN_READ_FAILED");
  return { kind: "success", memberId, memberToken: input.memberToken, network };
}

async function loadCredentialHashes(tokenHash: string, memberId?: string) {
  const sql = getQuery();
  if (!sql) return null;
  const roomRows = await sql`
    SELECT owner_token_hash, host_member_id
    FROM woorigunghap_relationship_networks
    WHERE token_hash = ${tokenHash}
      AND expires_at > NOW()
    LIMIT 1
  `;
  if (!roomRows[0]) return null;
  let memberTokenHash: string | null = null;
  if (memberId) {
    const memberRows = await sql`
      SELECT member_token_hash
      FROM woorigunghap_relationship_network_members
      WHERE token_hash = ${tokenHash}
        AND member_id = ${memberId}
      LIMIT 1
    `;
    memberTokenHash = memberRows[0] ? String(memberRows[0].member_token_hash) : null;
  }
  return {
    ownerTokenHash: String(roomRows[0].owner_token_hash),
    hostMemberId: String(roomRows[0].host_member_id),
    memberTokenHash,
  };
}

export async function setRelationshipNetworkOpen(token: string, ownerToken: string, isOpen: boolean) {
  if (!isOpaqueToken(token) || !isOpaqueToken(ownerToken) || !await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const tokenHash = hashOpaqueToken(token);
  const credentials = await loadCredentialHashes(tokenHash);
  if (!credentials || !opaqueTokensMatch(hashOpaqueToken(ownerToken), credentials.ownerTokenHash)) return null;
  await sql`
    UPDATE woorigunghap_relationship_networks
    SET status = ${isOpen ? "active" : "closed"}, graph_version = graph_version + 1, updated_at = NOW()
    WHERE token_hash = ${tokenHash}
  `;
  return loadRelationshipNetworkByHash(tokenHash);
}

export async function removeRelationshipNetworkMember(input: {
  token: string;
  memberId: string;
  credential: string;
}) {
  if (!isOpaqueToken(input.token) || !isOpaqueToken(input.credential) || !await ensureSchema()) return null;
  const sql = getQuery();
  if (!sql) return null;
  const tokenHash = hashOpaqueToken(input.token);
  const credentials = await loadCredentialHashes(tokenHash, input.memberId);
  if (!credentials || input.memberId === credentials.hostMemberId) return null;
  const credentialHash = hashOpaqueToken(input.credential);
  const authorized = opaqueTokensMatch(credentialHash, credentials.ownerTokenHash)
    || Boolean(credentials.memberTokenHash && opaqueTokensMatch(credentialHash, credentials.memberTokenHash));
  if (!authorized) return null;
  const rows = await sql`
    WITH deleted AS (
      DELETE FROM woorigunghap_relationship_network_members
      WHERE token_hash = ${tokenHash}
        AND member_id = ${input.memberId}
      RETURNING member_id
    )
    UPDATE woorigunghap_relationship_networks
    SET graph_version = graph_version + 1, updated_at = NOW()
    WHERE token_hash = ${tokenHash}
      AND EXISTS (SELECT 1 FROM deleted)
    RETURNING graph_version
  `;
  if (rows.length === 0) return null;
  return loadRelationshipNetworkByHash(tokenHash);
}

export async function deleteRelationshipNetwork(token: string, ownerToken: string) {
  if (!isOpaqueToken(token) || !isOpaqueToken(ownerToken) || !await ensureSchema()) return false;
  const sql = getQuery();
  if (!sql) return false;
  const tokenHash = hashOpaqueToken(token);
  const credentials = await loadCredentialHashes(tokenHash);
  if (!credentials || !opaqueTokensMatch(hashOpaqueToken(ownerToken), credentials.ownerTokenHash)) return false;
  const rows = await sql`
    DELETE FROM woorigunghap_relationship_networks
    WHERE token_hash = ${tokenHash}
    RETURNING token_hash
  `;
  return rows.length > 0;
}
