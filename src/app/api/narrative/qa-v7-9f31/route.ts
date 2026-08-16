import { NextRequest, NextResponse } from "next/server";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import {
  PAID_REPORT_SEGMENTS,
  generatePaidReportSegmentV7,
  type PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import type { OneToOneReportInput } from "@/lib/report-input";

export const runtime = "nodejs";
export const maxDuration = 240;

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

function safeReason(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  return message.replace(/[^A-Z0-9_\-]/gi, "_").slice(0, 240);
}

export async function GET(request: NextRequest) {
  const segment = request.nextUrl.searchParams.get("segment") as PaidReportSegmentName | null;
  if (!segment || !PAID_REPORT_SEGMENTS.includes(segment)) {
    return NextResponse.json({ ok: false, reason: "SEGMENT_REQUIRED" }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const snapshot = calculateOneToOneCompatibility(input);
    const generated = await generatePaidReportSegmentV7(snapshot, input, segment);
    return NextResponse.json({
      ok: true,
      segment,
      elapsedMs: Date.now() - startedAt,
      qualityCharacters: generated.meta.qualityCharacters,
      qualityWarnings: generated.meta.qualityWarnings,
      attempt: generated.meta.attempt,
      usage: generated.meta.usage,
      promptVersion: generated.meta.promptVersion,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      segment,
      elapsedMs: Date.now() - startedAt,
      reason: safeReason(error),
    }, { status: 500 });
  }
}
