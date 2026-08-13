import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { generateCompatibilityNarrativeV4 } from "@/lib/narrative/report-engine-v4";
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
export const maxDuration = 120;

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
    const narrative = await generateCompatibilityNarrativeV4(snapshot, input);

    return NextResponse.json({
      snapshot,
      narrative: narrative.narrative,
      narrativeMeta: narrative.meta,
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
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
