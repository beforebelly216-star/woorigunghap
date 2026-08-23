"use client";

import { loadOrderDraft } from "@/lib/order-storage";
import { isResultAccessToken } from "@/lib/result-access-token";
import type { PublicSharePayload } from "@/lib/share/public-share-contract";

function resultAccessTokenFromPage(paymentId: string) {
  const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get("accessToken");
  if (isResultAccessToken(fragmentToken)) return fragmentToken;

  const stored = loadOrderDraft(paymentId);
  return stored?.paymentId === paymentId && isResultAccessToken(stored.resultAccessToken)
    ? stored.resultAccessToken
    : null;
}

export async function createPublicShareUrl(payload: PublicSharePayload) {
  const paymentId = new URLSearchParams(window.location.search).get("paymentId");
  if (!paymentId) throw new Error("PUBLIC_SHARE_SOURCE_MISSING");

  const response = await fetch("/api/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      paymentId,
      accessToken: resultAccessTokenFromPage(paymentId),
      payload,
    }),
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  const result = await response.json().catch(() => null) as { url?: string; error?: string } | null;
  if (!response.ok || !result?.url) {
    throw new Error(result?.error ?? "공유 링크를 만들지 못했습니다.");
  }
  return new URL(result.url, window.location.origin).toString();
}
