import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { generatePaidReportSegmentV7, type PaidReportSegmentName } from "@/lib/narrative/report-engine-v7-segments";
import { PaymentVerificationError, verifyPaidPayment } from "@/lib/payments/verification";
import {
  RELATIONSHIP_TYPES,
  validateOneToOneReportInput,
  type OneToOneReportInput,
  type PersonBirthInput,
} from "@/lib/report-input";

export const runtime = "nodejs";
export const maxDuration = 150;
const RUNTIME_VERSION = "paid-report-v7-resumable-20260816";
const SEGMENTS: PaidReportSegmentName[] = ["intro", "dynamics", "action"];

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
  ) return null;
  return candidate as PersonBirthInput;
}

function parseInput(value: unknown): OneToOneReportInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.relationshipType !== "string" || !RELATIONSHIP_TYPES.includes(candidate.relationshipType as OneToOneReportInput["relationshipType"])) return null;
  const personA = parsePerson(candidate.personA);
  const personB = parsePerson(candidate.personB);
  if (!personA || !personB) return null;
  return { relationshipType: candidate.relationshipType as OneToOneReportInput["relationshipType"], personA, personB };
}

function classify(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message.includes("HTTP_401")) return { reason: "API_AUTH", retryable: false };
  if (message.includes("HTTP_402")) return { reason: "API_BILLING", retryable: false };
  if (message.includes("HTTP_403")) return { reason: "API_PERMISSION", retryable: false };
  if (message.includes("API_KEY_MISSING")) return { reason: "API_KEY_MISSING", retryable: false };
  if (message.includes("MODE_NOT_ANTHROPIC")) return { reason: "AI_MODE", retryable: false };
  if (message.includes("HTTP_429")) return { reason: "API_RATE_LIMIT", retryable: true };
  if (message.includes("HTTP_529")) return { reason: "API_OVERLOADED", retryable: true };
  if (message.includes("TIMEOUT")) return { reason: "API_TIMEOUT", retryable: true };
  if (message.includes("TRUNCATED")) return { reason: "AI_OUTPUT_TRUNCATED", retryable: true };
  if (message.includes("FORMAT") || message.includes("SCHEMA")) return { reason: "AI_FORMAT", retryable: true };
  if (message.includes("EMPTY")) return { reason: "AI_EMPTY", retryable: true };
  return { reason: "API_NETWORK", retryable: true };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "요청 형식이 올바르지 않습니다.", retryable: false, runtimeVersion: RUNTIME_VERSION }, { status: 400 }); }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다.", retryable: false, runtimeVersion: RUNTIME_VERSION }, { status: 400 });
  }
  const candidate = body as { paymentId?: unknown; input?: unknown; segment?: unknown };
  const paymentId = typeof candidate.paymentId === "string" ? candidate.paymentId : null;
  const input = parseInput(candidate.input);
  const segment = typeof candidate.segment === "string" && SEGMENTS.includes(candidate.segment as PaidReportSegmentName)
    ? candidate.segment as PaidReportSegmentName
    : null;
  if (!paymentId || !input || !segment) {
    return NextResponse.json({ error: "결제번호, 입력값 또는 리포트 구간이 올바르지 않습니다.", retryable: false, runtimeVersion: RUNTIME_VERSION }, { status: 400 });
  }
  const validation = validateOneToOneReportInput(input);
  if (!validation.valid) {
    return NextResponse.json({ error: "궁합 계산 입력값을 다시 확인해 주세요.", fieldErrors: validation.errors, retryable: false, runtimeVersion: RUNTIME_VERSION }, { status: 400 });
  }

  try {
    const payment = await verifyPaidPayment(paymentId, "oneToOne");
    const snapshot = calculateOneToOneCompatibility(input);
    const generated = await generatePaidReportSegmentV7(snapshot, input, segment);
    return NextResponse.json({
      ok: true,
      segment,
      segmentContent: generated.content,
      segmentMeta: generated.meta,
      reportFacts: generated.facts,
      snapshot,
      payment: { verified: true, paymentId: payment.paymentId, product: payment.product, amount: payment.amount },
      runtimeVersion: RUNTIME_VERSION,
    });
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json({ error: error.message, code: error.code, retryable: false, runtimeVersion: RUNTIME_VERSION }, { status: error.status });
    }
    const failure = classify(error);
    console.warn("[woorigunghap:v7-segment-failed]", JSON.stringify({ segment, ...failure, message: error instanceof Error ? error.message : "UNKNOWN" }));
    return NextResponse.json({
      error: failure.retryable ? "해설을 계속 작성하고 있습니다." : "해설 생성 설정을 확인해야 합니다.",
      ...failure,
      runtimeVersion: RUNTIME_VERSION,
    }, { status: failure.retryable ? 503 : 500 });
  }
}
