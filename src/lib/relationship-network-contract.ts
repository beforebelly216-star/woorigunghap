import type { CompatibilityDimension } from "@/lib/compatibility/types";
import {
  COMPATIBILITY_GRADE_COPY,
  COMPATIBILITY_GRADE_POLICY_VERSION,
  COMPATIBILITY_GRADES,
  getCompatibilityGrade,
  type CompatibilityGrade,
} from "@/lib/compatibility/score-scale";
import type { PersonBirthInput } from "@/lib/report-input";

export const RELATIONSHIP_NETWORK_VERSION = "relationship-network-v1" as const;
export const RELATIONSHIP_NETWORK_MEMBER_LIMIT = 12;
export const RELATIONSHIP_NETWORK_POLL_INTERVAL_MS = 4_000;
export const RELATIONSHIP_NETWORK_GRADE_POLICY_VERSION = COMPATIBILITY_GRADE_POLICY_VERSION;

export const RELATIONSHIP_NETWORK_GRADES = COMPATIBILITY_GRADES;
export type RelationshipNetworkGrade = CompatibilityGrade;

export const RELATIONSHIP_NETWORK_GRADE_COPY = COMPATIBILITY_GRADE_COPY;

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
  expiresAt: string;
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
  return getCompatibilityGrade(score);
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
    || typeof network.expiresAt !== "string"
    || Number.isNaN(Date.parse(network.expiresAt))
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
    expiresAt: new Date(network.expiresAt).toISOString(),
    members: members as RelationshipNetworkMember[],
    edges: edges as RelationshipNetworkEdge[],
  };
}
