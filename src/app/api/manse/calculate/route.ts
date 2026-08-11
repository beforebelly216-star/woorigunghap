import { NextRequest, NextResponse } from "next/server";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import type { PersonBirthInput } from "@/lib/report-input";

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

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const person = body && typeof body === "object"
    ? parsePerson((body as { person?: unknown }).person)
    : null;

  if (!person) {
    return NextResponse.json({ error: "만세력 계산 입력값이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    return NextResponse.json({ snapshot: calculateManseSnapshot(person) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "만세력 계산에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
