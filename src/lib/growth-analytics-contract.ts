export const GROWTH_EVENT_NAMES = [
  "share_card_open",
  "share_style_selected",
  "share_image_download",
  "share_native_open",
  "share_link_copy",
  "shared_view_open",
  "shared_view_reaction",
  "shared_view_cta_click",
  "shared_view_new_report_start",
] as const;

export type GrowthEventName = typeof GROWTH_EVENT_NAMES[number];
export type GrowthEventProduct = "oneToOne" | "oneToMany";
export type GrowthEventSurface = "one_to_one_share_card" | "one_to_many_share_card" | "shared_view";
export type GrowthSharePurpose = "relationship_label" | "two_sides" | "send_this" | "receipt" | "recap";
export type GrowthExperimentArm = "p6_receipt_first" | "p6_recap_first";
export type SharedViewReaction = "pretty_match" | "half" | "not_really";
export type GrowthCtaTarget = "oneToOne" | "oneToMany";
export type GrowthRelationshipType = "crush" | "flirting" | "lover" | "friend" | "coworker";

export type GrowthAnalyticsEvent = {
  eventName: GrowthEventName;
  product: GrowthEventProduct;
  relationshipType: GrowthRelationshipType;
  surface: GrowthEventSurface;
  sharePurpose?: GrowthSharePurpose;
  experimentArm?: GrowthExperimentArm;
  reaction?: SharedViewReaction;
  ctaTarget?: GrowthCtaTarget;
  shareToken?: string;
};

const EVENT_NAMES = new Set<string>(GROWTH_EVENT_NAMES);
const PRODUCTS = new Set<string>(["oneToOne", "oneToMany"]);
const RELATIONSHIP_TYPES = new Set<string>(["crush", "flirting", "lover", "friend", "coworker"]);
const SURFACES = new Set<string>(["one_to_one_share_card", "one_to_many_share_card", "shared_view"]);
const SHARE_PURPOSES = new Set<string>(["relationship_label", "two_sides", "send_this", "receipt", "recap"]);
const EXPERIMENT_ARMS = new Set<string>(["p6_receipt_first", "p6_recap_first"]);
const REACTIONS = new Set<string>(["pretty_match", "half", "not_really"]);
const CTA_TARGETS = new Set<string>(["oneToOne", "oneToMany"]);

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function enumValue<T extends string>(value: unknown, allowed: Set<string>): T | null {
  return typeof value === "string" && allowed.has(value) ? value as T : null;
}

function optionalEnumValue<T extends string>(value: unknown, allowed: Set<string>): T | undefined | null {
  if (value === undefined) return undefined;
  return enumValue<T>(value, allowed);
}

function optionalShareToken(value: unknown) {
  if (value === undefined) return undefined;
  return typeof value === "string" && value.length >= 20 && value.length <= 200 ? value : null;
}

export function parseGrowthAnalyticsEvent(value: unknown): GrowthAnalyticsEvent | null {
  const input = record(value);
  if (!input) return null;

  const eventName = enumValue<GrowthEventName>(input.eventName, EVENT_NAMES);
  const product = enumValue<GrowthEventProduct>(input.product, PRODUCTS);
  const relationshipType = enumValue<GrowthRelationshipType>(input.relationshipType, RELATIONSHIP_TYPES);
  const surface = enumValue<GrowthEventSurface>(input.surface, SURFACES);
  const sharePurpose = optionalEnumValue<GrowthSharePurpose>(input.sharePurpose, SHARE_PURPOSES);
  const experimentArm = optionalEnumValue<GrowthExperimentArm>(input.experimentArm, EXPERIMENT_ARMS);
  const reaction = optionalEnumValue<SharedViewReaction>(input.reaction, REACTIONS);
  const ctaTarget = optionalEnumValue<GrowthCtaTarget>(input.ctaTarget, CTA_TARGETS);
  const shareToken = optionalShareToken(input.shareToken);

  if (!eventName || !product || !relationshipType || !surface) return null;
  if (sharePurpose === null || experimentArm === null || reaction === null || ctaTarget === null || shareToken === null) return null;

  const shareCardSurface = surface === "one_to_one_share_card" || surface === "one_to_many_share_card";
  if (product === "oneToOne" && surface === "one_to_many_share_card") return null;
  if (product === "oneToMany" && surface === "one_to_one_share_card") return null;
  if (!shareCardSurface && (sharePurpose || experimentArm)) return null;

  switch (eventName) {
    case "share_card_open":
      if (!shareCardSurface) return null;
      break;
    case "share_style_selected":
    case "share_image_download":
      if (!shareCardSurface || !sharePurpose) return null;
      break;
    case "share_native_open":
    case "share_link_copy":
      if (!shareCardSurface || !sharePurpose || !shareToken) return null;
      break;
    case "shared_view_open":
      if (surface !== "shared_view" || !shareToken) return null;
      break;
    case "shared_view_reaction":
      if (surface !== "shared_view" || !shareToken || !reaction) return null;
      break;
    case "shared_view_cta_click":
    case "shared_view_new_report_start":
      if (surface !== "shared_view" || !shareToken || !ctaTarget) return null;
      break;
  }

  return {
    eventName,
    product,
    relationshipType,
    surface,
    ...(sharePurpose ? { sharePurpose } : {}),
    ...(experimentArm ? { experimentArm } : {}),
    ...(reaction ? { reaction } : {}),
    ...(ctaTarget ? { ctaTarget } : {}),
    ...(shareToken ? { shareToken } : {}),
  };
}
