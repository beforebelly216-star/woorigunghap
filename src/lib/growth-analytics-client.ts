"use client";

import type { GrowthAnalyticsEvent } from "@/lib/growth-analytics-contract";

export function trackGrowthEvent(event: GrowthAnalyticsEvent) {
  try {
    void fetch("/api/analytics/growth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      cache: "no-store",
      credentials: "same-origin",
      keepalive: true,
      referrerPolicy: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Growth analytics are deliberately best-effort and never block product UX.
  }
}

export function publicShareTokenFromUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const match = parsed.pathname.match(/^\/share\/([^/]+)\/?$/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
