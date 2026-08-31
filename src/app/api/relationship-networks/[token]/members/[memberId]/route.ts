import { NextRequest, NextResponse } from "next/server";
import { isOpaqueToken, isSameOriginPost } from "@/lib/auth-policy";
import { removeRelationshipNetworkMember } from "@/lib/relationship-network-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; memberId: string }> },
) {
  const { token, memberId } = await params;
  if (!isOpaqueToken(token) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId) || !isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: responseHeaders });
  }
  if (Number(request.headers.get("content-length") || 0) > 2_048) {
    return NextResponse.json({ error: "요청 크기가 너무 큽니다." }, { status: 413, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as { credential?: unknown } | null;
  if (typeof body?.credential !== "string") {
    return NextResponse.json({ error: "삭제 요청을 다시 확인해 주세요." }, { status: 400, headers: responseHeaders });
  }
  try {
    const network = await removeRelationshipNetworkMember({ token, memberId, credential: body.credential });
    if (!network) {
      return NextResponse.json({ error: "삭제 권한이나 참여자를 확인하지 못했습니다." }, { status: 403, headers: responseHeaders });
    }
    return NextResponse.json({ network }, { headers: responseHeaders });
  } catch (error) {
    console.error("[woorigunghap:relationship-network-member-delete]", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "참여 정보를 삭제하지 못했습니다." }, { status: 503, headers: responseHeaders });
  }
}
