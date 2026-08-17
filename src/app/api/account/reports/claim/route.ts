import { NextRequest, NextResponse } from "next/server";
import { claimAccountReport } from "@/lib/account-report-store";
import { isSameOriginPost } from "@/lib/auth-policy";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { isResultAccessToken } from "@/lib/result-access-token";
import { loadServerOrderForAccess } from "@/lib/server-report-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: privateHeaders });
  }
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: privateHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "저장 요청 형식이 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }
  const candidate = body && typeof body === "object" && !Array.isArray(body)
    ? body as { paymentId?: unknown; accessToken?: unknown }
    : null;
  const paymentId = typeof candidate?.paymentId === "string" ? candidate.paymentId : null;
  const accessToken = isResultAccessToken(candidate?.accessToken) ? candidate.accessToken : null;
  if (!paymentId || !accessToken) {
    return NextResponse.json({ error: "결과 연결 정보가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }

  try {
    const order = await loadServerOrderForAccess(paymentId, accessToken);
    if (!order || order.status !== "paid") {
      return NextResponse.json({ error: "완료된 결제를 확인하지 못했습니다." }, { status: 404, headers: privateHeaders });
    }
    const claimed = await claimAccountReport(user.userId, paymentId, order.product);
    if (claimed === "conflict") {
      return NextResponse.json({ error: "이미 다른 계정에 저장된 결과입니다." }, { status: 409, headers: privateHeaders });
    }
    if (claimed !== "claimed") {
      return NextResponse.json({ error: "보관함 저장소를 확인할 수 없습니다." }, { status: 503, headers: privateHeaders });
    }
    return NextResponse.json({ claimed: true, product: order.product }, { headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:account-report-claim]", error);
    return NextResponse.json({ error: "보관함 저장 중 서버 오류가 발생했습니다." }, { status: 503, headers: privateHeaders });
  }
}
