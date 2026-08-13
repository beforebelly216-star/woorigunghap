import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { generateCompatibilityNarrativeV4 } from "@/lib/narrative/report-engine-v4";
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
  ) return null;
  return candidate as PersonBirthInput;
}

function parseInput(value: unknown): OneToOneReportInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const relationshipType = candidate.relationshipType;
  if (
    typeof relationshipType !== "string" ||
    !RELATIONSHIP_TYPES.includes(relationshipType as OneToOneReportInput["relationshipType"])
  ) return null;
  const personA = parsePerson(candidate.personA);
  const personB = parsePerson(candidate.personB);
  if (!personA || !personB) return null;
  return {
    relationshipType: relationshipType as OneToOneReportInput["relationshipType"],
    personA,
    personB,
  };
}

type VerifyResponse = {
  verified?: boolean;
  paymentId?: string;
  product?: string;
  amount?: number;
  error?: string;
  code?: string;
};

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
    return NextResponse.json({ error: "결제번호 또는 궁합 계산 입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const validation = validateOneToOneReportInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "궁합 계산 입력값을 다시 확인해 주세요.", fieldErrors: validation.errors },
      { status: 400 },
    );
  }

  const verifyResponse = await fetch(`${request.nextUrl.origin}/api/payments/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paymentId }),
    cache: "no-store",
  });
  const verified = await verifyResponse.json().catch(() => ({})) as VerifyResponse;
  if (!verifyResponse.ok || !verified.verified) {
    return NextResponse.json(
      { error: verified.error ?? "결제 상태를 확인하지 못했습니다.", code: verified.code },
      { status: verifyResponse.status || 400 },
    );
  }
  if (verified.product !== "oneToOne" || verified.amount !== 1000) {
    return NextResponse.json({ error: "결제 상품 또는 금액이 1:1 리포트와 일치하지 않습니다." }, { status: 400 });
  }

  const snapshot = calculateOneToOneCompatibility(input);
  const narrative = await generateCompatibilityNarrativeV4(snapshot, input);
  return NextResponse.json({
    snapshot,
    narrative: narrative.narrative,
    narrativeMeta: narrative.meta,
    payment: {
      verified: true,
      paymentId: verified.paymentId,
      product: verified.product,
      amount: verified.amount,
    },
  });
}
