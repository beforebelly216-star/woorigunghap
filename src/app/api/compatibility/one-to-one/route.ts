import { after, NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { buildPaidReportFacts } from "@/lib/narrative/report-engine-v5";
import {
  PAID_REPORT_SEGMENTS,
  generatePaidReportSegmentV7,
  type PaidReportSegmentContent,
  type PaidReportSegmentMeta,
  type PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import { personalizeNarrativeNames } from "@/lib/narrative/name-personalization";
import {
  PaymentVerificationError,
  verifyPaidPayment,
} from "@/lib/payments/verification";
import { createRecoveredOneToOneOrderDraft } from "@/lib/orders";
import {
  parseOneToOneReportInput,
  validateOneToOneReportInput,
  type OneToOneReportInput,
} from "@/lib/report-input";
import {
  claimReportSegmentGeneration,
  completeReportSegmentGeneration,
  reclaimCompletedReportSegmentGeneration,
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
export const maxDuration = 300;
const REPORT_RUNTIME_VERSION = "paid-report-v8-action-core-bounded-retry-20260828";
const PHASES = ["prepare", ...PAID_REPORT_SEGMENTS] as const;
type ReportPhase = (typeof PHASES)[number];

type NarrativeNames = { self: string; partner: string };
type SegmentPlan =
  | {
      kind: "ready";
      segment: PaidReportSegmentName;
      content: PaidReportSegmentContent;
      meta: PaidReportSegmentMeta;
    }
  | { kind: "claimed"; segment: PaidReportSegmentName }
  | { kind: "busy"; segment: PaidReportSegmentName };

type SegmentResult =
  | Extract<SegmentPlan, { kind: "ready" }>
  | { kind: "failed"; segment: PaidReportSegmentName };

function parsePhase(value: unknown): ReportPhase | null {
  return typeof value === "string" && PHASES.includes(value as ReportPhase)
    ? value as ReportPhase
    : null;
}

function classifyReportFailure(message: string) {
  if (message.includes("CREDIT_BALANCE_LOW")) return "API_BILLING";
  if (message.includes("HTTP_401")) return "API_AUTH";
  if (message.includes("HTTP_402")) return "API_BILLING";
  if (message.includes("HTTP_403")) return "API_PERMISSION";
  if (message.includes("HTTP_404")) return "API_MODEL";
  if (message.includes("HTTP_429")) return "API_RATE_LIMIT";
  if (message.includes("HTTP_529")) return "API_OVERLOADED";
  if (/HTTP_(408|409|500|502|503|504)/.test(message)) return "API_TRANSIENT";
  if (message.includes("HTTP_400") || message.includes("HTTP_413") || message.includes("HTTP_422")) return "API_REQUEST";
  if (message.includes("QUALITY_CRITICAL")) return "AI_QUALITY";
  if (message.includes("TIMEOUT")) return "API_TIMEOUT";
  if (message.includes("MAX_TOKENS")) return "AI_OUTPUT_TRUNCATED";
  if (message.includes("SCHEMA") || message.includes("INVALID_JSON")) return "AI_FORMAT";
  if (message.includes("STOP_REASON_REFUSAL")) return "AI_REFUSAL";
  if (message.includes("STOP_REASON_")) return "AI_STOPPED";
  if (message.includes("MODE_NOT_ANTHROPIC")) return "AI_MODE";
  if (message.includes("API_KEY_MISSING")) return "API_KEY_MISSING";
  if (message.includes("REQUEST_FAILED")) return "API_NETWORK";
  return "AI_GENERATION";
}

function retryableReportReason(reason: string) {
  return reason === "REPORT_GENERATION_IN_PROGRESS" || reason === "AI_FORMAT";
}

function failureMessage(reason: string) {
  switch (reason) {
    case "API_AUTH": return "Claude API 인증 설정을 확인해야 합니다. 추가 결제는 필요하지 않습니다.";
    case "API_BILLING": return "Claude API 사용 크레딧을 확인해야 합니다. 추가 결제는 필요하지 않습니다.";
    case "API_PERMISSION": return "Claude 모델 사용 권한을 확인해야 합니다. 추가 결제는 필요하지 않습니다.";
    case "API_MODEL": return "Claude 모델 설정을 확인해야 합니다. 추가 결제는 필요하지 않습니다.";
    case "API_REQUEST": return "Claude 요청 형식을 확정하지 못했습니다. 새로고침하면 같은 결제로 다시 시도할 수 있습니다.";
    case "AI_MODE": return "AI 서술 모드 설정을 확인해야 합니다. 추가 결제는 필요하지 않습니다.";
    case "API_KEY_MISSING": return "Claude API 키 설정을 확인해야 합니다. 추가 결제는 필요하지 않습니다.";
    case "API_RATE_LIMIT": return "Claude API 요청이 혼잡해 자동 대기를 중단했습니다. 잠시 후 새로고침하면 같은 결제로 다시 시도할 수 있습니다.";
    case "API_OVERLOADED": return "Claude API가 일시적으로 혼잡해 자동 대기를 중단했습니다. 잠시 후 새로고침하면 같은 결제로 다시 시도할 수 있습니다.";
    case "API_TRANSIENT": return "Claude API의 일시 오류가 반복되어 이번 생성을 중단했습니다. 잠시 후 같은 결제로 다시 시도할 수 있습니다.";
    case "API_TIMEOUT": return "AI 응답이 제한 시간 안에 끝나지 않아 자동 대기를 중단했습니다. 새로고침하면 같은 결제로 다시 시도할 수 있습니다.";
    case "API_NETWORK": return "AI 서버 연결이 반복해서 완료되지 않아 자동 대기를 중단했습니다. 잠시 후 새로고침해 주세요.";
    case "AI_OUTPUT_TRUNCATED": return "AI 응답이 끝까지 완성되지 않았습니다. 새로고침하면 같은 결제로 다시 시도할 수 있습니다.";
    case "AI_FORMAT": return "AI 응답을 완성된 리포트 형식으로 확정하지 못했습니다. 같은 결제로 다시 시도할 수 있습니다.";
    case "AI_QUALITY": return "AI 응답에 계산 근거와 맞지 않는 부분이 남아 자동 대기를 중단했습니다. 새로고침하면 같은 결제로 다시 시도할 수 있습니다.";
    case "AI_REFUSAL": return "AI가 이 요청의 서술 생성을 완료하지 않았습니다. 같은 결제로 다시 시도할 수 있습니다.";
    case "AI_STOPPED": return "AI 응답이 정상 종료되지 않아 이번 생성을 중단했습니다. 같은 결제로 다시 시도할 수 있습니다.";
    default: return "상세 해설 생성을 완료하지 못했습니다. 새로고침하면 같은 결제로 다시 시도할 수 있습니다.";
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

function readySegmentFromProgress(
  progress: ServerReportProgress | null,
  segment: PaidReportSegmentName,
  narrativeNames: NarrativeNames,
): Extract<SegmentPlan, { kind: "ready" }> | null {
  const storedSegment = progress?.segments[segment];
  const storedMeta = progress?.metas[segment];
  if (!storedSegment || !storedMeta) return null;
  return {
    kind: "ready",
    segment,
    content: personalizeNarrativeNames(storedSegment, narrativeNames),
    meta: storedMeta,
  };
}

async function planSegmentGeneration(
  paymentId: string,
  segment: PaidReportSegmentName,
  storedProgress: ServerReportProgress | null,
  narrativeNames: NarrativeNames,
): Promise<SegmentPlan> {
  const ready = readySegmentFromProgress(storedProgress, segment, narrativeNames);
  if (ready) return ready;

  const claimed = await claimReportSegmentGeneration(paymentId, segment);
  return claimed ? { kind: "claimed", segment } : { kind: "busy", segment };
}

async function reconcileBusySegment(
  paymentId: string,
  segment: PaidReportSegmentName,
  narrativeNames: NarrativeNames,
): Promise<SegmentPlan> {
  const latestProgress = await loadServerReportProgress(paymentId);
  const ready = readySegmentFromProgress(latestProgress, segment, narrativeNames);
  if (ready) return ready;

  const reclaimed = await reclaimCompletedReportSegmentGeneration(paymentId, segment);
  return reclaimed ? { kind: "claimed", segment } : { kind: "busy", segment };
}

async function runClaimedSegment(
  paymentId: string,
  plan: Extract<SegmentPlan, { kind: "claimed" }>,
  snapshot: ReturnType<typeof calculateOneToOneCompatibility>,
  input: OneToOneReportInput,
  narrativeNames: NarrativeNames,
  required: boolean,
): Promise<SegmentResult> {
  const segment = plan.segment;
  try {
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
    return {
      kind: "ready",
      segment,
      content: personalizedContent,
      meta: generated.meta,
    };
  } catch (error) {
    await releaseReportSegmentGeneration(paymentId, segment).catch(() => false);
    if (required) throw error;
    console.warn("[woorigunghap:background-segment-recovery]", JSON.stringify({
      paymentId,
      segment,
      reason: error instanceof Error ? error.message.slice(0, 160) : "UNKNOWN",
    }));
    return { kind: "failed", segment };
  }
}

async function releaseUnusedPlans(paymentId: string, plans: SegmentPlan[]) {
  await Promise.all(plans.map((plan) => plan.kind === "claimed"
    ? releaseReportSegmentGeneration(paymentId, plan.segment).catch(() => false)
    : Promise.resolve(false)));
}

function plannedSegmentsFor(requestedSegment: PaidReportSegmentName): PaidReportSegmentName[] {
  // Intro is deliberately isolated so the first visible progress cannot lose a
  // rate-limit race to two much larger requests. Once intro is complete, the
  // two long segments may overlap inside one Fluid Compute invocation.
  return requestedSegment === "dynamics" ? ["dynamics", "action"] : [requestedSegment];
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

    const requestedSegment = phase as PaidReportSegmentName;
    const plans: SegmentPlan[] = [];
    try {
      for (const segment of plannedSegmentsFor(requestedSegment)) {
        plans.push(await planSegmentGeneration(paymentId, segment, storedProgress, narrativeNames));
      }
    } catch (error) {
      await releaseUnusedPlans(paymentId, plans);
      throw error;
    }

    const requestedIndex = plans.findIndex((plan) => plan.segment === requestedSegment);
    if (requestedIndex < 0) {
      await releaseUnusedPlans(paymentId, plans);
      throw new Error("REQUESTED_SEGMENT_PLAN_MISSING");
    }

    if (plans[requestedIndex].kind === "busy") {
      plans[requestedIndex] = await reconcileBusySegment(paymentId, requestedSegment, narrativeNames);
    }
    const requestedPlan = plans[requestedIndex];

    if (requestedPlan.kind === "busy") {
      await releaseUnusedPlans(paymentId, plans);
      return NextResponse.json({
        error: "같은 해설 묶음을 이미 생성하고 있습니다. 저장된 결과를 다시 확인합니다.",
        code: "REPORT_GENERATION_IN_PROGRESS",
        retryable: retryableReportReason("REPORT_GENERATION_IN_PROGRESS"),
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      }, { status: 409 });
    }

    const executions = new Map<PaidReportSegmentName, Promise<SegmentResult>>();
    for (const plan of plans) {
      if (plan.kind === "ready") {
        executions.set(plan.segment, Promise.resolve(plan));
        continue;
      }
      if (plan.kind === "busy") {
        executions.set(plan.segment, Promise.resolve({ kind: "failed", segment: plan.segment }));
        continue;
      }
      executions.set(plan.segment, runClaimedSegment(
        paymentId,
        plan,
        snapshot,
        input,
        narrativeNames,
        plan.segment === requestedSegment,
      ));
    }

    const requestedExecution = executions.get(requestedSegment);
    if (!requestedExecution) {
      await releaseUnusedPlans(paymentId, plans);
      throw new Error("REQUESTED_SEGMENT_EXECUTION_MISSING");
    }

    const backgroundExecutions = [...executions.entries()]
      .filter(([segment]) => segment !== requestedSegment)
      .map(([, execution]) => execution);
    if (backgroundExecutions.length > 0) {
      after(async () => {
        await Promise.allSettled(backgroundExecutions);
      });
    }

    const requestedResult = await requestedExecution;
    if (requestedResult.kind !== "ready") {
      return NextResponse.json({
        error: "해설 묶음 저장 상태를 확정하지 못했습니다. 새로고침하면 같은 결제로 다시 시도할 수 있습니다.",
        code: "REPORT_SEGMENT_NOT_READY",
        retryable: false,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      }, { status: 422 });
    }

    return NextResponse.json({
      phase,
      segmentContent: requestedResult.content,
      segmentMeta: requestedResult.meta,
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
    if (error instanceof PaymentVerificationError) {
      const status = error.code === "PORTONE_LOOKUP_FAILED" ? 424 : error.status;
      return NextResponse.json(
        {
          error: error.code === "PORTONE_LOOKUP_FAILED"
            ? "결제 확인 서버 연결이 완료되지 않았습니다. 잠시 후 새로고침하면 추가 결제 없이 다시 시도할 수 있습니다."
            : error.message,
          code: error.code,
          retryable: false,
          reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        },
        { status },
      );
    }

    const message = error instanceof Error ? error.message : "궁합 계산에 실패했습니다.";
    if (message.startsWith("PAID_REPORT_SEGMENT_FAILED") || message.includes("ANTHROPIC")) {
      const reason = classifyReportFailure(message);
      console.warn("[woorigunghap:paid-report-stopped]", JSON.stringify({
        phase,
        reason,
        reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        detail: message.slice(0, 240),
      }));
      return NextResponse.json(
        {
          error: failureMessage(reason),
          code: "REPORT_GENERATION_STOPPED",
          reason,
          retryable: retryableReportReason(reason),
          reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        },
        { status: 422 },
      );
    }

    console.error("[woorigunghap:paid-report-unexpected]", error);
    return NextResponse.json({
      error: "상세 해설 생성 중 서버 상태를 확정하지 못했습니다. 새로고침하면 추가 결제 없이 다시 시도할 수 있습니다.",
      code: "UNEXPECTED_SERVER_ERROR",
      retryable: false,
      reportRuntimeVersion: REPORT_RUNTIME_VERSION,
    }, { status: 424 });
  }
}
