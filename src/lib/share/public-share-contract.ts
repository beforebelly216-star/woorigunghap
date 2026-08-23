import type { RelationshipType } from "@/lib/report-input";
import type { CompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";

export const PUBLIC_SHARE_CONTRACT_VERSION = "public-share-v1" as const;

export const FORBIDDEN_PUBLIC_SHARE_KEYS = [
  "accessToken",
  "resultAccessToken",
  "paymentId",
  "birthDate",
  "birthTime",
  "birthTimeKnown",
  "calendarType",
  "gender",
  "isLeapMonth",
  "inputSnapshot",
  "report",
  "narrative",
  "rawTotal",
  "dimensions",
] as const;

export type PublicShareHighlight = {
  label: string;
  copy: string;
};

type PublicShareBase = {
  version: typeof PUBLIC_SHARE_CONTRACT_VERSION;
  relationshipType: RelationshipType;
  relationshipLabel: string;
  headline: string;
  summary: string;
};

export type OneToOnePublicShare = PublicShareBase & {
  product: "oneToOne";
  score: number;
  participants: {
    self?: string;
    partner?: string;
  };
  archetype: CompatibilityShareArchetype;
  strength?: PublicShareHighlight;
  tuning?: PublicShareHighlight;
};

export type OneToManyPublicShareCandidate = {
  displayName?: string;
  roleLabel: string;
  score: number;
};

export type OneToManyPublicShare = PublicShareBase & {
  product: "oneToMany";
  referenceName?: string;
  candidates: OneToManyPublicShareCandidate[];
};

export type PublicSharePayload = OneToOnePublicShare | OneToManyPublicShare;

type OneToOnePublicShareInput = Omit<OneToOnePublicShare, "version" | "product" | "participants"> & {
  selfName?: string;
  partnerName?: string;
  includeDisplayNames?: boolean;
};

type OneToManyPublicShareInput = Omit<OneToManyPublicShare, "version" | "product" | "referenceName" | "candidates"> & {
  referenceName?: string;
  includeDisplayNames?: boolean;
  candidates: Array<{
    displayName?: string;
    roleLabel: string;
    score: number;
  }>;
};

function publicScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function text(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function optionalName(value: string | undefined, include: boolean) {
  if (!include || !value) return undefined;
  const normalized = text(value, 40);
  return normalized || undefined;
}

export function buildOneToOnePublicShare(input: OneToOnePublicShareInput): OneToOnePublicShare {
  const includeNames = input.includeDisplayNames === true;
  const strength = input.strength
    ? { label: text(input.strength.label, 40), copy: text(input.strength.copy, 180) }
    : undefined;
  const tuning = input.tuning
    ? { label: text(input.tuning.label, 40), copy: text(input.tuning.copy, 180) }
    : undefined;

  return {
    version: PUBLIC_SHARE_CONTRACT_VERSION,
    product: "oneToOne",
    relationshipType: input.relationshipType,
    relationshipLabel: text(input.relationshipLabel, 30),
    headline: text(input.headline, 100),
    summary: text(input.summary, 240),
    score: publicScore(input.score),
    participants: {
      self: optionalName(input.selfName, includeNames),
      partner: optionalName(input.partnerName, includeNames),
    },
    archetype: {
      id: input.archetype.id,
      label: text(input.archetype.label, 80),
      subtitle: text(input.archetype.subtitle, 120),
      clue: text(input.archetype.clue, 180),
    },
    ...(strength ? { strength } : {}),
    ...(tuning ? { tuning } : {}),
  };
}

export function buildOneToManyPublicShare(input: OneToManyPublicShareInput): OneToManyPublicShare {
  const includeNames = input.includeDisplayNames === true;

  return {
    version: PUBLIC_SHARE_CONTRACT_VERSION,
    product: "oneToMany",
    relationshipType: input.relationshipType,
    relationshipLabel: text(input.relationshipLabel, 30),
    headline: text(input.headline, 100),
    summary: text(input.summary, 240),
    referenceName: optionalName(input.referenceName, includeNames),
    candidates: input.candidates.slice(0, 3).map((candidate) => ({
      displayName: optionalName(candidate.displayName, includeNames),
      roleLabel: text(candidate.roleLabel, 60),
      score: publicScore(candidate.score),
    })),
  };
}
