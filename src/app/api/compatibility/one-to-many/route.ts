import { NextRequest, NextResponse } from "next/server";
import { calculateOneToManyCompatibility } from "@/lib/compatibility/one-to-many";
import { generateOneToManyNarrative } from "@/lib/narrative/one-to-many-report-engine";
import { PaymentVerificationError, verifyPaidPayment } from "@/lib/payments/verification";
import { validateOneToManyReportInput } from "@/lib/report-input";
import { isResultAccessToken } from "@/lib/result-access-token";
import {
  claimOneToManyGeneration,
  loadServerOrderForAccess,
  loadOneToManyStoredReport,
  markServerOrderPaid,
  releaseOneToManyGeneration,
  saveOneToManyStoredReport,
} from "@/lib/server-report-store";

export const runtime = "nodejs";
export const maxDuration = 240;
const REPORT_RUNTIME_VERSION = "one-to-many-paid-report-v1-20260816";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }

  const candidate = body && typeof body === "object" && !Array.isArray(body)
    ? body as { paymentId?: unknown; accessToken?: unknown }
    : null;
  const paymentId = typeof candidate?.paymentId === "string" ? candidate.paymentId : null;
  const accessToken = isResultAccessToken(candidate?.accessToken) ? candidate.accessToken : null;

  if (!paymentId || !accessToken) {
    return NextResponse.json({ error: "결제번호 또는 복구키가 올바르지 않습니다.", retryable: false }, {
      status: 400,
      headers: privateHeaders,
    });
  }
  try {
    const order = await loadServerOrderForAccess(paymentId, accessToken, "oneToMany");
    if (!order || order.product !== "oneToMany") {
      return NextResponse.json({ error: "이 주문의 결과 복구키가 일치하지 않습니다.", code: "RESULT_ACCESS_DENIED", retryable: false }, {
        status: 403,
        headers: privateHeaders,
      });
    }
    const input = order.inputSnapshot;
    const validation = validateOneToManyReportInput(input);
    if (!validation.valid) {
      return NextResponse.json({ error: "저장된 비교 입력값을 확인할 수 없습니다.", retryable: false }, { status: 409, headers: privateHeaders });
    }
    const payment = await verifyPaidPayment(paymentId, "oneToMany", input);
    if (!payment.inputBound) {
      throw new PaymentVerificationError(
        "결제 당시 입력정보를 검증할 수 없는 주문입니다.",
        409,
        "PAYMENT_INPUT_BINDING_REQUIRED",
      );
    }
    await markServerOrderPaid(paymentId);

    const stored = await loadOneToManyStoredReport(paymentId);
    if (stored) {
      return NextResponse.json({ ...stored, restored: true, reportRuntimeVersion: REPORT_RUNTIME_VERSION, payment }, { headers: privateHeaders });
    }

    const claimed = await claimOneToManyGeneration(paymentId);
    if (!claimed) {
      return NextResponse.json({
        error: "같은 결제의 리포트를 생성하고 있어요. 잠시 후 자동으로 다시 확인해 주세요.",
        code: "REPORT_GENERATION_IN_PROGRESS",
        retryable: true,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      }, { status: 409, headers: privateHeaders });
    }

    try {
      const snapshot = calculateOneToManyCompatibility(input);
      const generated = await generateOneToManyNarrative(snapshot);
      const saved = await saveOneToManyStoredReport(paymentId, snapshot, generated.narrative, generated.meta);
      if (!saved) throw new Error("ONE_TO_MANY_REPORT_PERSIST_FAILED");

      return NextResponse.json({
        version: "one-to-many-stored-report-v1",
        paymentId,
        snapshot,
        narrative: generated.narrative,
        meta: generated.meta,
        restored: false,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        payment,
      }, { headers: privateHeaders });
    } catch (error) {
      await releaseOneToManyGeneration(paymentId).catch(() => false);
      throw error;
    }
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        retryable: error.code === "PORTONE_LOOKUP_FAILED" || error.code === "PAYMENT_NOT_PAID",
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      }, { status: error.status, headers: privateHeaders });
    }
    console.error("[woorigunghap:one-to-many-paid-report]", error);
    return NextResponse.json({
      error: "리포트 생성 중 일시적인 문제가 생겼어요. 같은 결제로 다시 시도할 수 있습니다.",
      code: "REPORT_GENERATION_RETRY",
      retryable: true,
      reportRuntimeVersion: REPORT_RUNTIME_VERSION,
    }, { status: 503, headers: privateHeaders });
  }
}
