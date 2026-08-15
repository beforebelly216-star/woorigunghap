import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { buildPaidReportFacts } from "@/lib/narrative/report-engine-v5";
import {
  PAID_REPORT_SEGMENTS,
  generatePaidReportSegmentV7,
  type PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import {
  PaymentVerificationError,
  verifyPaidPayment,
} from "@/lib/payments/verification";
import {
  RELATIONSHIP_TYPES,
  validateOneToOneReportInput,
  type OneToOneReportInput,
  type PersonBirthInput,
} from "@/lib/report-input";

export const runtime = "nodejs";
export const maxDuration = 240;
const REPORT_RUNTIME_VERSION = "paid-report-v7-resumable-20260815";
const PHASES = ["prepare", ...PAID_REPORT_SEGMENTS] as const;
type ReportPhase = (typeof PHASES)[number];

function parsePerson(value: unknown): PersonBirthInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.displayName !== "string" ||
    (candidate.gender !== "male" && candidate.gender !== "female") ||
    (candidate.calendarType !== "solar" && candidate.calendarType !== "lunar") ||
    typeof candidate.birthDate !== "string" ||
    typeof candidate.birthTimeKnown !== "boolean" ||
    !(typeof candidate.birthTime === "string" || candidate.birthTime === null) ||
    typeof candidate.isLeapMonth !== "boolean"
  ) {
    return null;
  }

  return candidate as PersonBirthInput;
}

function parseInput(value: unknown): OneToOneReportInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const relationshipType = candidate.relationshipType;

  if (
    typeof relationshipType !== "string" ||
    !RELATIONSHIP_TYPES.includes(relationshipType as OneToOneReportInput["relationshipType"])
  ) {
    return null;
  }

  const personA = parsePerson(candidate.personA);
  const personB = parsePerson(candidate.personB);
  if (!personA || !personB) return null;

  return {
    relationshipType: relationshipType as OneToOneReportInput["relationshipType"],
    personA,
    personB,
  };
}

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

  const candidate = body as { paymentId?: unknown; input?: unknown; phase?: unknown };
  const paymentId = typeof candidate.paymentId === "string" ? candidate.paymentId : null;
  const input = parseInput(candidate.input);
  const phase = parsePhase(candidate.phase);

  if (!paymentId || !input || !phase) {
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

  const validation = validateOneToOneReportInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "궁합 계산 입력값을 다시 확인해 주세요.", fieldErrors: validation.errors, reportRuntimeVersion: REPORT_RUNTIME_VERSION },
      { status: 400 },
    );
  }

  try {
    const payment = await verifyPaidPayment(paymentId, "oneToOne", input);
    const snapshot = calculateOneToOneCompatibility(input);

    if (phase === "prepare") {
      return NextResponse.json({
        phase,
        snapshot,
        reportFacts: buildPaidReportFacts(input),
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

    const generated = await generatePaidReportSegmentV7(snapshot, input, phase as PaidReportSegmentName);
    return NextResponse.json({
      phase,
      segmentContent: generated.content,
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

    return NextResponse.json({
      error: "궁합 계산에 실패했습니다.",
      code: "UNEXPECTED_SERVER_ERROR",
      retryable: false,
      reportRuntimeVersion: REPORT_RUNTIME_VERSION,
    }, { status: 500 });
  }
}
