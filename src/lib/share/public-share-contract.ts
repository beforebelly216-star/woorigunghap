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

const PUBLIC_RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "crush",
  "flirting",
  "lover",
  "friend",
  "coworker",
]);

const PUBLIC_ARCHETYPE_IDS = new Set<CompatibilityShareArchetype["id"]>([
  "spark",
  "complement",
  "interlock",
  "journey",
  "growth",
  "tuning",
]);

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

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = text(value, maxLength);
  return normalized || null;
}

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  return requiredText(value, maxLength) ?? undefined;
}

function relationshipType(value: unknown): RelationshipType | null {
  return typeof value === "string" && PUBLIC_RELATIONSHIP_TYPES.has(value as RelationshipType)
    ? value as RelationshipType
    : null;
}

function highlight(value: unknown): PublicShareHighlight | undefined {
  if (value === undefined) return undefined;
  const item = record(value);
  const label = requiredText(item?.label, 40);
  const copy = requiredText(item?.copy, 180);
  return label && copy ? { label, copy } : undefined;
}

export function parsePublicSharePayload(value: unknown): PublicSharePayload | null {
  const input = record(value);
  if (!input || input.version !== PUBLIC_SHARE_CONTRACT_VERSION) return null;

  const relation = relationshipType(input.relationshipType);
  const relationshipLabel = requiredText(input.relationshipLabel, 30);
  const headline = requiredText(input.headline, 100);
  const summary = requiredText(input.summary, 240);
  if (!relation || !relationshipLabel || !headline || !summary) return null;

  if (input.product === "oneToOne") {
    if (typeof input.score !== "number") return null;
    const participants = record(input.participants);
    const archetype = record(input.archetype);
    const archetypeId = archetype?.id;
    const archetypeLabel = requiredText(archetype?.label, 80);
    const archetypeSubtitle = requiredText(archetype?.subtitle, 120);
    const archetypeClue = requiredText(archetype?.clue, 180);
    if (
      typeof archetypeId !== "string"
      || !PUBLIC_ARCHETYPE_IDS.has(archetypeId as CompatibilityShareArchetype["id"])
      || !archetypeLabel
      || !archetypeSubtitle
      || !archetypeClue
    ) return null;

    return buildOneToOnePublicShare({
      relationshipType: relation,
      relationshipLabel,
      headline,
      summary,
      score: input.score,
      selfName: optionalText(participants?.self, 40),
      partnerName: optionalText(participants?.partner, 40),
      includeDisplayNames: true,
      archetype: {
        id: archetypeId as CompatibilityShareArchetype["id"],
        label: archetypeLabel,
        subtitle: archetypeSubtitle,
        clue: archetypeClue,
      },
      strength: highlight(input.strength),
      tuning: highlight(input.tuning),
    });
  }

  if (input.product === "oneToMany") {
    if (!Array.isArray(input.candidates) || input.candidates.length === 0) return null;
    const candidates = input.candidates.slice(0, 3).map((candidate) => {
      const item = record(candidate);
      const roleLabel = requiredText(item?.roleLabel, 60);
      const score = item?.score;
      if (!roleLabel || typeof score !== "number") return null;
      return {
        displayName: optionalText(item?.displayName, 40),
        roleLabel,
        score,
      };
    });
    if (candidates.some((candidate) => candidate === null)) return null;

    return buildOneToManyPublicShare({
      relationshipType: relation,
      relationshipLabel,
      headline,
      summary,
      referenceName: optionalText(input.referenceName, 40),
      includeDisplayNames: true,
      candidates: candidates as OneToManyPublicShareInput["candidates"],
    });
  }

  return null;
}
