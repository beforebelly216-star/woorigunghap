import { createHash } from "node:crypto";

export const FULLBUY_CHAPTER_COST = 3;
export const FULLBUY_AD_REWARD = 3;
export const FULLBUY_CHAPTERS = ["conversation", "strengths", "conflict"] as const;
export type FullbuyChapter = typeof FULLBUY_CHAPTERS[number];
export type FullbuySnapshot = {
  networkId: string;
  members: readonly [{ id: string; inputVersion: string }, { id: string; inputVersion: string }];
  relationship: string; calculationVersion: string; narrativeVersion: string;
};

// Only server-authorized snapshots may reach the store. Never accept this key as authorization.
export function fullbuyChapterKey(snapshot: FullbuySnapshot, chapter: FullbuyChapter) {
  const parts = [snapshot.networkId, snapshot.relationship, snapshot.calculationVersion, snapshot.narrativeVersion,
    ...snapshot.members.flatMap(member => [member.id, member.inputVersion])];
  if (!FULLBUY_CHAPTERS.includes(chapter) || parts.some(value => typeof value !== "string" || !value.trim() || value.length > 200)
    || snapshot.members[0].id === snapshot.members[1].id) throw new Error("invalid_fullbuy_snapshot");
  const members = [...snapshot.members].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    .map(member => ({ id: member.id, inputVersion: member.inputVersion }));
  return createHash("sha256").update(JSON.stringify({ version: 1, networkId: snapshot.networkId, members,
    relationship: snapshot.relationship, calculationVersion: snapshot.calculationVersion,
    narrativeVersion: snapshot.narrativeVersion, chapter })).digest("hex");
}

export function validateFullbuyId(value: string) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9:_-]{1,200}$/.test(value)) throw new Error("invalid_fullbuy_id");
}
export function validateFullbuyKey(value: string) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error("invalid_fullbuy_key");
}
