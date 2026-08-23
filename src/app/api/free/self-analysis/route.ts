import { NextRequest, NextResponse } from "next/server";
import { buildFreeSelfAnalysis } from "@/lib/free-self-analysis";
import { parseFreeSelfPerson } from "@/lib/free-self-analysis-contract";
import { validateOneToOneReportInput } from "@/lib/report-input";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const person = body && typeof body === "object"
    ? parseFreeSelfPerson((body as { person?: unknown }).person)
    : null;

  if (!person) {
    return NextResponse.json({ error: "무료 자기 분석 입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const validation = validateOneToOneReportInput({
    relationshipType: "friend",
    personA: person,
    personB: person,
  });

  if (!validation.valid) {
    const errors = Object.fromEntries(
      Object.entries(validation.errors)
        .filter(([field]) => field.startsWith("personA."))
        .map(([field, message]) => [field.replace(/^personA\./, "self."), message]),
    );
    const firstError = Object.values(errors)[0] ?? "입력값을 다시 확인해 주세요.";
    return NextResponse.json({ error: firstError, errors }, { status: 400 });
  }

  try {
    const response = NextResponse.json({ analysis: buildFreeSelfAnalysis(person) });
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "무료 관계 성향 분석에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
