import { PaymentClient } from "@portone/server-sdk";
import { PRODUCTS, type ProductKey } from "@/lib/catalog";
import {
  LEGACY_ORDER_BINDING_VERSION,
  ORDER_BINDING_VERSION,
  hashOneToOneInput,
  type OrderBindingVersion,
} from "@/lib/order-binding";
import type { OneToOneReportInput } from "@/lib/report-input";

export class PaymentVerificationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

export function productFromPaymentId(paymentId: string): ProductKey | null {
  for (const product of Object.keys(PRODUCTS) as ProductKey[]) {
    if (paymentId.startsWith(`woori-${product}-`)) return product;
  }
  return null;
}

function parseCustomData(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function isBindingVersion(value: unknown): value is OrderBindingVersion {
  return value === ORDER_BINDING_VERSION || value === LEGACY_ORDER_BINDING_VERSION;
}

export async function verifyPaidPayment(
  paymentId: string,
  expectedProduct?: ProductKey,
  expectedInput?: OneToOneReportInput,
) {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) {
    throw new PaymentVerificationError(
      "결제 서버 설정이 완료되지 않았습니다.",
      503,
      "PAYMENT_SERVER_NOT_CONFIGURED",
    );
  }

  const product = productFromPaymentId(paymentId);
  if (!product) {
    throw new PaymentVerificationError(
      "알 수 없는 결제 상품입니다.",
      400,
      "UNKNOWN_PRODUCT",
    );
  }

  if (expectedProduct && product !== expectedProduct) {
    throw new PaymentVerificationError(
      "결제 상품이 요청한 리포트와 일치하지 않습니다.",
      400,
      "PRODUCT_MISMATCH",
    );
  }

  let payment;
  try {
    payment = await PaymentClient({ secret }).getPayment({ paymentId });
  } catch {
    throw new PaymentVerificationError(
      "PortOne 결제 정보를 확인하지 못했습니다.",
      502,
      "PORTONE_LOOKUP_FAILED",
    );
  }

  const expected = PRODUCTS[product];
  if (payment.status !== "PAID") {
    throw new PaymentVerificationError(
      "결제가 완료된 주문만 결과를 계산할 수 있습니다.",
      402,
      "PAYMENT_NOT_PAID",
    );
  }

  if (payment.amount.total !== expected.amount) {
    throw new PaymentVerificationError(
      "결제 금액이 상품 금액과 일치하지 않습니다.",
      400,
      "PAYMENT_AMOUNT_MISMATCH",
    );
  }

  const customData = parseCustomData((payment as unknown as { customData?: unknown }).customData);
  if (customData?.product && customData.product !== product) {
    throw new PaymentVerificationError(
      "결제 상품 정보가 요청한 리포트와 일치하지 않습니다.",
      400,
      "PAYMENT_CUSTOM_DATA_MISMATCH",
    );
  }

  let inputBound = false;
  if (expectedInput) {
    const bindingVersion = customData?.bindingVersion;
    const paidInputHash = customData?.inputHash;
    if (isBindingVersion(bindingVersion) && typeof paidInputHash === "string") {
      const expectedInputHash = await hashOneToOneInput(expectedInput, bindingVersion);
      if (paidInputHash !== expectedInputHash) {
        throw new PaymentVerificationError(
          "결제 당시 입력정보와 현재 요청한 입력정보가 일치하지 않습니다.",
          409,
          "PAYMENT_INPUT_MISMATCH",
        );
      }
      inputBound = true;
    }
  }

  return {
    paymentId,
    product,
    amount: expected.amount,
    status: payment.status,
    inputBound,
  } as const;
}
