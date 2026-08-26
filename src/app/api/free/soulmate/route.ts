import { NextResponse } from "next/server";
import { parseSoulmatePerson } from "@/lib/soulmate-input-contract";
import { calculateSoulmateResult } from "@/lib/soulmate-result";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { person?: unknown } | null;
    const person = parseSoulmatePerson(body?.person);
    if (!person) {
      return NextResponse.json({ error: "입력 정보를 다시 확인해 주세요." }, { status: 400 });
    }

    return NextResponse.json(calculateSoulmateResult(person), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "천생연분 결과를 계산하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
