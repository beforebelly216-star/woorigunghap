import type { OneToOneOrderDraft } from "@/lib/orders";

const ORDER_STORAGE_PREFIX = "woorigunghap:order:";

function storageKey(paymentId: string) {
  return `${ORDER_STORAGE_PREFIX}${paymentId}`;
}

function parseOrderDraft(raw: string | null, paymentId: string): OneToOneOrderDraft | null {
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

export function saveOrderDraft(order: OneToOneOrderDraft) {
  const serialized = JSON.stringify(order);
  const key = storageKey(order.paymentId);

  // sessionStorage keeps compatibility with the original checkout flow.
  sessionStorage.setItem(key, serialized);
  // localStorage lets the same paid result survive new tabs and browser restarts
  // on the same browser profile until server-side order storage is introduced.
  localStorage.setItem(key, serialized);
}

export function loadOrderDraft(paymentId: string): OneToOneOrderDraft | null {
  const key = storageKey(paymentId);

  const fromSession = parseOrderDraft(sessionStorage.getItem(key), paymentId);
  if (fromSession) {
    // Opportunistically migrate old session-only drafts to localStorage.
    localStorage.setItem(key, JSON.stringify(fromSession));
    return fromSession;
  }

  return parseOrderDraft(localStorage.getItem(key), paymentId);
}
