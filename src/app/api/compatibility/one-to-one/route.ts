import { after, NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { buildPaidReportFacts } from "@/lib/narrative/report-engine-v5";
import {
  PAID_REPORT_SEGMENTS,
  generatePaidReportSegmentV7,
  type PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import { personalizeNarrativeNames } from "@/lib/narrative/name-personalization";
import {
  PaymentVerificationError,
  verifyPaidPayment,
} from "@/lib/payments/verification";
import { createRecoveredOneToOneOrderDraft } from "@/lib/orders";
import { notifyReportCompleted } from "@/lib/report-completion-notification";
import {
  parseOneToOneReportInput,
  validateOneToOneReportInput,
  type OneToOneReportInput,
} from "@/lib/report-input";
import {
  claimReportSegmentGeneration,
  completeReportSegmentGeneration,
  releaseReportSegmentGeneration,
} from "@/lib/report-generation-lock";
import {
  hasServerOrder,
  isServerReportStoreConfigured,
  loadServerOrderForAccess,
  loadServerReportProgress,
  markServerOrderPaid,
  saveServerOrderDraft,
  saveServerReportPrepared,
  saveServerReportSegment,
  type ServerReportProgress,
} from "@/lib/server-report-store";
import { isResultAccessToken } from "@/lib/result-access-token";

export const runtime = "nodejs";
export const maxDuration = 240;
const REPORT_RUNTIME_VERSION = "paid-report-v7-editorial-server-store-20260818-name-personalization";
const PHASES = ["prepare", ...PAID_REPORT_SEGMENTS] as const;
type ReportPhase = (typeof PHASES)[number];

function parsePhase(value: unknown): ReportPhase | null {
  return typeof value === "string" && PHASES.includes(value as ReportPhase)
    ? value as ReportPhase
    : null;
}

function classifyReportFailure(message: string) {
  if (message.includes("HTTP_401")) return "API_AUTH";
  if (message.includes("HTTP_402")) return "API_BILLING";
  if (message.includes("HTTP_403")) return "API_PERMISSION";
  if (message.includes("HTTP_429")) return "API_RATE_LIMIT";
  if (message.includes("HTTP_529")) return "API_OVERLOADED";
  if (message.includes("TIMEOUT")) return "API_TIMEOUT";
  if (message.includes("MAX_TOKENS")) return "AI_OUTPUT_TRUNCATED";
  if (message.includes("SCHEMA") || message.includes("INVALID_JSON")) return "AI_FORMAT";
  if (message.includes("MODE_NOT_ANTHROPIC")) return "AI_MODE";
  if (message.includes("API_KEY_MISSING")) return "API_KEY_MISSING";
  if (message.includes("REQUEST_FAILED")) return "API_NETWORK";
  return "AI_GENERATION";
}

function retryableReportReason(reason: string) {
  return [
    "API_RATE_LIMIT",
    "API_OVERLOADED",
    "API_TIMEOUT",
    "AI_OUTPUT_TRUNCATED",
    "AI_FORMAT",
    "API_NETWORK",
    "AI_GENERATION",
  ].includes(reason);
}

function failureMessage(reason: string) {
  switch (reason) {
    case "API_AUTH": return "Claude API 인증 설정을 확인해야 합니다.";
    case "API_BILLING": return "Claude API 사용 크레딧을 확인해야 합니다.";
    case "API_PERMISSION": return "Claude 모델 사용 권한을 확인해야 합니다.";
    case "AI_MODE": return "AI 서술 모드 설정을 확인해야 합니다.";
    case "API_KEY_MISSING": return "Claude API 키 설정을 확인해야 합니다.";
    default: return "상세 해설 생성 요청을 다시 시도할 수 있습니다.";
  }
}

async function readOrCreateServerProgress(
  paymentId: string,
  input: OneToOneReportInput,
  accessToken: string,
  orderExists: boolean,
): Promise<ServerReportProgress | null> {
  if (!isServerReportStoreConfigured()) return null;
  try {
    if (!orderExists) {
      const persisted = await saveServerOrderDraft(createRecoveredOneToOneOrderDraft(input, paymentId, accessToken));
      if (!persisted) throw new Error("SERVER_ORDER_RECOVERY_FAILED");
    }
    await markServerOrderPaid(paymentId);
    return await loadServerReportProgress(paymentId);
  } catch (error) {
    console.error("[woorigunghap:server-report-store-read]", error);
    if (!orderExists) throw error;
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 요청 형식이 올바르지 않습니다.", reportRuntimeVersion: REPORT_RUNTIME_VERSION }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "궁합 계산 요청 형식이 올바르지 않습니다.", reportRuntimeVersion: REPORT_RUNTIME_VERSION }, { status: 400 });
  }

  const candidate = body as {
    paymentId?: unknown;
    accessToken?: unknown;
    input?: unknown;
    phase?: unknown;
  };
  const paymentId = typeof candidate.paymentId === "string" ? candidate.paymentId : null;
  const accessToken = isResultAccessToken(candidate.accessToken) ? candidate.accessToken : null;
  const requestedInput = parseOneToOneReportInput(candidate.input);
  const phase = parsePhase(candidate.phase);

  if (!paymentId || !accessToken || !requestedInput || !phase) {
    return NextResponse.json(
      {
        error: "결제번호, 궁합 입력값 또는 생성 단계가 올바르지 않습니다. 페이지를 새로고침해 주세요.",
        code: "REPORT_PHASE_REQUIRED",
        retryable: false,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      },
      { status: 400 },
    );
  }

  const requestedValidation = validateOneToOneReportInput(requestedInput);
  if (!requestedValidation.valid) {
    return NextResponse.json(
      { error: "궁합 계산 입력값을 다시 확인해 주세요.", fieldErrors: requestedValidation.errors, reportRuntimeVersion: REPORT_RUNTIME_VERSION },
      { status: 400 },
    );
  }

  let claimedSegment: PaidReportSegmentName | null = null;
  try {
    const orderExists = isServerReportStoreConfigured() ? await hasServerOrder(paymentId) : false;
    const storedOrder = orderExists
      ? await loadServerOrderForAccess(paymentId, accessToken, "oneToOne")
      : null;

    if (orderExists && (!storedOrder || storedOrder.product !== "oneToOne")) {
      return NextResponse.json({
        error: "이 주문의 결과 복구키가 일치하지 않습니다.",
        code: "RESULT_ACCESS_DENIED",
        retryable: false,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      }, { status: 403 });
    }

    const input = storedOrder?.product === "oneToOne" ? storedOrder.inputSnapshot : requestedInput;
    const validation = validateOneToOneReportInput(input);
    if (!validation.valid) {
      return NextResponse.json({
        error: "저장된 궁합 입력값을 확인할 수 없습니다.",
        code: "STORED_INPUT_INVALID",
        retryable: false,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      }, { status: 409 });
    }
    const narrativeNames = {
      self: input.personA.displayName,
      partner: input.personB.displayName,
    };

    const payment = await verifyPaidPayment(paymentId, "oneToOne", input);
    if (!orderExists && !payment.inputBound) {
      throw new PaymentVerificationError(
        "결제 당시 입력정보를 검증할 수 없는 주문입니다.",
        409,
        "PAYMENT_INPUT_BINDING_REQUIRED",
      );
    }

    const storedProgress = await readOrCreateServerProgress(paymentId, input, accessToken, orderExists);
    const snapshot = storedProgress?.snapshot ?? calculateOneToOneCompatibility(input);
    const reportFacts = storedProgress?.facts ?? buildPaidReportFacts(input);

    if (phase === "prepare") {
      if (!storedProgress?.snapshot || !storedProgress.facts) {
        const persisted = await saveServerReportPrepared(paymentId, snapshot, reportFacts);
        if (!persisted) throw new Error("SERVER_REPORT_PREPARE_SAVE_FAILED");
      }
      return NextResponse.json({
        phase,
        snapshot,
        reportFacts,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        payment: {
          verified: true,
          paymentId: payment.paymentId,
          product: payment.product,
          amount: payment.amount,
          inputBound: payment.inputBound,
        },
      });
    }

    const segment = phase as PaidReportSegmentName;
    const storedSegment = storedProgress?.segments[segment];
    const storedMeta = storedProgress?.metas[segment];
    if (storedSegment && storedMeta) {
      return NextResponse.json({
        phase,
        segmentContent: personalizeNarrativeNames(storedSegment, narrativeNames),
        segmentMeta: storedMeta,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        payment: {
          verified: true,
          paymentId: payment.paymentId,
          product: payment.product,
          amount: payment.amount,
          inputBound: payment.inputBound,
        },
      });
    }

    if (!await claimReportSegmentGeneration(paymentId, segment)) {
      return NextResponse.json({
        error: "같은 해설 묶음을 이미 생성하고 있습니다. 잠시 후 저장된 결과를 다시 확인합니다.",
        code: "REPORT_GENERATION_IN_PROGRESS",
        retryable: true,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      }, { status: 409 });
    }
    claimedSegment = segment;

    const generated = await generatePaidReportSegmentV7(snapshot, input, segment);
    const personalizedContent = personalizeNarrativeNames(generated.content, narrativeNames);
    const persisted = await saveServerReportSegment(
      paymentId,
      segment,
      personalizedContent,
      generated.meta,
    );
    if (!persisted) throw new Error("SERVER_REPORT_SEGMENT_SAVE_FAILED");
    await completeReportSegmentGeneration(paymentId, segment);
    claimedSegment = null;
    if (segment === "action") after(() => notifyReportCompleted(paymentId));

    return NextResponse.json({
      phase,
      segmentContent: personalizedContent,
      segmentMeta: generated.meta,
      reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      payment: {
        verified: true,
        paymentId: payment.paymentId,
        product: payment.product,
        amount: payment.amount,
        inputBound: payment.inputBound,
      },
    });
  } catch (error) {
    if (claimedSegment) {
      await releaseReportSegmentGeneration(paymentId, claimedSegment).catch(() => false);
    }

    if (error instanceof PaymentVerificationError) {
      const retryable = error.code === "PORTONE_LOOKUP_FAILED" || error.code === "PAYMENT_NOT_PAID";
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable,
          reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "궁합 계산에 실패했습니다.";
    if (message.startsWith("PAID_REPORT_SEGMENT_FAILED") || message.includes("ANTHROPIC")) {
      const reason = classifyReportFailure(message);
      return NextResponse.json(
        {
          error: failureMessage(reason),
          code: "REPORT_GENERATION_RETRY",
          reason,
          retryable: retryableReportReason(reason),
          reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        },
        { status: retryableReportReason(reason) ? 503 : 500 },
      );
    }

    console.error("[woorigunghap:paid-report-unexpected]", error);
    return NextResponse.json({
      error: "일시적인 서버 오류로 상세 해설 생성을 다시 시도합니다.",
      code: "UNEXPECTED_SERVER_ERROR",
      retryable: true,
      reportRuntimeVersion: REPORT_RUNTIME_VERSION,
    }, { status: 503 });
  }
}
