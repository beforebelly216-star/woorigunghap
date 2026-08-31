import type { CompatibilityDimension } from "@/lib/compatibility/types";
import type { PersonBirthInput } from "@/lib/report-input";

export const RELATIONSHIP_NETWORK_VERSION = "relationship-network-v1" as const;
export const RELATIONSHIP_NETWORK_MEMBER_LIMIT = 12;
export const RELATIONSHIP_NETWORK_POLL_INTERVAL_MS = 4_000;
export const RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION = "relationship-grade-v1" as const;

export const RELATIONSHIP_NETWORK_GRADES = ["S", "A", "B", "C", "D", "E"] as const;
export type RelationshipNetworkGrade = (typeof RELATIONSHIP_NETWORK_GRADES)[number];

export const RELATIONSHIP_NETWORK_GRADE_COPY: Record<RelationshipNetworkGrade, {
  min: number;
  max: number;
  label: string;
  description: string;
}> = {
  S: { min: 90, max: 100, label: "강하게 통하는 관계", description: "여러 관계 축에서 강점이 뚜렷하게 겹쳐요." },
  A: { min: 80, max: 89, label: "아주 잘 맞는 관계", description: "편하게 맞는 지점이 많고 조율 부담이 적은 편이에요." },
  B: { min: 70, max: 79, label: "잘 맞는 관계", description: "강점이 분명하고 차이는 대화로 맞추기 좋은 편이에요." },
  C: { min: 60, max: 69, label: "균형을 찾는 관계", description: "맞는 부분과 다른 부분이 함께 보여요." },
  D: { min: 50, max: 59, label: "조율이 필요한 관계", description: "서로의 방식과 기대를 자주 확인할수록 좋아요." },
  E: { min: 30, max: 49, label: "세심한 조율이 필요한 관계", description: "반복되는 차이를 먼저 알고 천천히 맞춰가는 편이 좋아요." },
};

export const RELATIONSHIP_NETWORK_DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "대화 템포",
  dayBranch: "생활 리듬",
  usefulGodFit: "편안함·회복",
  elementComplementarity: "역할 보완",
  heavenlyStemInteraction: "연락·표현 호흡",
  earthlyBranchInteraction: "생활 속 갈등",
  specialStars: "도움·신뢰",
  spouseStarRealization: "애정 표현·관계 역할",
  luckCycleAlignment: "장기관계 방향",
};

export type RelationshipNetworkMember = {
  id: string;
  displayName: string;
  isHost: boolean;
};

export type RelationshipNetworkEdge = {
  memberAId: string;
  memberBId: string;
  score: number;
  grade: RelationshipNetworkGrade;
  scoreRange: { min: number; max: number };
  strengths: string[];
  adjustments: string[];
  calculationVersion: string;
};

export type RelationshipNetworkPublic = {
  version: typeof RELATIONSHIP_NETWORK_VERSION;
  hostMemberId: string;
  memberLimit: number;
  memberCount: number;
  graphVersion: number;
  isOpen: boolean;
  members: RelationshipNetworkMember[];
  edges: RelationshipNetworkEdge[];
};

export type RelationshipNetworkCreateResponse = {
  url: string;
  ownerToken: string;
  memberToken: string;
  memberId: string;
  network: RelationshipNetworkPublic;
};

export type RelationshipNetworkJoinResponse = {
  memberToken: string;
  memberId: string;
  network: RelationshipNetworkPublic;
};

export type RelationshipNetworkStoredMember = RelationshipNetworkMember & {
  joinedAt: string;
  person: PersonBirthInput;
};

export function getRelationshipNetworkGrade(score: number): RelationshipNetworkGrade {
  const normalized = Math.max(30, Math.min(100, Math.round(score)));
  return RELATIONSHIP_NETWORK_GRADES.find((grade) => {
    const range = RELATIONSHIP_NETWORK_GRADE_COPY[grade];
    return normalized >= range.min && normalized <= range.max;
  }) ?? "E";
}

export function relationshipNetworkPairKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join(":");
}

export function normalizeRelationshipNetworkName(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");
}

function parseMember(value: unknown): RelationshipNetworkMember | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const member = value as Record<string, unknown>;
  if (
    typeof member.id !== "string"
    || typeof member.displayName !== "string"
    || typeof member.isHost !== "boolean"
  ) return null;
  return {
    id: member.id,
    displayName: member.displayName,
    isHost: member.isHost,
  };
}

function parseEdge(value: unknown): RelationshipNetworkEdge | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const edge = value as Record<string, unknown>;
  const range = edge.scoreRange && typeof edge.scoreRange === "object" && !Array.isArray(edge.scoreRange)
    ? edge.scoreRange as Record<string, unknown>
    : null;
  if (
    typeof edge.memberAId !== "string"
    || typeof edge.memberBId !== "string"
    || typeof edge.score !== "number"
    || !RELATIONSHIP_NETWORK_GRADES.includes(edge.grade as RelationshipNetworkGrade)
    || typeof range?.min !== "number"
    || typeof range?.max !== "number"
    || !Array.isArray(edge.strengths)
    || edge.strengths.some((item) => typeof item !== "string")
    || !Array.isArray(edge.adjustments)
    || edge.adjustments.some((item) => typeof item !== "string")
    || typeof edge.calculationVersion !== "string"
  ) return null;
  return {
    memberAId: edge.memberAId,
    memberBId: edge.memberBId,
    score: edge.score,
    grade: edge.grade as RelationshipNetworkGrade,
    scoreRange: { min: range.min, max: range.max },
    strengths: edge.strengths as string[],
    adjustments: edge.adjustments as string[],
    calculationVersion: edge.calculationVersion,
  };
}

export function parseRelationshipNetworkPublic(value: unknown): RelationshipNetworkPublic | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const network = value as Record<string, unknown>;
  if (
    network.version !== RELATIONSHIP_NETWORK_VERSION
    || typeof network.hostMemberId !== "string"
    || typeof network.memberLimit !== "number"
    || typeof network.memberCount !== "number"
    || typeof network.graphVersion !== "number"
    || typeof network.isOpen !== "boolean"
    || !Array.isArray(network.members)
    || !Array.isArray(network.edges)
  ) return null;

  const members = network.members.map(parseMember);
  const edges = network.edges.map(parseEdge);
  if (members.some((member) => !member) || edges.some((edge) => !edge)) return null;
  return {
    version: RELATIONSHIP_NETWORK_VERSION,
    hostMemberId: network.hostMemberId,
    memberLimit: network.memberLimit,
    memberCount: network.memberCount,
    graphVersion: network.graphVersion,
    isOpen: network.isOpen,
    members: members as RelationshipNetworkMember[],
    edges: edges as RelationshipNetworkEdge[],
  };
}
