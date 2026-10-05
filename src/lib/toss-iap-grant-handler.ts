import { NextRequest, NextResponse } from "next/server";
import { parseVerifiedTossOrder, TOSS_ORDER_ID } from "./toss-iap-protocol";
import type { createFullbuyStore } from "./fullbuy-store-core";

const headers = { "cache-control": "private, no-store", "referrer-policy": "no-referrer" };
export function createTossIapGrantHandler(deps: {
  authenticate: (request: NextRequest) => Promise<{ userId: string; provider?: string; providerUserId?: string } | null>;
  allowedOrigin: (origin: string | null) => boolean;
  configuration: () => { sku: string; amount: number } | null;
  // Must use the authenticated providerUserId as x-toss-user-key, never a request field.
  verify: (orderId: string, providerUserId: string) => Promise<unknown>;
  store: () => ReturnType<typeof createFullbuyStore>;
}) {
  return async function POST(request: NextRequest) {
    if (!deps.allowedOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
    const user = await deps.authenticate(request).catch(() => null);
    if (!user || user.provider !== "toss" || !user.providerUserId) return NextResponse.json({ error: "login_required" }, { status: 401, headers });
    const config = deps.configuration();
    if (!config || !config.sku || !Number.isInteger(config.amount) || config.amount < 3 || config.amount > 3000 || config.amount % 3) {
      return NextResponse.json({ error: "iap_not_configured" }, { status: 503, headers });
    }
    let input;
    try {
      const reader = request.body?.getReader();
      if (!reader) throw new Error("missing_body");
      try {
        const chunks: Uint8Array[] = []; let size = 0;
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 2048) { await reader.cancel(); throw new Error("body_limit"); }
          chunks.push(value);
        }
        input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } finally { reader.releaseLock(); }
    } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400, headers }); }
    if (typeof input?.orderId !== "string" || !TOSS_ORDER_ID.test(input.orderId) || input.sku !== config.sku) {
      return NextResponse.json({ error: "invalid_order" }, { status: 400, headers });
    }
    try {
      const orderId = input.orderId.toLowerCase();
      const verified = parseVerifiedTossOrder(await deps.verify(orderId, user.providerUserId), orderId, config.sku);
      const wallet = await deps.store().credit(user.userId, "iap", orderId, config.amount);
      return NextResponse.json({ productGranted: true, verified, wallet }, { headers });
    } catch {
      // A timeout after COMMIT is recovered by the same order ID. Never acknowledge
      // SDK product delivery before the persistent ledger operation has succeeded.
      return NextResponse.json({ error: "iap_grant_not_confirmed", productGranted: false }, { status: 409, headers });
    }
  };
}
