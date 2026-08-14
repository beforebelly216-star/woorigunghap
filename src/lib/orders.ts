import { PRODUCTS, type ProductKey } from "@/lib/catalog";
import type { OneToOneReportInput } from "@/lib/report-input";

export const ORDER_DRAFT_VERSION = "order-draft-v1" as const;

export type OrderDraftStatus = "draft" | "payment_pending" | "paid" | "failed";

export type OneToOneOrderDraft = {
  version: typeof ORDER_DRAFT_VERSION;
  orderId: string;
  paymentId: string;
  product: "oneToOne";
  amount: number;
  status: OrderDraftStatus;
  createdAt: string;
  inputSnapshot: OneToOneReportInput;
};

export function buildPaymentId(product: ProductKey, orderId: string) {
  return `woori-${product}-${orderId}`;
}

export function createOneToOneOrderDraft(input: OneToOneReportInput): OneToOneOrderDraft {
  const orderId = crypto.randomUUID();
  return {
    version: ORDER_DRAFT_VERSION,
    orderId,
    paymentId: buildPaymentId("oneToOne", orderId),
    product: "oneToOne",
    amount: PRODUCTS.oneToOne.amount,
    status: "draft",
    createdAt: new Date().toISOString(),
    inputSnapshot: structuredClone(input),
  };
}

export function createRecoveredOneToOneOrderDraft(
  input: OneToOneReportInput,
  paymentId: string,
): OneToOneOrderDraft {
  const prefix = "woori-oneToOne-";
  if (!paymentId.startsWith(prefix) || paymentId.length <= prefix.length) {
    throw new Error("INVALID_RECOVERY_PAYMENT_ID");
  }

  return {
    version: ORDER_DRAFT_VERSION,
    orderId: paymentId.slice(prefix.length),
    paymentId,
    product: "oneToOne",
    amount: PRODUCTS.oneToOne.amount,
    status: "paid",
    createdAt: new Date().toISOString(),
    inputSnapshot: structuredClone(input),
  };
}
