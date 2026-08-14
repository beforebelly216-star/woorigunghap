import { NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { generateDetailedPaidReportV6 } from "@/lib/narrative/report-engine-v6";
import type { OneToOneReportInput } from "@/lib/report-input";

export const runtime = "nodejs";
export const maxDuration = 300;

function safeReason(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  return message.replace(/[^A-Z0-9_\-]/gi, "_").slice(0, 220);
}

export async function GET() {
  const input: OneToOneReportInput = {
    relationshipType: "friend",
    personA: {
      displayName: "진단A",
      gender: "male",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTimeKnown: true,
      birthTime: "05:30",
      isLeapMonth: false,
    },
    personB: {
      displayName: "진단B",
      gender: "male",
      calendarType: "solar",
      birthDate: "1999-10-20",
      birthTimeKnown: true,
      birthTime: "10:25",
      isLeapMonth: false,
    },
  };

  const startedAt = Date.now();
  try {
    const snapshot = calculateOneToOneCompatibility(input);
    const report = await generateDetailedPaidReportV6(snapshot, input);
    return NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      score: snapshot.score,
      qualityCharacters: report.meta.qualityCharacters,
      qualityWarnings: report.meta.qualityWarnings,
      segmentAttempts: report.meta.segmentAttempts,
      usage: report.meta.usage,
      promptVersion: report.meta.promptVersion,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      elapsedMs: Date.now() - startedAt,
      reason: safeReason(error),
    }, { status: 500 });
  }
}
