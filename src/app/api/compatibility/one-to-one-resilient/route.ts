import { NextRequest, NextResponse } from "next/server";
import { POST as runOneToOneReport } from "../one-to-one/route";

export const runtime = "nodejs";
export const maxDuration = 300;

const TRANSIENT_CODES = new Set([
  "UNEXPECTED_SERVER_ERROR",
  "PORTONE_LOOKUP_FAILED",
  "REPORT_SEGMENT_NOT_READY",
]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readPayload(response: Response) {
  return response.clone().json().catch(() => null) as Promise<{
    error?: string;
    code?: string;
    reason?: string;
    retryable?: boolean;
    reportRuntimeVersion?: string;
  } | null>;
}

function shouldRecover(response: Response, payload: Awaited<ReturnType<typeof readPayload>>) {
  return response.status === 424
    || response.status === 503
    || (payload?.code ? TRANSIENT_CODES.has(payload.code) : false);
}

function retryResponse(payload: Awaited<ReturnType<typeof readPayload>>) {
  return NextResponse.json({
    error: "결제는 정상 확인됐어요. 결과 저장 상태를 다시 확인하면서 자동으로 이어서 생성하고 있습니다.",
    code: payload?.code ?? "REPORT_STATE_TRANSIENT",
    reason: payload?.reason ?? null,
    retryable: true,
    reportRuntimeVersion: payload?.reportRuntimeVersion ?? "paid-report-resilient-v1",
  }, { status: 503 });
}

export async function POST(request: NextRequest) {
  const firstRequest = request.clone();
  try {
    const first = await runOneToOneReport(firstRequest);
    const firstPayload = await readPayload(first);
    if (!shouldRecover(first, firstPayload)) return first;

    // Payment completion and Neon/PortOne state propagation can race by a fraction
    // of a second. One immediate server-side retry removes that gap without asking
    // the customer to refresh or pay again.
    await wait(700);
    const second = await runOneToOneReport(request);
    const secondPayload = await readPayload(second);
    if (!shouldRecover(second, secondPayload)) return second;

    console.warn("[woorigunghap:paid-report-resilient-wait]", JSON.stringify({
      status: second.status,
      code: secondPayload?.code ?? null,
      reason: secondPayload?.reason ?? null,
    }));
    return retryResponse(secondPayload);
  } catch (error) {
    console.error("[woorigunghap:paid-report-resilient-error]", error);
    return NextResponse.json({
      error: "결제는 정상 확인됐어요. 서버 연결을 다시 확인하면서 자동으로 이어서 생성하고 있습니다.",
      code: "REPORT_STATE_TRANSIENT",
      retryable: true,
      reportRuntimeVersion: "paid-report-resilient-v1",
    }, { status: 503 });
  }
}
