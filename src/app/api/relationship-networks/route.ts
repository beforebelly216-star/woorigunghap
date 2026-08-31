import { NextRequest, NextResponse } from "next/server";
import { isOpaqueToken, isSameOriginPost } from "@/lib/auth-policy";
import {
  consumeRelationshipNetworkRateLimit,
  createRelationshipNetwork,
  isRelationshipNetworkStoreConfigured,
} from "@/lib/relationship-network-store";
import {
  parsePersonBirthInput,
  validatePersonBirthInput,
} from "@/lib/report-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const responseHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

function clientAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: responseHeaders });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8_192) {
    return NextResponse.json({ error: "요청 크기가 너무 큽니다." }, { status: 413, headers: responseHeaders });
  }

  try {
    if (!isRelationshipNetworkStoreConfigured()) {
      return NextResponse.json({ error: "네트워크 저장소를 준비하고 있습니다." }, { status: 503, headers: responseHeaders });
    }
    const allowed = await consumeRelationshipNetworkRateLimit(
      `create:${clientAddress(request)}`,
      5,
      10 * 60,
    );
    if (!allowed) {
      return NextResponse.json({ error: "잠시 후 다시 네트워크를 만들어 주세요." }, { status: 429, headers: responseHeaders });
    }

    const body = await request.json().catch(() => null) as {
      person?: unknown;
      consent?: unknown;
      token?: unknown;
      ownerToken?: unknown;
      memberToken?: unknown;
      idempotencyKey?: unknown;
    } | null;
    const person = parsePersonBirthInput(body?.person);
    if (
      !person
      || body?.consent !== true
      || !isOpaqueToken(body.token)
      || !isOpaqueToken(body.ownerToken)
      || !isOpaqueToken(body.memberToken)
      || typeof body.idempotencyKey !== "string"
    ) {
      return NextResponse.json({ error: "입력 정보와 공개 동의를 다시 확인해 주세요." }, { status: 400, headers: responseHeaders });
    }
    const fieldErrors = validatePersonBirthInput(person, "person");
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: "입력 정보를 다시 확인해 주세요.", fieldErrors }, { status: 400, headers: responseHeaders });
    }
    const created = await createRelationshipNetwork(person, {
      token: body.token,
      ownerToken: body.ownerToken,
      memberToken: body.memberToken,
      idempotencyKey: body.idempotencyKey,
    });
    if (!created) {
      return NextResponse.json({ error: "네트워크 저장소를 사용할 수 없습니다." }, { status: 503, headers: responseHeaders });
    }
    return NextResponse.json({
      url: `/one-to-many/network/${created.token}`,
      ownerToken: created.ownerToken,
      memberToken: created.memberToken,
      memberId: created.memberId,
      network: created.network,
    }, { status: 201, headers: responseHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "RELATIONSHIP_NETWORK_CREATE_IDEMPOTENCY_CONFLICT") {
      return NextResponse.json({
        error: "입력 내용이 바뀌었습니다. 다시 한 번 만들어 주세요.",
        code: "idempotency_conflict",
      }, { status: 409, headers: responseHeaders });
    }
    console.error("[woorigunghap:relationship-network-create]", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "인물 네트워크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, {
      status: 503,
      headers: responseHeaders,
    });
  }
}
