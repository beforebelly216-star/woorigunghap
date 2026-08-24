import "server-only";

import type { OrderDraft } from "@/lib/orders";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(url: string, body: unknown, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (response.ok) return true;
      const payload = await response.json().catch(() => null) as { code?: unknown; retryable?: unknown } | null;
      const retryable = payload?.retryable === true
        || payload?.code === "REPORT_GENERATION_IN_PROGRESS"
        || response.status === 409
        || response.status === 429
        || response.status >= 500;
      if (!retryable) return false;
    } catch {
      // Treat transient internal fetch failures as retryable while the originating function is alive.
    }
    if (attempt < maxAttempts) await wait(Math.min(4_000, attempt * 700));
  }
  return false;
}

export async function kickOffPaidReportGeneration({
  origin,
  paymentId,
  product,
  accessToken,
}: {
  origin: string;
  paymentId: string;
  product: OrderDraft["product"];
  accessToken: string;
  input?: unknown;
}) {
  if (product === "oneToMany") {
    return postWithRetry(`${origin}/api/compatibility/one-to-many`, { paymentId, accessToken });
  }

  // 1:1 generation is intentionally driven by the active result page. Nesting
  // three long 1:1 report requests inside payment verification creates competing
  // segment-lock owners and can strand the visible request in
  // REPORT_GENERATION_IN_PROGRESS. Stored segment progress still lets a buyer
  // leave and resume without another payment.
  return false;
}
