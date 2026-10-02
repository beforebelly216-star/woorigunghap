export const TOSS_ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseVerifiedTossOrder(value: unknown, orderId: string, sku: string) {
  if (!value || typeof value !== "object") throw new Error("invalid_iap_response");
  const envelope = value as Record<string, unknown>;
  if (envelope.resultType !== "SUCCESS" || !envelope.success || typeof envelope.success !== "object") {
    throw new Error("iap_verification_failed");
  }
  const order = envelope.success as Record<string, unknown>;
  if (order.orderId !== orderId || order.sku !== sku) throw new Error("iap_order_mismatch");
  if (order.status !== "PAYMENT_COMPLETED" && order.status !== "PURCHASED") {
    throw new Error(order.status === "REFUNDED" ? "iap_refunded" : "iap_not_paid");
  }
  return { orderId, sku, status: order.status };
}
