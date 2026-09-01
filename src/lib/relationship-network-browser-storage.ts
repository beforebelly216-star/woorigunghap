export const SAVED_RELATIONSHIP_NETWORKS_KEY = "woori-saved-relationship-networks:v1";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const OWNER_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const MAX_SAVED_NETWORKS = 20;

export type SavedRelationshipNetwork = {
  token: string;
  hostName: string;
  expiresAt: string;
  savedAt: string;
};

function parseSavedNetwork(value: unknown): SavedRelationshipNetwork | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.token !== "string"
    || !TOKEN_PATTERN.test(candidate.token)
    || typeof candidate.hostName !== "string"
    || !candidate.hostName.trim()
    || typeof candidate.expiresAt !== "string"
    || Number.isNaN(Date.parse(candidate.expiresAt))
    || typeof candidate.savedAt !== "string"
    || Number.isNaN(Date.parse(candidate.savedAt))
  ) return null;
  return {
    token: candidate.token,
    hostName: candidate.hostName.trim().slice(0, 40),
    expiresAt: new Date(candidate.expiresAt).toISOString(),
    savedAt: new Date(candidate.savedAt).toISOString(),
  };
}

export function parseSavedRelationshipNetworks(value: string | null, now = Date.now()) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, SavedRelationshipNetwork>();
    for (const item of parsed) {
      const network = parseSavedNetwork(item);
      if (!network || Date.parse(network.expiresAt) <= now || unique.has(network.token)) continue;
      unique.set(network.token, network);
    }
    return Array.from(unique.values())
      .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))
      .slice(0, MAX_SAVED_NETWORKS);
  } catch {
    return [];
  }
}

export function readSavedRelationshipNetworks() {
  if (typeof window === "undefined") return [];
  try {
    const networks = parseSavedRelationshipNetworks(window.localStorage.getItem(SAVED_RELATIONSHIP_NETWORKS_KEY));
    const owned = networks.filter((network) => {
      const ownerToken = window.localStorage.getItem(`woori-network-owner:${network.token}`);
      return Boolean(ownerToken && OWNER_TOKEN_PATTERN.test(ownerToken));
    });
    window.localStorage.setItem(SAVED_RELATIONSHIP_NETWORKS_KEY, JSON.stringify(owned));
    return owned;
  } catch {
    return [];
  }
}

export function rememberRelationshipNetwork(input: {
  token: string;
  hostName: string;
  expiresAt: string;
}) {
  if (typeof window === "undefined" || !TOKEN_PATTERN.test(input.token)) return;
  try {
    const savedAt = new Date().toISOString();
    const next = parseSavedRelationshipNetworks(JSON.stringify([
      { ...input, savedAt },
      ...readSavedRelationshipNetworks(),
    ]));
    window.localStorage.setItem(SAVED_RELATIONSHIP_NETWORKS_KEY, JSON.stringify(next));
  } catch {
    // 브라우저 저장소가 차단된 경우 관리 링크로 재접속할 수 있습니다.
  }
}

export function forgetRelationshipNetwork(token: string) {
  if (typeof window === "undefined" || !TOKEN_PATTERN.test(token)) return;
  try {
    const next = parseSavedRelationshipNetworks(window.localStorage.getItem(SAVED_RELATIONSHIP_NETWORKS_KEY))
      .filter((network) => network.token !== token);
    window.localStorage.setItem(SAVED_RELATIONSHIP_NETWORKS_KEY, JSON.stringify(next));
  } catch {
    // 서버 삭제가 완료됐다면 브라우저 목록 정리 실패는 무시합니다.
  }
}
