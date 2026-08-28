import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "@portone/server-sdk";
import { markExistingServerOrderPaid } from "@/lib/payment-order-finalization";
import { verifyPaidPayment } from "@/lib/payments/verification";
import { claimPaymentWebhook, completePaymentWebhook, failPaymentWebhook } from "@/lib/server-report-store";

export const runtime = "nodejs";
export const maxDuration = 30;

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
    if (claim === "conflict") {
      return NextResponse.json({ error: "Webhook id conflicts with a different payment event." }, { status: 409 });
    }
    if (claim === "unavailable") {
      return NextResponse.json({ error: "Webhook store is unavailable." }, { status: 503 });
    }
    claimedWebhookId = webhookId;

    await verifyPaidPayment(webhook.data.paymentId);
    const paidStored = await markExistingServerOrderPaid(webhook.data.paymentId);
    if (!paidStored) {
      throw new Error("PAID_ORDER_ROW_NOT_FOUND");
    }

    await completePaymentWebhook(webhookId);
    return NextResponse.json({ received: true, type: webhook.type });
  } catch (error) {
    if (claimedWebhookId) await failPaymentWebhook(claimedWebhookId).catch(() => false);
    console.error("[woorigunghap:payment-webhook]", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 503 });
  }
}
