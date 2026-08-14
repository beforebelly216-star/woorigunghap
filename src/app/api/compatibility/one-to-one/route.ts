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
  if (message.includes("TIMEOUT")) return "API_TIMEOUT";
  if (message.includes("SCHEMA") || message.includes("INVALID_JSON")) return "AI_FORMAT";
  if (message.includes("MODE_NOT_ANTHROPIC")) return "AI_MODE";
  if (message.includes("API_KEY_MISSING")) return "API_KEY_MISSING";
  if (message.includes("REQUEST_FAILED")) return "API_NETWORK";
  return "AI_GENERATION";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "궁합 계산 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const candidate = body as { paymentId?: unknown; input?: unknown };
  const paymentId = typeof candidate.paymentId === "string" ? candidate.paymentId : null;
  const input = parseInput(candidate.input);

  if (!paymentId || !input) {
    return NextResponse.json(
      { error: "결제번호 또는 궁합 계산 입력값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const validation = validateOneToOneReportInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "궁합 계산 입력값을 다시 확인해 주세요.", fieldErrors: validation.errors },
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
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "궁합 계산에 실패했습니다.";
    if (message.startsWith("DETAILED_REPORT_GENERATION_FAILED") || message.includes("ANTHROPIC")) {
      return NextResponse.json(
        {
          error: "상세 리포트 생성이 지연되고 있어요. 결제는 유지되며 같은 결과 화면에서 다시 시도할 수 있습니다.",
          code: "REPORT_GENERATION_FAILED",
          reason: classifyReportFailure(message),
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "궁합 계산에 실패했습니다." }, { status: 500 });
  }
}
