import { NextResponse } from "next/server";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";

export const runtime = "nodejs";

const EXPECTED = {
  year: "임신",
  month: "경술",
  day: "계유",
  hour: "을묘",
} as const;

export async function GET() {
  try {
    const snapshot = calculateManseSnapshot({
      displayName: "health-check",
      gender: "male",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTimeKnown: true,
      birthTime: "05:30",
      isLeapMonth: false,
    });

    const actual = {
      year: snapshot.pillars.year?.korean ?? null,
      month: snapshot.pillars.month?.korean ?? null,
      day: snapshot.pillars.day.korean,
      hour: snapshot.pillars.hour?.korean ?? null,
    };
    const ok = Object.entries(EXPECTED).every(
      ([key, value]) => actual[key as keyof typeof actual] === value,
    );

    return NextResponse.json(
      {
        ok,
        engineVersion: snapshot.engineVersion,
        policyVersion: snapshot.policyVersion,
        actual,
        expected: EXPECTED,
      },
      { status: ok ? 200 : 500 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "manse health check failed",
      },
      { status: 500 },
    );
  }
}
