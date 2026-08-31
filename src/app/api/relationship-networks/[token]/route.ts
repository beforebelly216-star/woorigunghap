import { NextRequest, NextResponse } from "next/server";
import { isOpaqueToken, isSameOriginPost } from "@/lib/auth-policy";
import {
  deleteRelationshipNetwork,
  loadRelationshipNetwork,
  setRelationshipNetworkOpen,
} from "@/lib/relationship-network-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

function etagFor(version: number) {
  return `"relationship-network-${version}"`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token)) {
    return NextResponse.json({ error: "네트워크를 찾을 수 없습니다." }, { status: 404, headers: responseHeaders });
  }
  try {
    const network = await loadRelationshipNetwork(token);
    if (!network) {
      return NextResponse.json({ error: "네트워크를 찾을 수 없습니다." }, { status: 404, headers: responseHeaders });
    }
    const etag = etagFor(network.graphVersion);
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ...responseHeaders, etag } });
    }
    return NextResponse.json({ network }, { headers: { ...responseHeaders, etag } });
  } catch (error) {
    console.error("[woorigunghap:relationship-network-read]", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "네트워크를 불러오지 못했습니다." }, { status: 503, headers: responseHeaders });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token) || !isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: responseHeaders });
  }
  if (Number(request.headers.get("content-length") || 0) > 2_048) {
    return NextResponse.json({ error: "요청 크기가 너무 큽니다." }, { status: 413, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as { ownerToken?: unknown; isOpen?: unknown } | null;
  if (typeof body?.ownerToken !== "string" || typeof body?.isOpen !== "boolean") {
    return NextResponse.json({ error: "관리 요청을 다시 확인해 주세요." }, { status: 400, headers: responseHeaders });
  }
  try {
    const network = await setRelationshipNetworkOpen(token, body.ownerToken, body.isOpen);
    if (!network) {
      return NextResponse.json({ error: "네트워크 관리 권한을 확인하지 못했습니다." }, { status: 403, headers: responseHeaders });
    }
    return NextResponse.json({ network }, { headers: responseHeaders });
  } catch (error) {
    console.error("[woorigunghap:relationship-network-update]", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "네트워크 상태를 바꾸지 못했습니다." }, { status: 503, headers: responseHeaders });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token) || !isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: responseHeaders });
  }
  if (Number(request.headers.get("content-length") || 0) > 2_048) {
    return NextResponse.json({ error: "요청 크기가 너무 큽니다." }, { status: 413, headers: responseHeaders });
  }
  const body = await request.json().catch(() => null) as { ownerToken?: unknown } | null;
  if (typeof body?.ownerToken !== "string") {
    return NextResponse.json({ error: "관리 요청을 다시 확인해 주세요." }, { status: 400, headers: responseHeaders });
  }
  try {
    const deleted = await deleteRelationshipNetwork(token, body.ownerToken);
    if (!deleted) {
      return NextResponse.json({ error: "네트워크 관리 권한을 확인하지 못했습니다." }, { status: 403, headers: responseHeaders });
    }
    return NextResponse.json({ deleted: true }, { headers: responseHeaders });
  } catch (error) {
    console.error("[woorigunghap:relationship-network-delete]", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "네트워크를 삭제하지 못했습니다." }, { status: 503, headers: responseHeaders });
  }
}
