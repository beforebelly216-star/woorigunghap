import { NextRequest, NextResponse } from "next/server";
import { loadOwnedAccountReport } from "@/lib/account-report-store";
import { isSameOriginPost } from "@/lib/auth-policy";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { isResultAccessToken } from "@/lib/result-access-token";
import { hasServerOrderAccess } from "@/lib/server-report-store";
import { parsePublicSharePayload } from "@/lib/share/public-share-contract";
import { createPublicShare } from "@/lib/share/public-share-store";

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

  const body = await request.json().catch(() => null) as {
    paymentId?: unknown;
    accessToken?: unknown;
    payload?: unknown;
  } | null;
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  const payload = parsePublicSharePayload(body?.payload);
  if (!paymentId || paymentId.length > 160 || !payload) {
    return NextResponse.json({ error: "공유할 결과 정보가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }

  try {
    let authorized = false;
    if (isResultAccessToken(body?.accessToken)) {
      authorized = await hasServerOrderAccess(paymentId, body.accessToken, payload.product);
    }

    if (!authorized) {
      const user = await loadAuthenticatedRequestUser(request).catch(() => null);
      if (user) {
        const owned = await loadOwnedAccountReport(user.userId, paymentId);
        authorized = owned?.product === payload.product;
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: "이 결제 결과의 공유 권한을 확인하지 못했습니다." }, { status: 403, headers: privateHeaders });
    }

    const token = await createPublicShare(paymentId, payload);
    if (!token) {
      return NextResponse.json({ error: "공유 저장소를 사용할 수 없습니다." }, { status: 503, headers: privateHeaders });
    }

    return NextResponse.json({ url: `/share/${token}` }, { status: 201, headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:public-share-create]", error);
    return NextResponse.json({ error: "공유 링크를 만들지 못했습니다." }, { status: 503, headers: privateHeaders });
  }
}
