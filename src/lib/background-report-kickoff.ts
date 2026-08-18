import "server-only";

import type { OrderDraft } from "@/lib/orders";
import { notifyReportCompleted } from "@/lib/report-completion-notification";

const ONE_TO_ONE_SEGMENTS = ["intro", "dynamics", "action"] as const;

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

  const prepared = await postWithRetry(`${origin}/api/compatibility/one-to-one`, {
    paymentId,
    accessToken,
    input,
    phase: "prepare",
  }, 3);
  if (!prepared) return false;

  // Each paid segment can consume most of one Vercel function lifetime. Running
  // them sequentially here can outlive the payment-verification function and
  // strand the order when the buyer leaves the result page. Segment locks and
  // atomic server-store writes make this fan-out safe and idempotent.
  const completed = await Promise.all(ONE_TO_ONE_SEGMENTS.map((phase) => postWithRetry(
    `${origin}/api/compatibility/one-to-one`,
    { paymentId, accessToken, input, phase },
    1,
  )));
  const reportCompleted = completed.every(Boolean);
  if (reportCompleted) await notifyReportCompleted(paymentId);
  return reportCompleted;
}
