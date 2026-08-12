import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import {
  RELATIONSHIP_TYPES,
  validateOneToOneReportInput,
  type OneToOneReportInput,
  type PersonBirthInput,
} from "@/lib/report-input";

export const runtime = "nodejs";

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

  const input = parseInput(body);
  if (!input) {
    return NextResponse.json({ error: "궁합 계산 입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const validation = validateOneToOneReportInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "궁합 계산 입력값을 다시 확인해 주세요.", fieldErrors: validation.errors },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ snapshot: calculateOneToOneCompatibility(input) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "궁합 계산에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
