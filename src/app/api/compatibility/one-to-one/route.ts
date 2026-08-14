import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { generateDetailedPaidReportV6 } from "@/lib/narrative/report-engine-v6";
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
export const maxDuration = 300;
const REPORT_RUNTIME_VERSION = "paid-report-v6-plain-json-20260815";

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

function failureMessage(reason: string) {
  switch (reason) {
    case "API_AUTH": return "Claude API 인증 오류가 발생했어요.";
    case "API_BILLING": return "Claude API 사용 크레딧을 확인해야 해요.";
    case "API_PERMISSION": return "Claude 모델 사용 권한을 확인해야 해요.";
    case "API_RATE_LIMIT": return "Claude API 호출 한도에 잠시 걸렸어요.";
    case "API_OVERLOADED": return "Claude 서버가 일시적으로 혼잡해요.";
    case "API_TIMEOUT": return "Claude 장문 생성 응답 시간이 제한을 넘었어요.";
    case "AI_OUTPUT_TRUNCATED": return "Claude 응답이 길이 제한에서 잘렸어요.";
    case "AI_FORMAT": return "Claude 응답을 리포트 형식으로 변환하지 못했어요.";
    case "AI_MODE": return "AI 서술 모드 설정을 확인해야 해요.";
    case "API_KEY_MISSING": return "Claude API 키 설정을 확인해야 해요.";
    case "API_NETWORK": return "Claude API 연결 중 네트워크 오류가 발생했어요.";
    default: return "Claude 상세 해설 생성 과정에서 오류가 발생했어요.";
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

  const candidate = body as { paymentId?: unknown; input?: unknown };
  const paymentId = typeof candidate.paymentId === "string" ? candidate.paymentId : null;
  const input = parseInput(candidate.input);

  if (!paymentId || !input) {
    return NextResponse.json(
      { error: "결제번호 또는 궁합 계산 입력값이 올바르지 않습니다.", reportRuntimeVersion: REPORT_RUNTIME_VERSION },
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
    const payment = await verifyPaidPayment(paymentId, "oneToOne");
    const snapshot = calculateOneToOneCompatibility(input);
    const report = await generateDetailedPaidReportV6(snapshot, input);

    return NextResponse.json({
      snapshot,
      reportContent: report.content,
      reportFacts: report.facts,
      reportMeta: report.meta,
      reportRuntimeVersion: REPORT_RUNTIME_VERSION,
      payment: {
        verified: true,
        paymentId: payment.paymentId,
        product: payment.product,
        amount: payment.amount,
      },
    });
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, reportRuntimeVersion: REPORT_RUNTIME_VERSION },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "궁합 계산에 실패했습니다.";
    if (message.startsWith("DETAILED_REPORT_GENERATION_FAILED") || message.includes("ANTHROPIC")) {
      const reason = classifyReportFailure(message);
      return NextResponse.json(
        {
          error: failureMessage(reason),
          code: "REPORT_GENERATION_FAILED",
          reason,
          reportRuntimeVersion: REPORT_RUNTIME_VERSION,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "궁합 계산에 실패했습니다.", reportRuntimeVersion: REPORT_RUNTIME_VERSION }, { status: 500 });
  }
}
