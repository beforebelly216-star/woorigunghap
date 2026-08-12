import { NextRequest, NextResponse } from "next/server";
import {
  PaymentVerificationError,
  verifyPaidPayment,
} from "@/lib/payments/verification";

export const runtime = "nodejs";

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

  const paymentId =
    body &&
    typeof body === "object" &&
    typeof (body as { paymentId?: unknown }).paymentId === "string"
      ? (body as { paymentId: string }).paymentId
      : null;

  if (!paymentId) {
    return NextResponse.json(
      { verified: false, error: "잘못된 결제 확인 요청입니다." },
      { status: 400 },
    );
  }

  try {
    const verified = await verifyPaidPayment(paymentId);
    return NextResponse.json({ verified: true, ...verified });
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
