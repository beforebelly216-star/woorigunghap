import type { GrowthExperimentArm, GrowthSharePurpose } from "@/lib/growth-analytics-contract";
import type { ShareCopyPurpose } from "@/lib/share/relationship-share-copy";

export const P6_EXPERIMENT_ARMS = ["p6_receipt_first", "p6_recap_first"] as const satisfies readonly GrowthExperimentArm[];

const P0_PURPOSES: readonly GrowthSharePurpose[] = [
  "relationship_label",
  "two_sides",
  "send_this",
];

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function assignP6ShareCardExperiment(seed: string | number): GrowthExperimentArm {
  return stableHash(String(seed)) % 2 === 0 ? "p6_receipt_first" : "p6_recap_first";
}

export function initialP6SharePurpose(arm: GrowthExperimentArm): GrowthSharePurpose {
  return arm === "p6_receipt_first" ? "receipt" : "recap";
}

export function orderedShareCardPurposes(arm: GrowthExperimentArm): readonly GrowthSharePurpose[] {
  const p1: readonly GrowthSharePurpose[] = arm === "p6_receipt_first"
    ? ["receipt", "recap"]
    : ["recap", "receipt"];
  return [...p1, ...P0_PURPOSES];
}

export function copyPurposeForShareCard(purpose: GrowthSharePurpose): ShareCopyPurpose {
  if (purpose === "receipt") return "two_sides";
  if (purpose === "recap") return "relationship_label";
  return purpose;
}

export function isP6SharePurpose(purpose: GrowthSharePurpose) {
  return purpose === "receipt" || purpose === "recap";
}
