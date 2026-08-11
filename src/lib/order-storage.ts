import type { OneToOneOrderDraft } from "@/lib/orders";

const ORDER_STORAGE_PREFIX = "woorigunghap:order:";

export function saveOrderDraft(order: OneToOneOrderDraft) {
  sessionStorage.setItem(`${ORDER_STORAGE_PREFIX}${order.paymentId}`, JSON.stringify(order));
}

export function loadOrderDraft(paymentId: string): OneToOneOrderDraft | null {
  const raw = sessionStorage.getItem(`${ORDER_STORAGE_PREFIX}${paymentId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OneToOneOrderDraft>;
    if (
      parsed.version !== "order-draft-v1" ||
      parsed.paymentId !== paymentId ||
      parsed.product !== "oneToOne" ||
      typeof parsed.orderId !== "string" ||
      !parsed.inputSnapshot
    ) {
      return null;
    }
    return parsed as OneToOneOrderDraft;
  } catch {
    return null;
  }
}
