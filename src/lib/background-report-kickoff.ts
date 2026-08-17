import "server-only";

import type { OrderDraft } from "@/lib/orders";

const PHASES = ["prepare", "intro", "dynamics", "action"] as const;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(url: string, body: unknown) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
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
    await wait(Math.min(4_000, attempt * 700));
  }
  return false;
}

export async function kickOffPaidReportGeneration({
  origin,
  paymentId,
  product,
  accessToken,
  input,
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

  if (!input) return false;
  for (const phase of PHASES) {
    const completed = await postWithRetry(`${origin}/api/compatibility/one-to-one`, {
      paymentId,
      accessToken,
      input,
      phase,
    });
    if (!completed) return false;
  }
  return true;
}
