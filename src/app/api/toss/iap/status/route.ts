import { NextRequest, NextResponse } from "next/server";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";
import { isTossAuthConfigured, tossApiRequest } from "@/lib/toss-auth";
import { parseVerifiedTossOrder, TOSS_ORDER_ID } from "@/lib/toss-iap-protocol";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };

export async function POST(request: NextRequest) {
  if (!isAllowedTossOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user || user.provider !== "toss" || !user.providerUserId) return NextResponse.json({ error: "login_required" }, { status: 401, headers });
  const sku = process.env.APPS_IN_TOSS_ONE_TO_ONE_SKU;
  if (!isTossAuthConfigured() || !sku) return NextResponse.json({ error: "iap_not_configured" }, { status: 503, headers });
  const input = await request.json().catch(() => null);
  if (typeof input?.orderId !== "string" || !TOSS_ORDER_ID.test(input.orderId)) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400, headers });
  }
  try {
    // Filter ownership with the server-verified account key, never a client-supplied key.
    const result = await tossApiRequest("/api-partner/v1/apps-in-toss/order/get-order-status",
      { orderId: input.orderId }, undefined, user.providerUserId);
    const verified = parseVerifiedTossOrder(result, input.orderId, sku);
    // Status verification alone does not grant a product or start AI generation.
    return NextResponse.json({ verified, productGranted: false }, { headers });
  } catch { return NextResponse.json({ error: "iap_not_verified" }, { status: 409, headers }); }
}
