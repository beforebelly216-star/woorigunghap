import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { buildPaidReportFacts } from "@/lib/narrative/report-engine-v5";
import { verifyPaidPayment } from "@/lib/payments/verification";
import { parseOneToOneReportInput, validateOneToOneReportInput } from "@/lib/report-input";
import { isResultAccessToken } from "@/lib/result-access-token";
import {
  hasServerOrder,
  loadServerOrderForAccess,
  markServerOrderPaid,
  saveServerReportPrepared,
} from "@/lib/server-report-store";
import { POST as runOneToOneReport } from "../one-to-one/route";

export const runtime = "nodejs";
export const maxDuration = 300;

const TRANSIENT_CODES = new Set([
  "UNEXPECTED_SERVER_ERROR",
  "PORTONE_LOOKUP_FAILED",
  "REPORT_SEGMENT_NOT_READY",
]);

type ReportPayload = {
  error?: string;
  code?: string;
  reason?: string;
  retryable?: boolean;
  reportRuntimeVersion?: string;
};

type RequestPayload = {
  paymentId?: unknown;
  accessToken?: unknown;
  input?: unknown;
  phase?: unknown;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readPayload(response: Response) {
  return response.clone().json().catch(() => null) as Promise<ReportPayload | null>;
}

function shouldRecover(response: Response, payload: ReportPayload | null) {
  return response.status === 424
    || response.status === 503
    || (payload?.code ? TRANSIENT_CODES.has(payload.code) : false);
}

function terminalResponse(payload: ReportPayload | null) {
  return NextResponse.json({
    error: payload?.error ?? "결제는 보존되어 있지만 서버가 같은 상태 확인에 반복해서 실패했습니다. 잠시 후 같은 결제로 다시 시도해 주세요.",
    code: payload?.code ?? "REPORT_STATE_RETRY_EXHAUSTED",
    reason: payload?.reason ?? null,
    retryable: false,
    reportRuntimeVersion: payload?.reportRuntimeVersion ?? "paid-report-resilient-v2",
  }, { status: 422 });
}

async function recoverPreparedPhase(body: string) {
  let candidate: RequestPayload;
  try {
    candidate = JSON.parse(body) as RequestPayload;
  } catch {
    return null;
  }

  if (candidate.phase !== "prepare") return null;
  const paymentId = typeof candidate.paymentId === "string" ? candidate.paymentId : null;
  const accessToken = isResultAccessToken(candidate.accessToken) ? candidate.accessToken : null;
  const requestedInput = parseOneToOneReportInput(candidate.input);
  if (!paymentId || !accessToken || !requestedInput) return null;

  const requestedValidation = validateOneToOneReportInput(requestedInput);
  if (!requestedValidation.valid) return null;

  // This fallback is deliberately restricted to an existing server order whose
  // recovery token matches. It never converts a client-only payment claim into
  // a paid result and therefore cannot bypass the normal payment gate.
  const orderExists = await hasServerOrder(paymentId);
  if (!orderExists) return null;
  const storedOrder = await loadServerOrderForAccess(paymentId, accessToken, "oneToOne");
  if (!storedOrder || storedOrder.product !== "oneToOne") return null;
  const input = storedOrder.inputSnapshot;
  const validation = validateOneToOneReportInput(input);
  if (!validation.valid) return null;

  const payment = await verifyPaidPayment(paymentId, "oneToOne", input);
  await markServerOrderPaid(paymentId);

  const snapshot = calculateOneToOneCompatibility(input);
  const reportFacts = buildPaidReportFacts(input);

  // Prepared snapshot/facts are deterministic and can be recomputed. A transient
  // failure to persist this cache must not trap a paid customer at 0/3 forever.
  try {
    const persisted = await saveServerReportPrepared(paymentId, snapshot, reportFacts);
    if (!persisted) {
      console.warn("[woorigunghap:prepare-cache-not-persisted]", paymentId);
    }
  } catch (error) {
    console.warn("[woorigunghap:prepare-cache-save-error]", error);
  }

  return NextResponse.json({
    phase: "prepare",
    snapshot,
    reportFacts,
    reportRuntimeVersion: "paid-report-resilient-v2",
    payment: {
      verified: true,
      paymentId: payment.paymentId,
      product: payment.product,
      amount: payment.amount,
      inputBound: payment.inputBound,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const makeRequest = () => new NextRequest(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  });

  try {
    const first = await runOneToOneReport(makeRequest());
    const firstPayload = await readPayload(first);
    if (!shouldRecover(first, firstPayload)) return first;

    await wait(700);
    const second = await runOneToOneReport(makeRequest());
    const secondPayload = await readPayload(second);
    if (!shouldRecover(second, secondPayload)) return second;

    // The observed blocker is a paid result stuck at prepare/0-of-3. If the
    // ordinary route fails twice, rebuild the deterministic prepare payload from
    // the already-authorized server order instead of returning another endless
    // 503 to the browser.
    try {
      const recovered = await recoverPreparedPhase(body);
      if (recovered) return recovered;
    } catch (error) {
      console.error("[woorigunghap:paid-report-prepare-recovery-error]", error);
    }

    console.warn("[woorigunghap:paid-report-retry-exhausted]", JSON.stringify({
      status: second.status,
      code: secondPayload?.code ?? null,
      reason: secondPayload?.reason ?? null,
    }));
    return terminalResponse(secondPayload);
  } catch (error) {
    console.error("[woorigunghap:paid-report-resilient-error]", error);
    return NextResponse.json({
      error: "결제는 보존되어 있지만 서버 요청을 정상적으로 마무리하지 못했습니다. 같은 결제로 다시 시도할 수 있습니다.",
      code: "REPORT_STATE_RETRY_EXHAUSTED",
      retryable: false,
      reportRuntimeVersion: "paid-report-resilient-v2",
    }, { status: 422 });
  }
}
