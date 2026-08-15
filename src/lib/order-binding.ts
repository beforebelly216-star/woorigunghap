import type { OneToOneReportInput } from "@/lib/report-input";

export const ORDER_BINDING_VERSION = "input-sha256-v1" as const;

export function canonicalizeOneToOneInput(input: OneToOneReportInput) {
  const person = (value: OneToOneReportInput["personA"]) => ({
    displayName: value.displayName,
    gender: value.gender,
    calendarType: value.calendarType,
    birthDate: value.birthDate,
    birthTimeKnown: value.birthTimeKnown,
    birthTime: value.birthTimeKnown ? value.birthTime : null,
    isLeapMonth: value.isLeapMonth,
  });

  return JSON.stringify({
    version: ORDER_BINDING_VERSION,
    relationshipType: input.relationshipType,
    personA: person(input.personA),
    personB: person(input.personB),
  });
}

export async function hashOneToOneInput(input: OneToOneReportInput) {
  const bytes = new TextEncoder().encode(canonicalizeOneToOneInput(input));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
