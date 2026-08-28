import { after, NextRequest, NextResponse } from "next/server";
import { claimAccountReport } from "@/lib/account-report-store";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { kickOffPaidReportGeneration } from "@/lib/background-report-kickoff";
import {
  PaidOrderFinalizationError,
  finalizeVerifiedPaidOrder,
} from "@/lib/payment-order-finalization";
import {
  PaymentVerificationError,
  productFromPaymentId,
  verifyPaidPayment,
} from "@/lib/payments/verification";
import {
  parseOneToManyReportInput,
  parseOneToOneReportInput,
  validateOneToManyReportInput,
  validateOneToOneReportInput,
} from "@/lib/report-input";
import { isResultAccessToken } from "@/lib/result-access-token";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { verified: false, error: "JSON 요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const candidate = body && typeof body === "object" && !Array.isArray(body)
    ? body as { paymentId?: unknown; accessToken?: unknown; input?: unknown }
    : null;
  const paymentId = typeof candidate?.paymentId === "string" ? candidate.paymentId : null;
  const accessToken = isResultAccessToken(candidate?.accessToken) ? candidate.accessToken : null;
  const product = paymentId ? productFromPaymentId(paymentId) : null;

  if (!paymentId || !product || !accessToken) {
    return NextResponse.json(
      {
        verified: false,
        error: "결제번호 또는 결과 복구키가 올바르지 않습니다.",
        code: "PAYMENT_VERIFY_REQUEST_INVALID",
      },
      { status: 400 },
    );
  }

  const input = product === "oneToMany"
    ? parseOneToManyReportInput(candidate?.input)
    : parseOneToOneReportInput(candidate?.input);
  if (!input) {
    return NextResponse.json(
      { verified: false, error: "결제 당시 입력정보를 확인할 수 없습니다.", code: "PAYMENT_INPUT_REQUIRED" },
      { status: 400 },
    );
  }

  const validation = product === "oneToMany"
    ? validateOneToManyReportInput(input as ReturnType<typeof parseOneToManyReportInput> & {})
    : validateOneToOneReportInput(input as ReturnType<typeof parseOneToOneReportInput> & {});
  if (!validation.valid) {
    return NextResponse.json(
      { verified: false, error: "결제 당시 입력정보가 올바르지 않습니다.", code: "PAYMENT_INPUT_INVALID" },
      { status: 400 },
    );
  }

  try {
    const verified = await verifyPaidPayment(paymentId, product, input);

    await finalizeVerifiedPaidOrder({
      paymentId,
      product,
      input,
      accessToken,
      inputBoundByPayment: verified.inputBound,
    });

    const user = await loadAuthenticatedRequestUser(request).catch(() => null);
    if (user) {
      const claimed = await claimAccountReport(user.userId, paymentId, verified.product).catch(() => "unavailable" as const);
      if (claimed === "conflict") {
        console.warn("[woorigunghap:auto-claim-conflict]", paymentId);
      }
    }

    const generationQueued = verified.product === "oneToMany";
    if (generationQueued) {
      const origin = request.nextUrl.origin;
      after(async () => {
        const completed = await kickOffPaidReportGeneration({
          origin,
          paymentId,
          product: verified.product,
          accessToken,
          input,
        });
        if (!completed) {
          console.warn("[woorigunghap:background-report-incomplete]", paymentId);
        }
      });
    }

    return NextResponse.json({ verified: true, ...verified, generationQueued });
  } catch (error) {
    if (error instanceof PaidOrderFinalizationError) {
      return NextResponse.json(
        {
          verified: false,
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        },
        { status: error.status },
      );
    }
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json(
        {
          verified: false,
          error: error.message,
          code: error.code,
          retryable: error.code === "PORTONE_LOOKUP_FAILED" || error.code === "PAYMENT_NOT_PAID",
        },
        { status: error.status },
      );
    }

    console.error("[woorigunghap:payment-verify-unexpected]", error);
    return NextResponse.json(
      {
        verified: false,
        error: "결제 확인 중 서버 오류가 발생했습니다. 같은 결제로 다시 확인할 수 있습니다.",
        code: "PAYMENT_VERIFY_UNEXPECTED",
        retryable: true,
      },
      { status: 503 },
    );
  }
}
