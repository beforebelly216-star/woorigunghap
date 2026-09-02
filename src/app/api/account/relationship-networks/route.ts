import { NextRequest, NextResponse } from "next/server";
import {
  claimAccountRelationshipNetwork,
  listAccountRelationshipNetworks,
} from "@/lib/account-relationship-network-store";
import { isOpaqueToken, isSameOriginPost } from "@/lib/auth-policy";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export async function GET(request: NextRequest) {
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ authenticated: false, networks: [] }, {
      status: 401,
      headers: privateHeaders,
    });
  }
  try {
    const networks = await listAccountRelationshipNetworks(user.userId);
    return NextResponse.json({ authenticated: true, networks }, { headers: privateHeaders });
  } catch (error) {
    console.error(
      "[woorigunghap:account-relationship-network-list]",
      error instanceof Error ? error.name : "UNKNOWN",
    );
    return NextResponse.json({ error: "저장한 인연 네트워크를 불러오지 못했습니다." }, {
      status: 503,
      headers: privateHeaders,
    });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, {
      status: 403,
      headers: privateHeaders,
    });
  }
  if (Number(request.headers.get("content-length") || 0) > 2_048) {
    return NextResponse.json({ error: "요청 크기가 너무 큽니다." }, {
      status: 413,
      headers: privateHeaders,
    });
  }
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, {
      status: 401,
      headers: privateHeaders,
    });
  }
  const body = await request.json().catch(() => null) as {
    token?: unknown;
    ownerToken?: unknown;
  } | null;
  if (!isOpaqueToken(body?.token) || !isOpaqueToken(body?.ownerToken)) {
    return NextResponse.json({ error: "네트워크 저장 정보를 다시 확인해 주세요." }, {
      status: 400,
      headers: privateHeaders,
    });
  }

  try {
    const result = await claimAccountRelationshipNetwork({
      userId: user.userId,
      token: body.token,
      ownerToken: body.ownerToken,
    });
    if (result === "missing") {
      return NextResponse.json({ error: "네트워크 저장 권한을 확인하지 못했습니다." }, {
        status: 404,
        headers: privateHeaders,
      });
    }
    if (result === "conflict") {
      return NextResponse.json({ error: "이미 다른 카카오 계정에 저장된 네트워크입니다." }, {
        status: 409,
        headers: privateHeaders,
      });
    }
    if (result !== "claimed") {
      return NextResponse.json({ error: "네트워크 보관함을 확인할 수 없습니다." }, {
        status: 503,
        headers: privateHeaders,
      });
    }
    return NextResponse.json({ claimed: true }, { headers: privateHeaders });
  } catch (error) {
    console.error(
      "[woorigunghap:account-relationship-network-claim]",
      error instanceof Error ? error.name : "UNKNOWN",
    );
    return NextResponse.json({ error: "네트워크 저장 중 서버 오류가 발생했습니다." }, {
      status: 503,
      headers: privateHeaders,
    });
  }
}
