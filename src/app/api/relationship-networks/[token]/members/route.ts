import { NextRequest, NextResponse } from "next/server";
import { hashOpaqueToken, isOpaqueToken, isSameOriginPost } from "@/lib/auth-policy";
import {
  consumeRelationshipNetworkRateLimit,
  isRelationshipNetworkStoreConfigured,
  joinRelationshipNetwork,
} from "@/lib/relationship-network-store";
import {
  parsePersonBirthInput,
  validatePersonBirthInput,
} from "@/lib/report-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token) || !isSameOriginPost(request)) {
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
      `join:${hashOpaqueToken(token)}:${clientAddress(request)}`,
      12,
      10 * 60,
    );
    if (!allowed) {
      return NextResponse.json({ error: "참여 요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: responseHeaders });
    }
    const body = await request.json().catch(() => null) as {
      person?: unknown;
      consent?: unknown;
      idempotencyKey?: unknown;
      memberToken?: unknown;
    } | null;
    const person = parsePersonBirthInput(body?.person);
    if (
      !person
      || body?.consent !== true
      || typeof body.idempotencyKey !== "string"
      || !isOpaqueToken(body.memberToken)
    ) {
      return NextResponse.json({ error: "입력 정보와 공개 동의를 다시 확인해 주세요." }, { status: 400, headers: responseHeaders });
    }
    const fieldErrors = validatePersonBirthInput(person, "person");
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: "입력 정보를 다시 확인해 주세요.", fieldErrors }, { status: 400, headers: responseHeaders });
    }

    const result = await joinRelationshipNetwork({
      token,
      person,
      idempotencyKey: body.idempotencyKey,
      memberToken: body.memberToken,
    });
    if (result.kind !== "success") {
      const response = {
        missing: { status: 404, error: "네트워크를 찾을 수 없습니다." },
        closed: { status: 409, error: "방장이 지금은 새 참여를 닫아두었습니다." },
        full: { status: 409, error: "이 네트워크의 참여 인원이 가득 찼습니다." },
        duplicate: { status: 409, error: "같은 별칭이 이미 있습니다. 다른 별칭을 사용해 주세요." },
        idempotency_conflict: { status: 409, error: "참여 요청이 겹쳤습니다. 다시 시도해 주세요." },
        version_expired: { status: 409, error: "계산 기준이 갱신되었습니다. 새 인연 네트워크를 만들어 주세요." },
      }[result.kind];
      return NextResponse.json({ error: response.error, code: result.kind }, { status: response.status, headers: responseHeaders });
    }
    return NextResponse.json({
      memberToken: result.memberToken,
      memberId: result.memberId,
      network: result.network,
    }, { status: 201, headers: responseHeaders });
  } catch (error) {
    console.error("[woorigunghap:relationship-network-join]", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "궁합 관계를 계산하지 못했습니다. 같은 정보로 다시 시도해 주세요." }, {
      status: 503,
      headers: responseHeaders,
    });
  }
}
