import { PaymentClient } from "@portone/server-sdk";
import { neon } from "@neondatabase/serverless";
import { PRODUCTS, type ProductKey } from "@/lib/catalog";
import {
  LEGACY_ORDER_BINDING_VERSION,
  OLDER_ORDER_BINDING_VERSION,
  ORDER_BINDING_VERSION,
  PREVIOUS_ORDER_BINDING_VERSION,
  hashOneToOneInput,
  hashOneToManyInput,
  type OrderBindingVersion,
} from "@/lib/order-binding";
import type { OneToManyReportInput, OneToOneReportInput } from "@/lib/report-input";

const PAYMENT_LOOKUP_TIMEOUT_MS = 10_000;
const SERVER_RECEIPT_TIMEOUT_MS = 6_000;

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
  return value === ORDER_BINDING_VERSION
    || value === PREVIOUS_ORDER_BINDING_VERSION
    || value === OLDER_ORDER_BINDING_VERSION
    || value === LEGACY_ORDER_BINDING_VERSION;
}

function isTerminalPaymentStatus(status: unknown) {
  return status === "FAILED" || status === "CANCELLED" || status === "PARTIAL_CANCELLED";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(code)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type StoredPaidOrder = {
  product?: unknown;
  amount?: unknown;
  inputSnapshot?: unknown;
};

async function hashInputForProduct(
  product: ProductKey,
  input: OneToOneReportInput | OneToManyReportInput,
) {
  return product === "oneToMany"
    ? hashOneToManyInput(input as OneToManyReportInput, ORDER_BINDING_VERSION)
    : hashOneToOneInput(input as OneToOneReportInput, ORDER_BINDING_VERSION);
}

async function loadTrustedServerPaidOrder(
  paymentId: string,
  product: ProductKey,
  expectedInput: OneToOneReportInput | OneToManyReportInput | undefined,
) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || !expectedInput) return null;

  try {
    const sql = neon(connectionString);
    const rows = await withTimeout(sql`
      SELECT order_json
      FROM woorigunghap_order_records
      WHERE payment_id = ${paymentId}
        AND payment_status = 'paid'
        AND generation_status <> 'deleted'
      LIMIT 1
    `, SERVER_RECEIPT_TIMEOUT_MS, "SERVER_RECEIPT_TIMEOUT");
    const raw = rows[0]?.order_json;
    if (typeof raw !== "string") return null;

    const stored = JSON.parse(raw) as StoredPaidOrder;
    if (
      stored.product !== product
      || stored.amount !== PRODUCTS[product].amount
      || !stored.inputSnapshot
    ) return null;

    const [storedHash, requestedHash] = await Promise.all([
      hashInputForProduct(product, stored.inputSnapshot as OneToOneReportInput | OneToManyReportInput),
      hashInputForProduct(product, expectedInput),
    ]);
    if (storedHash !== requestedHash) {
      throw new PaymentVerificationError(
        "결제 당시 입력정보와 현재 요청한 입력정보가 일치하지 않습니다.",
        409,
        "PAYMENT_INPUT_MISMATCH",
      );
    }

    return {
      paymentId,
      product,
      amount: PRODUCTS[product].amount,
      status: "PAID" as const,
      inputBound: true,
      source: "server-paid-order" as const,
    };
  } catch (error) {
    if (error instanceof PaymentVerificationError) throw error;
    // A server-store read problem must not weaken payment verification. Fall back
    // to PortOne, which remains the authority for first-time payment validation.
    return null;
  }
}

export async function verifyPaidPayment(
  paymentId: string,
  expectedProduct?: ProductKey,
  expectedInput?: OneToOneReportInput | OneToManyReportInput,
) {
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

  const trustedPaidOrder = await loadTrustedServerPaidOrder(paymentId, product, expectedInput);
  if (trustedPaidOrder) return trustedPaidOrder;

  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) {
    throw new PaymentVerificationError(
      "결제 서버 설정이 완료되지 않았습니다.",
      503,
      "PAYMENT_SERVER_NOT_CONFIGURED",
    );
  }

  let payment;
  try {
    payment = await withTimeout(
      PaymentClient({ secret }).getPayment({ paymentId }),
      PAYMENT_LOOKUP_TIMEOUT_MS,
      "PORTONE_LOOKUP_TIMEOUT",
    );
  } catch {
    throw new PaymentVerificationError(
      "PortOne 결제 정보를 확인하지 못했습니다.",
      502,
      "PORTONE_LOOKUP_FAILED",
    );
  }

  const expected = PRODUCTS[product];
  if (payment.status !== "PAID") {
    if (isTerminalPaymentStatus(payment.status)) {
      throw new PaymentVerificationError(
        "결제가 실패했거나 취소된 주문입니다.",
        402,
        "PAYMENT_TERMINAL",
      );
    }
    throw new PaymentVerificationError(
      "결제 승인 상태가 아직 반영되지 않았습니다.",
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
      const expectedInputHash = product === "oneToMany"
        ? await hashOneToManyInput(expectedInput as OneToManyReportInput, bindingVersion)
        : await hashOneToOneInput(expectedInput as OneToOneReportInput, bindingVersion);
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
    source: "portone" as const,
  } as const;
}
