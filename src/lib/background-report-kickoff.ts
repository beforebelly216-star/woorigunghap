import "server-only";

import type { OrderDraft } from "@/lib/orders";

const PHASES = ["prepare", "intro", "dynamics", "action"] as const;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(url: string, body: unknown) {
  // Background work is best-effort. Long AI failures must not keep the
  // payment-verification function alive through repeated full generations.
  // Persisted segments are resumed from the result page/account library.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (response.ok) return true;
      const payload = await response.json().catch(() => null) as { code?: unknown; retryable?: unknown } | null;
      const shortContention = payload?.code === "REPORT_GENERATION_IN_PROGRESS"
        || response.status === 409
        || response.status === 429;
      if (!shortContention) return false;
    } catch {
      return false;
    }
    await wait(Math.min(2_500, attempt * 700));
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
