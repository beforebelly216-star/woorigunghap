import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { PRODUCTS, type ProductKey } from "@/lib/catalog";
import {
  ORDER_BINDING_VERSION,
  hashOneToManyInput,
  hashOneToOneInput,
} from "@/lib/order-binding";
import type { OneToManyReportInput, OneToOneReportInput } from "@/lib/report-input";
import { isResultAccessToken } from "@/lib/result-access-token";

export class PaidOrderFinalizationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "PaidOrderFinalizationError";
  }
}

type PaidInput = OneToOneReportInput | OneToManyReportInput;

type StoredOrderShape = {
  version?: unknown;
  orderId?: unknown;
  paymentId?: unknown;
  product?: unknown;
  amount?: unknown;
  status?: unknown;
  createdAt?: unknown;
  inputSnapshot?: unknown;
};

type FinalizePaidOrderOptions = {
  paymentId: string;
  product: ProductKey;
  input: PaidInput;
  accessToken: string;
  inputBoundByPayment: boolean;
};

function accessTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(stored: unknown, candidate: string) {
  if (typeof stored !== "string") return false;
  const candidateHash = accessTokenHash(candidate);
  if (stored.length !== candidateHash.length) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(candidateHash));
}

async function inputHash(product: ProductKey, input: PaidInput) {
  return product === "oneToMany"
    ? hashOneToManyInput(input as OneToManyReportInput, ORDER_BINDING_VERSION)
    : hashOneToOneInput(input as OneToOneReportInput, ORDER_BINDING_VERSION);
}

function parseStoredOrder(raw: unknown): StoredOrderShape | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as StoredOrderShape
      : null;
  } catch {
    return null;
  }
}

function recoveredStoredOrder(paymentId: string, product: ProductKey, input: PaidInput) {
  const prefix = `woori-${product}-`;
  if (!paymentId.startsWith(prefix) || paymentId.length <= prefix.length) {
    throw new PaidOrderFinalizationError(
      "결제번호 형식이 올바르지 않습니다.",
      400,
      "INVALID_PAYMENT_ID",
    );
  }
  return {
    version: "order-draft-v1",
    orderId: paymentId.slice(prefix.length),
    paymentId,
    product,
    amount: PRODUCTS[product].amount,
    status: "paid",
    createdAt: new Date().toISOString(),
    inputSnapshot: structuredClone(input),
  };
}

/**
 * Persist the already-verified PortOne payment into the authoritative order row.
 * This function intentionally does not run schema DDL on the paid hot path.
 * Normal checkout creates the order row before PortOne is opened. Missing-row
 * recovery is allowed only when PortOne customData has cryptographically bound
 * the exact input snapshot supplied by the browser.
 */
export async function finalizeVerifiedPaidOrder(options: FinalizePaidOrderOptions) {
  const { paymentId, product, input, accessToken, inputBoundByPayment } = options;
  if (!isResultAccessToken(accessToken)) {
    throw new PaidOrderFinalizationError(
      "결제 결과 복구키가 올바르지 않습니다.",
      400,
      "RESULT_ACCESS_TOKEN_REQUIRED",
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new PaidOrderFinalizationError(
      "결제 결과 저장소 설정을 확인해야 합니다.",
      503,
      "PAYMENT_STORE_NOT_CONFIGURED",
      true,
    );
  }

  const sql = neon(connectionString);
  let rows;
  try {
    rows = await sql`
      SELECT order_json, access_token_hash, generation_status
      FROM woorigunghap_order_records
      WHERE payment_id = ${paymentId}
      LIMIT 1
    `;
  } catch (error) {
    console.error("[woorigunghap:paid-finalization-read]", error);
    throw new PaidOrderFinalizationError(
      "결제는 승인됐지만 결과 저장소에 연결하지 못했습니다.",
      503,
      "PAYMENT_STORE_UNAVAILABLE",
      true,
    );
  }

  let row = rows[0];
  if (!row) {
    if (!inputBoundByPayment) {
      throw new PaidOrderFinalizationError(
        "결제 당시 입력정보와 현재 요청을 안전하게 연결할 수 없습니다.",
        409,
        "PAYMENT_INPUT_BINDING_REQUIRED",
      );
    }
    const storedOrder = recoveredStoredOrder(paymentId, product, input);
    try {
      const inserted = await sql`
        INSERT INTO woorigunghap_order_records (
          payment_id,
          order_json,
          access_token_hash,
          payment_status,
          generation_status,
          created_at,
          updated_at
        ) VALUES (
          ${paymentId},
          ${JSON.stringify(storedOrder)},
          ${accessTokenHash(accessToken)},
          'paid',
          'idle',
          NOW(),
          NOW()
        )
        ON CONFLICT (payment_id) DO NOTHING
        RETURNING order_json, access_token_hash, generation_status
      `;
      row = inserted[0];
      if (!row) {
        const raced = await sql`
          SELECT order_json, access_token_hash, generation_status
          FROM woorigunghap_order_records
          WHERE payment_id = ${paymentId}
          LIMIT 1
        `;
        row = raced[0];
      }
    } catch (error) {
      console.error("[woorigunghap:paid-finalization-recover]", error);
      throw new PaidOrderFinalizationError(
        "결제는 승인됐지만 결과 저장 상태를 복구하지 못했습니다.",
        503,
        "PAYMENT_STORE_RECOVERY_FAILED",
        true,
      );
    }
  }

  if (!row) {
    throw new PaidOrderFinalizationError(
      "결제는 승인됐지만 서버 주문을 찾지 못했습니다.",
      503,
      "PAYMENT_ORDER_MISSING",
      true,
    );
  }
  if (row.generation_status === "deleted") {
    throw new PaidOrderFinalizationError(
      "삭제된 주문은 다시 생성할 수 없습니다.",
      410,
      "PAYMENT_ORDER_DELETED",
    );
  }
  if (!tokenMatches(row.access_token_hash, accessToken)) {
    throw new PaidOrderFinalizationError(
      "이 주문의 결과 복구키가 일치하지 않습니다.",
      403,
      "RESULT_ACCESS_DENIED",
    );
  }

  const stored = parseStoredOrder(row.order_json);
  if (
    !stored
    || stored.paymentId !== paymentId
    || stored.product !== product
    || stored.amount !== PRODUCTS[product].amount
    || !stored.inputSnapshot
  ) {
    throw new PaidOrderFinalizationError(
      "저장된 주문 정보와 결제 정보가 일치하지 않습니다.",
      409,
      "PAYMENT_ORDER_MISMATCH",
    );
  }

  const [storedInputHash, requestedInputHash] = await Promise.all([
    inputHash(product, stored.inputSnapshot as PaidInput),
    inputHash(product, input),
  ]);
  if (storedInputHash !== requestedInputHash) {
    throw new PaidOrderFinalizationError(
      "결제 당시 입력정보와 현재 요청한 입력정보가 일치하지 않습니다.",
      409,
      "PAYMENT_INPUT_MISMATCH",
    );
  }

  try {
    const updated = await sql`
      UPDATE woorigunghap_order_records
      SET payment_status = 'paid', updated_at = NOW()
      WHERE payment_id = ${paymentId}
        AND generation_status <> 'deleted'
      RETURNING payment_id
    `;
    if (updated.length !== 1) {
      throw new PaidOrderFinalizationError(
        "결제는 승인됐지만 서버 주문 상태를 확정하지 못했습니다.",
        503,
        "PAYMENT_PAID_STORE_PENDING",
        true,
      );
    }
  } catch (error) {
    if (error instanceof PaidOrderFinalizationError) throw error;
    console.error("[woorigunghap:paid-finalization-write]", error);
    throw new PaidOrderFinalizationError(
      "결제는 승인됐지만 서버 주문 상태를 저장하지 못했습니다.",
      503,
      "PAYMENT_STORE_UNAVAILABLE",
      true,
    );
  }

  return true;
}

export async function markExistingServerOrderPaid(paymentId: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return false;
  const sql = neon(connectionString);
  const rows = await sql`
    UPDATE woorigunghap_order_records
    SET payment_status = 'paid', updated_at = NOW()
    WHERE payment_id = ${paymentId}
      AND generation_status <> 'deleted'
    RETURNING payment_id
  `;
  return rows.length === 1;
}
