import { NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import type { OneToOneReportInput } from "@/lib/report-input";

export const runtime = "nodejs";

const DEMO_INPUT: OneToOneReportInput = {
  relationshipType: "lover",
  personA: {
    displayName: "나",
    gender: "male",
    calendarType: "solar",
    birthDate: "1990-05-15",
    birthTimeKnown: true,
    birthTime: "14:30",
    isLeapMonth: false,
  },
  personB: {
    displayName: "상대",
    gender: "female",
    calendarType: "solar",
    birthDate: "1992-10-24",
    birthTimeKnown: true,
    birthTime: "05:30",
    isLeapMonth: false,
  },
};

export async function GET() {
  return NextResponse.json({
    snapshot: calculateOneToOneCompatibility(DEMO_INPUT),
    demo: true,
  });
}
