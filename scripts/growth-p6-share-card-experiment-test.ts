import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  P6_EXPERIMENT_ARMS,
  assignP6ShareCardExperiment,
  copyPurposeForShareCard,
  initialP6SharePurpose,
  isP6SharePurpose,
  orderedShareCardPurposes,
} from "../src/lib/share/share-card-experiment";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

assert.deepEqual(P6_EXPERIMENT_ARMS, ["p6_receipt_first", "p6_recap_first"]);
assert.equal(assignP6ShareCardExperiment("stable-seed"), assignP6ShareCardExperiment("stable-seed"), "experiment assignment must be deterministic");
const observedArms = new Set(Array.from({ length: 100 }, (_, index) => assignP6ShareCardExperiment(`seed-${index}`)));
assert.deepEqual(observedArms, new Set(P6_EXPERIMENT_ARMS), "deterministic allocator must exercise both P6 arms");

for (const arm of P6_EXPERIMENT_ARMS) {
  const initialPurpose = initialP6SharePurpose(arm);
  const orderedPurposes = orderedShareCardPurposes(arm);
  assert.equal(orderedPurposes[0], initialPurpose, "assigned P1 card must be the first/default card");
  assert.deepEqual(new Set(orderedPurposes), new Set(["receipt", "recap", "relationship_label", "two_sides", "send_this"]));
}

assert.equal(copyPurposeForShareCard("receipt"), "two_sides", "Receipt must reuse the approved P2 two-sides copy pool");
assert.equal(copyPurposeForShareCard("recap"), "relationship_label", "Recap must reuse the approved P2 relationship-label copy pool");
assert.equal(copyPurposeForShareCard("send_this"), "send_this");
assert.equal(isP6SharePurpose("receipt"), true);
assert.equal(isP6SharePurpose("recap"), true);
assert.equal(isP6SharePurpose("two_sides"), false);

const oneToOne = source("src/app/one-to-one/result/compatibility-share-card.tsx");
const oneToMany = source("src/components/one-to-many-share-card.tsx");
for (const shareCard of [oneToOne, oneToMany]) {
  assert.match(shareCard, /canvas\.width = 1080/);
  assert.match(shareCard, /canvas\.height = 1920/);
  assert.match(shareCard, /useState\(false\)/, "display names must remain opt-in");
  assert.ok(!shareCard.includes("birthDate"));
  assert.ok(!shareCard.includes("birthTime"));
  assert.ok(!shareCard.includes("paymentId"));
  assert.ok(!shareCard.includes("accessToken"));
}

assert.match(oneToOne, /SHARE_OPTION = \{ purpose: \"recap\"/);
assert.doesNotMatch(oneToOne, /initialP6SharePurpose/);
assert.doesNotMatch(oneToOne, /orderedShareCardPurposes/);
assert.doesNotMatch(oneToOne, /copyPurposeForShareCard/);
assert.doesNotMatch(oneToOne, /typeTabs/);
assert.match(oneToMany, /관계 영수증/);
assert.match(oneToMany, /한 장 요약/);
assert.match(oneToMany, /purpose === \"receipt\"/);
assert.match(oneToMany, /purpose === \"recap\"/);
assert.match(oneToMany, /assignP6ShareCardExperiment/);
assert.match(oneToMany, /initialP6SharePurpose/);
assert.match(oneToMany, /orderedShareCardPurposes/);
assert.match(oneToMany, /copyPurposeForShareCard/);
assert.match(oneToMany, /experimentArm/);

assert.match(oneToOne, /buildOneToOnePublicShare/);
assert.match(oneToMany, /buildOneToManyPublicShare/);
assert.ok(!oneToOne.includes("anthropic"), "sharing must not trigger a new AI call");
assert.ok(!oneToMany.includes("anthropic"), "sharing must not trigger a new AI call");

const publicContract = source("src/lib/share/public-share-contract.ts");
assert.ok(!publicContract.includes("experimentArm"), "P6 experiment metadata must stay analytics-only and not expand the public DTO");
assert.ok(!publicContract.includes("sharePurpose"), "card selection must not expand the Shared View payload");

console.log("Growth share-card contract: PASS — fixed 1:1 recap, 1:N P6 experiment, 9:16 output, and unchanged public privacy boundary.");
