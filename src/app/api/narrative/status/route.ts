import { NextResponse } from "next/server";
import { DEFAULT_REPORT_MODEL, REPORT_EVIDENCE_PACK_VERSION, REPORT_PROMPT_VERSION } from "@/lib/narrative/report-engine";

export const runtime = "nodejs";

export async function GET() {
  const configuredMode = process.env.REPORT_NARRATIVE_MODE === "anthropic" ? "anthropic" : "template";
  const model = process.env.ANTHROPIC_NARRATIVE_MODEL?.trim() || DEFAULT_REPORT_MODEL;

  return NextResponse.json({
    configuredMode,
    anthropicApiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    model,
    promptVersion: REPORT_PROMPT_VERSION,
    payloadVersion: REPORT_EVIDENCE_PACK_VERSION,
    note: "This endpoint never exposes secret values.",
  });
}
