import { NextResponse } from "next/server";
import { calculateOneToManyCompatibility } from "@/lib/compatibility/one-to-many";
import type { OneToManyReportInput } from "@/lib/report-input";

export const runtime = "nodejs";

const DEMO_INPUT: OneToManyReportInput = {
  relationshipType: "lover",
  referencePerson: {
    displayName: "기준자",
    gender: "male",
    calendarType: "solar",
    birthDate: "1990-05-15",
    birthTimeKnown: true,
    birthTime: "14:30",
    isLeapMonth: false,
  },
  candidates: [
    {
      displayName: "후보 1",
      gender: "female",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTimeKnown: true,
      birthTime: "05:30",
      isLeapMonth: false,
    },
    {
      displayName: "후보 2",
      gender: "female",
      calendarType: "solar",
      birthDate: "1991-08-11",
      birthTimeKnown: true,
      birthTime: "11:20",
      isLeapMonth: false,
    },
  ],
};

export async function GET() {
  return NextResponse.json({
    snapshot: calculateOneToManyCompatibility(DEMO_INPUT),
    demo: true,
  });
}
