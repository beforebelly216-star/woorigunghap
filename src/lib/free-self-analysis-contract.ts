// Deprecated compatibility shim for existing 1:1 prefill imports.
// The old free relationship-self-analysis result contract was retired in favor of the free soulmate input flow.
export {
  SOULMATE_PERSON_STORAGE_KEY as FREE_SELF_PERSON_STORAGE_KEY,
  parseSoulmatePerson as parseFreeSelfPerson,
} from "@/lib/soulmate-input-contract";
