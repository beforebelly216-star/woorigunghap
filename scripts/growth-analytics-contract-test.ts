import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  GROWTH_EVENT_NAMES,
  parseGrowthAnalyticsEvent,
  type GrowthAnalyticsEvent,
} from "../src/lib/growth-analytics-contract";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

assert.equal(GROWTH_EVENT_NAMES.length, 9, "Growth P5 must expose exactly the nine minimum funnel events");
assert.equal(new Set(GROWTH_EVENT_NAMES).size, 9, "Growth event names must be unique");

const shareToken = "public-share-token-1234567890";
const validEvents: GrowthAnalyticsEvent[] = [
  { eventName: "share_card_open", product: "oneToOne", relationshipType: "lover", surface: "one_to_one_share_card" },
  { eventName: "share_style_selected", product: "oneToOne", relationshipType: "lover", surface: "one_to_one_share_card", sharePurpose: "two_sides" },
  { eventName: "share_image_download", product: "oneToMany", relationshipType: "friend", surface: "one_to_many_share_card", sharePurpose: "send_this" },
  { eventName: "share_native_open", product: "oneToOne", relationshipType: "flirting", surface: "one_to_one_share_card", sharePurpose: "relationship_label", shareToken },
  { eventName: "share_link_copy", product: "oneToMany", relationshipType: "coworker", surface: "one_to_many_share_card", sharePurpose: "two_sides", shareToken },
  { eventName: "shared_view_open", product: "oneToOne", relationshipType: "crush", surface: "shared_view", shareToken },
  { eventName: "shared_view_reaction", product: "oneToOne", relationshipType: "lover", surface: "shared_view", reaction: "pretty_match", shareToken },
  { eventName: "shared_view_cta_click", product: "oneToMany", relationshipType: "friend", surface: "shared_view", ctaTarget: "oneToMany", shareToken },
  { eventName: "shared_view_new_report_start", product: "oneToOne", relationshipType: "flirting", surface: "shared_view", ctaTarget: "oneToOne", shareToken },
];
for (const event of validEvents) assert.deepEqual(parseGrowthAnalyticsEvent(event), event);
assert.equal(parseGrowthAnalyticsEvent({ ...validEvents[6], reaction: "secret_thought" }), null);
assert.equal(parseGrowthAnalyticsEvent({ ...validEvents[3], shareToken: undefined }), null);
assert.equal(parseGrowthAnalyticsEvent({ ...validEvents[0], product: "oneToMany" }), null, "1:1 surface/product mismatch must be rejected");

const contract = source("src/lib/growth-analytics-contract.ts");
for (const eventName of GROWTH_EVENT_NAMES) assert.ok(contract.includes(`\"${eventName}\"`), `missing event contract: ${eventName}`);
assert.ok(!contract.includes("displayName"));
assert.ok(!contract.includes("paymentId"));
assert.ok(!contract.includes("birthDate"));
assert.ok(!contract.includes("narrative"));

const client = source("src/lib/growth-analytics-client.ts");
assert.match(client, /fetch\("\/api\/analytics\/growth"/);
assert.match(client, /keepalive:\s*true/);
assert.match(client, /\.catch\(\(\) => undefined\)/);
assert.match(client, /best-effort/);

const store = source("src/lib/growth-analytics-store.ts");
assert.match(store, /CREATE TABLE IF NOT EXISTS woorigunghap_growth_events/);
assert.match(store, /public_share_token_hash TEXT REFERENCES woorigunghap_public_shares\(token_hash\) ON DELETE CASCADE/);
assert.match(store, /hashOpaqueToken\(event\.shareToken\)/);
assert.match(store, /SELECT token_hash[\s\S]*FROM woorigunghap_public_shares/);
assert.ok(!store.includes("source_payment_id"), "analytics store must not copy payment identifiers");
assert.ok(!store.includes("payload_json"), "analytics store must not store arbitrary payloads");
assert.ok(!store.includes("displayName"));
assert.ok(!store.includes("birthDate"));

const route = source("src/app/api/analytics/growth/route.ts");
assert.match(route, /isSameOriginPost\(request\)/);
assert.match(route, /parseGrowthAnalyticsEvent/);
assert.match(route, /recordGrowthEvent/);
assert.match(route, /status:\s*stored \? 204 : 202/);
assert.match(route, /status:\s*202/);

const oneToOne = source("src/app/one-to-one/result/compatibility-share-card.tsx");
const oneToMany = source("src/components/one-to-many-share-card.tsx");
for (const shareCard of [oneToOne, oneToMany]) {
  assert.match(shareCard, /share_card_open/);
  assert.match(shareCard, /share_style_selected/);
  assert.match(shareCard, /share_image_download/);
  assert.match(shareCard, /share_native_open/);
  assert.match(shareCard, /share_link_copy/);
  assert.match(shareCard, /publicShareTokenFromUrl/);
}

const actions = source("src/app/share/[token]/shared-view-actions.tsx");
assert.match(actions, /꽤 맞음/);
assert.match(actions, /반반/);
assert.match(actions, /아닌데/);
assert.match(actions, /shared_view_open/);
assert.match(actions, /shared_view_reaction/);
assert.match(actions, /shared_view_cta_click/);
assert.match(actions, /shared_view_new_report_start/);
assert.match(actions, /reaction && <section className=\{styles\.cta\}>/);

const sharedView = source("src/app/share/[token]/page.tsx");
assert.match(sharedView, /SharedViewActions/);
assert.ok(!sharedView.includes("paymentId"));
assert.ok(!sharedView.includes("accessToken"));
assert.ok(!sharedView.includes("birthDate"));

console.log("Growth P5 reaction + analytics contract: PASS — nine-event funnel, privacy-bounded storage, and best-effort non-blocking delivery.");
