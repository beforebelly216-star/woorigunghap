import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });
  const payload = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
  };
  try {
    const webhook = await Webhook.verify(secret, payload, headers);
    // TODO: Store webhook-id before handling Transaction.Paid, then verify paymentId.
    return NextResponse.json({ received: true, type: webhook.type });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
}
