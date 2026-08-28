import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/catalog";
import { ORDER_BINDING_VERSION, hashOneToManyInput, hashOneToOneInput } from "@/lib/order-binding";
import { productFromPaymentId } from "@/lib/payments/verification";
import {
  parseOneToManyReportInput,
  parseOneToOneReportInput,
  validateOneToManyReportInput,
  validateOneToOneReportInput,
  type OneToManyReportInput,
  type OneToOneReportInput,
} from "@/lib/report-input";
import { isResultAccessToken } from "@/lib/result-access-token";
import { isServerReportStoreConfigured, loadServerOrderPaymentState } from "@/lib/server-report-store";

export const runtime = "nodejs";
export const maxDuration = 15;

function paymentReference(paymentId: string) {
  return createHash("sha256").update(paymentId).digest("hex").slice(0, 12);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ready: false, error: "JSON 요청 형식이 올바르지 않습니다.", code: "PAYMENT_READY_REQUEST_INVALID" }, { status: 400 });
  }

  const candidate = body && typeof body === "object" && !Array.isArray(body)
    ? body as { paymentId?: unknown; accessToken?: unknown; input?: unknown }
    : null;
  const paymentId = typeof candidate?.paymentId === "string" ? candidate.paymentId : null;
  const accessToken = isResultAccessToken(candidate?.accessToken) ? candidate.accessToken : null;
  const product = paymentId ? productFromPaymentId(paymentId) : null;

  if (!paymentId || !product || !accessToken) {
    return NextResponse.json({ ready: false, error: "주문번호 또는 결과 복구키가 올바르지 않습니다.", code: "PAYMENT_READY_REQUEST_INVALID" }, { status: 400 });
  }

  let input: OneToOneReportInput | OneToManyReportInput;
  if (product === "oneToMany") {
    const parsed = parseOneToManyReportInput(candidate?.input);
    if (!parsed || !validateOneToManyReportInput(parsed).valid) {
      return NextResponse.json({ ready: false, error: "주문 입력정보가 올바르지 않습니다.", code: "PAYMENT_READY_INPUT_INVALID" }, { status: 400 });
    }
    input = parsed;
  } else {
    const parsed = parseOneToOneReportInput(candidate?.input);
    if (!parsed || !validateOneToOneReportInput(parsed, { requireCoworkerHierarchy: true }).valid) {
      return NextResponse.json({ ready: false, error: "주문 입력정보가 올바르지 않습니다.", code: "PAYMENT_READY_INPUT_INVALID" }, { status: 400 });
    }
    input = parsed;
  }

  if (!isServerReportStoreConfigured()) {
    console.error("[woorigunghap:payment-ready-store-not-configured]", {
      paymentRef: paymentReference(paymentId),
      product,
    });
    return NextResponse.json({
      ready: false,
      error: "결제 결과 저장소 연결이 준비되지 않아 결제를 시작할 수 없습니다.",
      code: "PAYMENT_STORE_NOT_CONFIGURED",
    }, { status: 503 });
  }

  try {
    const record = await loadServerOrderPaymentState(paymentId, accessToken, product);
    if (!record) {
      return NextResponse.json({
        ready: false,
        error: "서버에 안전하게 저장된 주문을 확인하지 못했습니다. 입력 화면에서 다시 시작해 주세요.",
        code: "PAYMENT_ORDER_NOT_READY",
      }, { status: 409 });
    }
    if (record.generationStatus === "deleted") {
      return NextResponse.json({ ready: false, error: "삭제된 주문으로는 결제할 수 없습니다.", code: "PAYMENT_ORDER_DELETED" }, { status: 410 });
    }
    if (record.paymentStatus === "paid") {
      return NextResponse.json({ ready: true, alreadyPaid: true });
    }
    if (record.paymentStatus !== "draft" && record.paymentStatus !== "payment_pending") {
      return NextResponse.json({ ready: false, error: "현재 주문 상태로는 결제를 시작할 수 없습니다.", code: "PAYMENT_ORDER_STATUS_INVALID" }, { status: 409 });
    }
    if (record.order.amount !== PRODUCTS[product].amount) {
      return NextResponse.json({ ready: false, error: "저장된 주문 금액이 현재 상품과 일치하지 않습니다.", code: "PAYMENT_ORDER_MISMATCH" }, { status: 409 });
    }

    const [storedHash, requestedHash] = product === "oneToMany"
      ? await Promise.all([
          hashOneToManyInput(record.order.inputSnapshot as OneToManyReportInput, ORDER_BINDING_VERSION),
          hashOneToManyInput(input as OneToManyReportInput, ORDER_BINDING_VERSION),
        ])
      : await Promise.all([
          hashOneToOneInput(record.order.inputSnapshot as OneToOneReportInput, ORDER_BINDING_VERSION),
          hashOneToOneInput(input as OneToOneReportInput, ORDER_BINDING_VERSION),
        ]);
    if (storedHash !== requestedHash) {
      return NextResponse.json({ ready: false, error: "서버 주문과 현재 입력정보가 일치하지 않습니다.", code: "PAYMENT_INPUT_MISMATCH" }, { status: 409 });
    }

    return NextResponse.json({ ready: true, alreadyPaid: false });
  } catch (error) {
    console.error("[woorigunghap:payment-ready-store-unavailable]", {
      paymentRef: paymentReference(paymentId),
      product,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json({
      ready: false,
      error: "주문 저장소 연결을 확인하지 못해 결제를 시작하지 않았습니다. 잠시 후 다시 시도해 주세요.",
      code: "PAYMENT_STORE_UNAVAILABLE",
    }, { status: 503 });
  }
}
