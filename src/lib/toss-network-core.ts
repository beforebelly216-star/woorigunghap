import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { FullbuyDatabase, FullbuyStatement } from "./fullbuy-store-core";
import { parsePersonBirthInput, validatePersonBirthInput, type PersonBirthInput } from "./report-input";
import { calculateTossBasicResult } from "./toss-basic-result";
import { COMPATIBILITY_ENGINE_VERSION } from "./compatibility/engine";
import { COMPATIBILITY_SCORING_VERSION } from "./compatibility/weights";

export const TOSS_NETWORK_CONSENT = "toss-network-all-pairs-v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stmt = (text: string, ...values: unknown[]): FullbuyStatement => ({text,values});
export class TossNetworkError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}
export const TOSS_NETWORK_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS woorigunghap_toss_network_accounts (user_id TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS woorigunghap_toss_networks (
    id UUID PRIMARY KEY, invite_hash TEXT UNIQUE NOT NULL, owner_id TEXT NOT NULL,
    request_id UUID NOT NULL, host_input_hash TEXT NOT NULL,
    engine_version TEXT NOT NULL, scoring_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW()+INTERVAL '30 days'),
    UNIQUE(owner_id,request_id))`,
  `CREATE TABLE IF NOT EXISTS woorigunghap_toss_network_members (
    network_id UUID NOT NULL REFERENCES woorigunghap_toss_networks(id) ON DELETE CASCADE,
    id UUID NOT NULL, user_id TEXT NOT NULL, display_name TEXT NOT NULL, input_version TEXT NOT NULL,
    birth_ciphertext TEXT NOT NULL, consent_version TEXT NOT NULL, consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(network_id,id), UNIQUE(network_id,user_id), UNIQUE(network_id,display_name))`,
  `CREATE INDEX IF NOT EXISTS woorigunghap_toss_network_member_user ON woorigunghap_toss_network_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS woorigunghap_toss_network_expiry ON woorigunghap_toss_networks(expires_at)`,
];
function validId(value: string) {
  if (typeof value!=="string" || !uuid.test(value)) throw new TossNetworkError("invalid_network_id",400);
}
function personInput(value: unknown): PersonBirthInput {
  const person = parsePersonBirthInput(value);
  if (!person || Object.keys(validatePersonBirthInput(person,"person")).length) throw new TossNetworkError("invalid_person",400);
  // Validate calendar conversion as well as shape; no external AI.
  try {calculateTossBasicResult({relationshipType:"friend",personA:person,personB:person});}
  catch {throw new TossNetworkError("invalid_person",400);}
  return {...person,displayName:person.displayName.trim()};
}
export function createTossNetworkStore(db: FullbuyDatabase, secret: string) {
  if (!secret || secret.length<32) throw new Error("toss_network_encryption_unavailable");
  const key = createHash("sha256").update(`toss-network-v1:${secret}`).digest();
  let schema: Promise<void> | undefined;
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const signature = (value: string) => createHmac("sha256",key).update(value).digest("hex");
  function encrypt(person: PersonBirthInput) {
    const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv);
    const data=Buffer.concat([cipher.update(JSON.stringify(person),"utf8"),cipher.final()]);
    return [iv,cipher.getAuthTag(),data].map(v=>v.toString("base64url")).join(".");
  }
  function decrypt(value: string, inputVersion: string) {
    const [iv,tag,data]=value.split(".").map(v=>Buffer.from(v,"base64url"));
    const cipher=createDecipheriv("aes-256-gcm",key,iv); cipher.setAuthTag(tag);
    const person=personInput(JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString("utf8")));
    if (signature(JSON.stringify(person))!==inputVersion) throw new Error("network_input_integrity_failed");
    return person;
  }
  async function ensureSchema() {
    schema ??= db.transaction(TOSS_NETWORK_SCHEMA.map(text=>stmt(text))).then(()=>undefined)
      .catch(error=>{schema=undefined;throw error;});
    await schema;
  }
  function user(value: string) {
    if (typeof value!=="string" || !value || value.length>200) throw new TossNetworkError("invalid_user",401);
  }
  async function authorized(userId: string, id: string) {
    user(userId);validId(id);await ensureSchema();
    // Membership and all participants are read from one database snapshot.
    const rows=await db.query(stmt(`SELECT n.id AS network_id,n.owner_id,n.request_id,n.expires_at,n.engine_version,n.scoring_version,
      m.id,m.display_name,m.input_version,m.birth_ciphertext,m.user_id,m.consent_version
      FROM woorigunghap_toss_networks n JOIN woorigunghap_toss_network_members m ON m.network_id=n.id
      WHERE n.id=$1 AND n.expires_at>NOW() AND EXISTS (
        SELECT 1 FROM woorigunghap_toss_network_members viewer WHERE viewer.network_id=n.id
          AND viewer.user_id=$2 AND viewer.consent_version=$3) ORDER BY m.id`,id,userId,TOSS_NETWORK_CONSENT));
    if (!rows.length) throw new TossNetworkError("network_not_available",404);
    if (rows.some(row=>row.consent_version!==TOSS_NETWORK_CONSENT)) throw new TossNetworkError("consent_expired",409);
    if (rows[0].engine_version!==COMPATIBILITY_ENGINE_VERSION || rows[0].scoring_version!==COMPATIBILITY_SCORING_VERSION)
      throw new TossNetworkError("network_version_expired",409);
    return rows;
  }
  async function view(userId: string, id: string) {
    validId(id);id=id.toLowerCase();
    const rows=await authorized(userId,id);
    return {id,invite:signature(`invite:${rows[0].owner_id}:${rows[0].request_id}:${id}`),expiresAt:new Date(String(rows[0].expires_at)).toISOString(),memberLimit:12,
      isOwner:rows[0].owner_id===userId,
      members:rows.map(row=>({id:String(row.id),displayName:String(row.display_name),isSelf:row.user_id===userId})),
      pairs:rows.flatMap((a,i)=>rows.slice(i+1).map(b=>({memberAId:String(a.id),memberBId:String(b.id)})))};
  }
  async function create(userId: string, value: unknown, consent: boolean, requestId: string) {
    user(userId);validId(requestId);
    requestId=requestId.toLowerCase();
    if (consent!==true) throw new TossNetworkError("network_consent_required",400);
    const person=personInput(value);await ensureSchema();
    const inputHash=signature(JSON.stringify(person)),id=randomUUID(),memberId=randomUUID();
    const invite=signature(`invite:${userId}:${requestId}:${id}`);
    const results=await db.transaction([
      stmt("INSERT INTO woorigunghap_toss_network_accounts(user_id) VALUES($1) ON CONFLICT DO NOTHING",userId),
      stmt("SELECT user_id FROM woorigunghap_toss_network_accounts WHERE user_id=$1 FOR UPDATE",userId),
      stmt(`INSERT INTO woorigunghap_toss_networks(id,invite_hash,owner_id,request_id,host_input_hash,engine_version,scoring_version)
        SELECT $1,$2,$3,$4,$5,$6,$7 WHERE (SELECT COUNT(*) FROM woorigunghap_toss_networks WHERE owner_id=$3 AND expires_at>NOW())<5
        ON CONFLICT(owner_id,request_id) DO NOTHING`,id,hash(invite),userId,requestId,inputHash,COMPATIBILITY_ENGINE_VERSION,COMPATIBILITY_SCORING_VERSION),
      stmt(`SELECT id,host_input_hash,expires_at FROM woorigunghap_toss_networks WHERE owner_id=$1 AND request_id=$2 FOR UPDATE`,userId,requestId),
      stmt(`INSERT INTO woorigunghap_toss_network_members(network_id,id,user_id,display_name,input_version,birth_ciphertext,consent_version)
        SELECT id,$3,$1,$4,$5,$6,$7 FROM woorigunghap_toss_networks WHERE owner_id=$1 AND request_id=$2
          AND host_input_hash=$5 AND expires_at>NOW() ON CONFLICT DO NOTHING`,userId,requestId,memberId,person.displayName,inputHash,encrypt(person),TOSS_NETWORK_CONSENT),
    ]);
    const row=results[3][0];
    if (!row) throw new TossNetworkError("network_create_limit",429);
    if (row?.host_input_hash!==inputHash) throw new TossNetworkError("network_request_conflict");
    const network=await view(userId,String(row.id));
    return {invite:network.invite,network};
  }
  async function join(userId: string, invite: string, value: unknown, consent: boolean) {
    user(userId);
    if (typeof invite!=="string" || !/^[a-f0-9]{64}$/.test(invite)) throw new TossNetworkError("invalid_invite",400);
    if (consent!==true) throw new TossNetworkError("network_consent_required",400);
    const person=personInput(value);await ensureSchema();
    const inputHash=signature(JSON.stringify(person));
    const results=await db.transaction([
      stmt(`SELECT id,engine_version,scoring_version FROM woorigunghap_toss_networks
        WHERE invite_hash=$1 AND expires_at>NOW() FOR UPDATE`,hash(invite)),
      stmt(`INSERT INTO woorigunghap_toss_network_members(network_id,id,user_id,display_name,input_version,birth_ciphertext,consent_version)
        SELECT n.id,$2,$3,$4,$5,$6,$7 FROM woorigunghap_toss_networks n
        WHERE invite_hash=$1 AND expires_at>NOW() AND engine_version=$8 AND scoring_version=$9
          AND (SELECT COUNT(*) FROM woorigunghap_toss_network_members WHERE network_id=n.id)<12
        ON CONFLICT DO NOTHING`,hash(invite),randomUUID(),userId,person.displayName,inputHash,encrypt(person),TOSS_NETWORK_CONSENT,COMPATIBILITY_ENGINE_VERSION,COMPATIBILITY_SCORING_VERSION),
      stmt(`SELECT m.network_id,m.input_version FROM woorigunghap_toss_network_members m
        JOIN woorigunghap_toss_networks n ON n.id=m.network_id WHERE n.invite_hash=$1 AND m.user_id=$2`,hash(invite),userId),
    ]);
    if (!results[0][0]) throw new TossNetworkError("network_not_available",404);
    const row=results[2][0];
    if (!row) throw new TossNetworkError("network_join_unavailable"); // Full, duplicate alias, or stale version; disclose no participants.
    if (row.input_version!==inputHash) throw new TossNetworkError("network_input_conflict");
    return {network:await view(userId,String(row.network_id))};
  }
  async function pair(userId: string,id: string,a: string,b: string) {
    validId(id);validId(a);validId(b);id=id.toLowerCase();a=a.toLowerCase();b=b.toLowerCase();
    if (a===b) throw new TossNetworkError("invalid_pair",400);
    const rows=await authorized(userId,id);
    const selected=[a,b].sort().map(memberId=>rows.find(row=>row.id===memberId));
    if (selected.some(row=>!row)) throw new TossNetworkError("pair_not_available",404);
    const [left,right]=selected;
    const result=calculateTossBasicResult({relationshipType:"friend",personA:decrypt(String(left!.birth_ciphertext),String(left!.input_version)),personB:decrypt(String(right!.birth_ciphertext),String(right!.input_version))});
    // Internal authority for a future chapter service; raw inputs never cross the API boundary.
    const snapshot={networkId:id,members:[{id:String(left!.id),inputVersion:String(left!.input_version)},
      {id:String(right!.id),inputVersion:String(right!.input_version)}] as const,
      relationship:"friend",calculationVersion:`${result.engineVersion}:${result.scoringVersion}`,narrativeVersion:"toss-short-v1"};
    return {result,snapshot};
  }
  async function leave(userId: string,id: string) {
    user(userId);validId(id);await ensureSchema();
    const results=await db.transaction([
      stmt("SELECT owner_id FROM woorigunghap_toss_networks WHERE id=$1 FOR UPDATE",id),
      stmt(`DELETE FROM woorigunghap_toss_network_members WHERE network_id=$1 AND user_id=$2
        AND EXISTS(SELECT 1 FROM woorigunghap_toss_networks WHERE id=$1 AND owner_id<>$2) RETURNING id`,id,userId),
    ]);
    if (results[0][0]?.owner_id===userId) throw new TossNetworkError("host_must_close_network");
    return {left:true};
  }
  async function close(userId: string,id: string) {
    user(userId);validId(id);await ensureSchema();
    const rows=await db.query(stmt("DELETE FROM woorigunghap_toss_networks WHERE id=$1 AND owner_id=$2 RETURNING id",id,userId));
    if (!rows.length) throw new TossNetworkError("network_not_available",404);
    return {closed:true};
  }
  async function purge() {await ensureSchema();await db.query(stmt("DELETE FROM woorigunghap_toss_networks WHERE expires_at<=NOW()"));}
  async function list(userId: string) {
    user(userId);await ensureSchema();
    const rows=await db.query(stmt(`SELECT n.id,n.expires_at,n.owner_id FROM woorigunghap_toss_networks n
      JOIN woorigunghap_toss_network_members m ON m.network_id=n.id WHERE m.user_id=$1 AND m.consent_version=$2
        AND n.expires_at>NOW() ORDER BY n.created_at DESC LIMIT 50`,userId,TOSS_NETWORK_CONSENT));
    return rows.map(row=>({id:String(row.id),expiresAt:new Date(String(row.expires_at)).toISOString(),isOwner:row.owner_id===userId}));
  }
  async function removeUser(userId: string) {
    user(userId);await ensureSchema();
    await db.transaction([
      stmt("DELETE FROM woorigunghap_toss_networks WHERE owner_id=$1",userId),
      stmt("DELETE FROM woorigunghap_toss_network_members WHERE user_id=$1",userId),
      stmt("DELETE FROM woorigunghap_toss_network_accounts WHERE user_id=$1",userId),
    ]);
  }
  async function removeProviderUser(providerUserId: string) {
    await ensureSchema();
    const rows=await db.query(stmt("SELECT user_id FROM woorigunghap_users WHERE provider='toss' AND provider_user_id=$1",providerUserId));
    for (const row of rows) await removeUser(String(row.user_id));
  }
  return {ensureSchema,create,join,view,pair,leave,close,purge,list,removeUser,removeProviderUser};
}
