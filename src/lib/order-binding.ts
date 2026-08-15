import type { OneToOneReportInput } from "@/lib/report-input";

export const ORDER_BINDING_VERSION = "input-sha256-v2" as const;
export const LEGACY_ORDER_BINDING_VERSION = "input-sha256-v1" as const;
export type OrderBindingVersion = typeof ORDER_BINDING_VERSION | typeof LEGACY_ORDER_BINDING_VERSION;

function canonicalPerson(value: OneToOneReportInput["personA"]) {
  return {
    gender: value.gender,
    calendarType: value.calendarType,
    birthDate: value.birthDate,
    birthTimeKnown: value.birthTimeKnown,
    birthTime: value.birthTimeKnown ? value.birthTime : null,
    isLeapMonth: value.isLeapMonth,
  };
}

export function canonicalizeOneToOneInput(
  input: OneToOneReportInput,
  version: OrderBindingVersion = ORDER_BINDING_VERSION,
) {
  const person = (value: OneToOneReportInput["personA"]) => version === LEGACY_ORDER_BINDING_VERSION
    ? { displayName: value.displayName, ...canonicalPerson(value) }
    : canonicalPerson(value);

  return JSON.stringify({
    version,
    relationshipType: input.relationshipType,
    personA: person(input.personA),
    personB: person(input.personB),
  });
}

export async function hashOneToOneInput(
  input: OneToOneReportInput,
  version: OrderBindingVersion = ORDER_BINDING_VERSION,
) {
  const bytes = new TextEncoder().encode(canonicalizeOneToOneInput(input, version));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
