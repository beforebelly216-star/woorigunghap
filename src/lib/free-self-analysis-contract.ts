import {
  CALENDAR_TYPES,
  GENDERS,
  type PersonBirthInput,
} from "@/lib/report-input";

export const FREE_SELF_ANALYSIS_VERSION = "free-self-v1" as const;
export const FREE_SELF_PERSON_STORAGE_KEY = "woorigunghap_free_self_person_v1";

export const FREE_SELF_INSIGHT_KEYS = [
  "relationship_strength",
  "social_radar",
  "friction_pattern",
  "relationship_rhythm",
] as const;

export type FreeSelfInsightKey = (typeof FREE_SELF_INSIGHT_KEYS)[number];

export type FreeSelfInsight = {
  key: FreeSelfInsightKey;
  label: string;
  body: string;
};

export type FreeSelfAnalysisResult = {
  version: typeof FREE_SELF_ANALYSIS_VERSION;
  displayName: string;
  dayPillar: string;
  archetypeTitle: string;
  tagline: string;
  insights: FreeSelfInsight[];
  accuracyNote: string | null;
};

export function parseFreeSelfPerson(value: unknown): PersonBirthInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.displayName !== "string"
    || !GENDERS.includes(candidate.gender as PersonBirthInput["gender"])
    || !CALENDAR_TYPES.includes(candidate.calendarType as PersonBirthInput["calendarType"])
    || typeof candidate.birthDate !== "string"
    || typeof candidate.birthTimeKnown !== "boolean"
    || !(typeof candidate.birthTime === "string" || candidate.birthTime === null)
    || typeof candidate.isLeapMonth !== "boolean"
  ) {
    return null;
  }

  return candidate as PersonBirthInput;
}
