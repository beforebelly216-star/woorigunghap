import type { OneToOneOrderDraft } from "@/lib/orders";
import { createResultAccessToken, isResultAccessToken } from "@/lib/result-access-token";

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
    return {
      ...parsed,
      resultAccessToken: isResultAccessToken(parsed.resultAccessToken)
        ? parsed.resultAccessToken
        : createResultAccessToken(),
    } as OneToOneOrderDraft;
  } catch {
    return null;
  }
}

function safeGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function saveOrderDraft(order: OneToOneOrderDraft) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(order);
  const key = storageKey(order.paymentId);

  // Keep both stores when available. Either store may be unavailable in restrictive browser modes.
  safeSet(window.sessionStorage, key, serialized);
  safeSet(window.localStorage, key, serialized);
}

export function loadOrderDraft(paymentId: string): OneToOneOrderDraft | null {
  if (typeof window === "undefined") return null;
  const key = storageKey(paymentId);

  const fromSession = parseOrderDraft(safeGet(window.sessionStorage, key), paymentId);
  if (fromSession) {
    const serialized = JSON.stringify(fromSession);
    safeSet(window.sessionStorage, key, serialized);
    safeSet(window.localStorage, key, serialized);
    return fromSession;
  }

  const fromLocal = parseOrderDraft(safeGet(window.localStorage, key), paymentId);
  if (fromLocal) saveOrderDraft(fromLocal);
  return fromLocal;
}
