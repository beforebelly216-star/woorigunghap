import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";
import { verifyPaidPayment } from "@/lib/payments/verification";
import { claimPaymentWebhook, completePaymentWebhook, failPaymentWebhook, markServerOrderPaid } from "@/lib/server-report-store";

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
  let webhook;
  let claimedWebhookId: string | null = null;
  try {
    webhook = await Webhook.verify(secret, payload, headers);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  try {
    if (webhook.type !== "Transaction.Paid") {
      return NextResponse.json({ received: true, type: webhook.type, ignored: true });
    }
    const webhookId = headers["webhook-id"];
    if (!webhookId) return NextResponse.json({ error: "Missing webhook id." }, { status: 400 });
    const claim = await claimPaymentWebhook(webhookId, webhook.data.paymentId, webhook.type);
    if (claim === "processed" || claim === "in_progress") {
      return NextResponse.json({ received: true, duplicate: true, type: webhook.type });
    }
    if (claim === "unavailable") {
      return NextResponse.json({ error: "Webhook store is unavailable." }, { status: 503 });
    }
    claimedWebhookId = webhookId;
    await verifyPaidPayment(webhook.data.paymentId);
    await markServerOrderPaid(webhook.data.paymentId);
    await completePaymentWebhook(webhookId);
    return NextResponse.json({ received: true, type: webhook.type });
  } catch (error) {
    if (claimedWebhookId) await failPaymentWebhook(claimedWebhookId).catch(() => false);
    console.error("[woorigunghap:payment-webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 503 });
  }
}
