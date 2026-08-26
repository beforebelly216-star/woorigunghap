import { CALENDAR_TYPES, GENDERS, type PersonBirthInput } from "@/lib/report-input";

export const SOULMATE_PERSON_STORAGE_KEY = "woorigunghap_free_soulmate_person_v1";

export function parseSoulmatePerson(value: unknown): PersonBirthInput | null {
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
  ) return null;
  return candidate as PersonBirthInput;
}
