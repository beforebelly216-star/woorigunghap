import { PaymentClient } from "@portone/server-sdk";
import { PRODUCTS, type ProductKey } from "@/lib/catalog";

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

export async function verifyPaidPayment(
  paymentId: string,
  expectedProduct?: ProductKey,
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

  return {
    paymentId,
    product,
    amount: expected.amount,
    status: payment.status,
  } as const;
}
