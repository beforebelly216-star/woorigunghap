import { after, NextRequest, NextResponse } from "next/server";
import { claimAccountReport } from "@/lib/account-report-store";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { kickOffPaidReportGeneration } from "@/lib/background-report-kickoff";
import {
  PaymentVerificationError,
  verifyPaidPayment,
} from "@/lib/payments/verification";
import { isResultAccessToken } from "@/lib/result-access-token";
import { markServerOrderPaid } from "@/lib/server-report-store";

export const runtime = "nodejs";
export const maxDuration = 240;

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

  if (!paymentId) {
    return NextResponse.json(
      { verified: false, error: "잘못된 결제 확인 요청입니다." },
      { status: 400 },
    );
  }

  try {
    const verified = await verifyPaidPayment(paymentId);
    try {
      await markServerOrderPaid(paymentId);
    } catch (error) {
      console.error("[woorigunghap:payment-store-mark]", error);
    }

    const user = await loadAuthenticatedRequestUser(request).catch(() => null);
    if (user) {
      const claimed = await claimAccountReport(user.userId, paymentId, verified.product).catch(() => "unavailable" as const);
      if (claimed === "conflict") {
        console.warn("[woorigunghap:auto-claim-conflict]", paymentId);
      }
    }

    const generationQueued = Boolean(accessToken && verified.product === "oneToMany");
    if (generationQueued && accessToken) {
      const origin = request.nextUrl.origin;
      after(async () => {
        const completed = await kickOffPaidReportGeneration({
          origin,
          paymentId,
          product: verified.product,
          accessToken,
          input: candidate?.input,
        });
        if (!completed) {
          console.warn("[woorigunghap:background-report-incomplete]", paymentId);
        }
      });
    }

    return NextResponse.json({ verified: true, ...verified, generationQueued });
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json(
        { verified: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { verified: false, error: "결제 확인 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
