import { NextRequest, NextResponse } from "next/server";
import { PaymentClient } from "@portone/server-sdk";
import { isProductKey, PRODUCTS } from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) return NextResponse.json({ error: "결제 서버 설정이 완료되지 않았습니다." }, { status: 503 });
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || typeof (body as { paymentId?: unknown }).paymentId !== "string" || !isProductKey((body as { product?: unknown }).product)) {
    return NextResponse.json({ error: "잘못된 결제 확인 요청입니다." }, { status: 400 });
  }
  const { paymentId, product } = body as { paymentId: string; product: keyof typeof PRODUCTS };
  try {
    const payment = await PaymentClient({ secret }).getPayment({ paymentId });
    const expected = PRODUCTS[product];
    if (payment.status !== "PAID" || payment.amount.total !== expected.amount) {
      return NextResponse.json({ verified: false, error: "결제 상태 또는 금액이 일치하지 않습니다." }, { status: 400 });
    }
    // TODO: Atomically mark the matching order paid and enqueue its report.
    return NextResponse.json({ verified: true, paymentId, product, amount: expected.amount });
  } catch {
    return NextResponse.json({ verified: false, error: "PortOne 결제 정보를 확인하지 못했습니다." }, { status: 502 });
  }
}
