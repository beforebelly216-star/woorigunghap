import type { OneToManyReportInput, OneToOneReportInput, PersonBirthInput } from "@/lib/report-input";

export const ORDER_BINDING_VERSION = "input-sha256-v2" as const;
export const LEGACY_ORDER_BINDING_VERSION = "input-sha256-v1" as const;
export type OrderBindingVersion = typeof ORDER_BINDING_VERSION | typeof LEGACY_ORDER_BINDING_VERSION;

function canonicalPerson(value: PersonBirthInput) {
  return {
    gender: value.gender,
    calendarType: value.calendarType,
    birthDate: value.birthDate,
    birthTimeKnown: value.birthTimeKnown,
    birthTime: value.birthTimeKnown ? value.birthTime : null,
    isLeapMonth: value.isLeapMonth,
  };
}

function digestCanonical(value: string) {
  const bytes = new TextEncoder().encode(value);
  return globalThis.crypto.subtle.digest("SHA-256", bytes).then((digest) =>
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  );
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
  return digestCanonical(canonicalizeOneToOneInput(input, version));
}


export function canonicalizeOneToManyInput(input: OneToManyReportInput) {
  return JSON.stringify({
    version: ORDER_BINDING_VERSION,
    relationshipType: input.relationshipType,
    referencePerson: canonicalPerson(input.referencePerson),
    candidates: input.candidates.map(canonicalPerson),
  });
}

export async function hashOneToManyInput(input: OneToManyReportInput) {
  return digestCanonical(canonicalizeOneToManyInput(input));
}
