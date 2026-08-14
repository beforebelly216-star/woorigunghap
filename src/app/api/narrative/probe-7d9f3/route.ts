import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

function classify(status: number, body: unknown) {
  const raw = JSON.stringify(body ?? {}).toLowerCase();
  if (status === 401 || raw.includes("authentication") || raw.includes("api key")) return "AUTH";
  if (status === 429 || raw.includes("rate limit")) return "RATE_LIMIT";
  if (raw.includes("credit balance") || raw.includes("billing") || raw.includes("payment")) return "BILLING_CREDIT";
  if (raw.includes("model") && (raw.includes("not found") || raw.includes("access") || raw.includes("permission"))) return "MODEL_ACCESS";
  if (raw.includes("output_config") || raw.includes("json_schema") || raw.includes("schema")) return "STRUCTURED_OUTPUT";
  if (status >= 500) return "ANTHROPIC_SERVER";
  return `HTTP_${status}`;
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_NARRATIVE_MODEL || "claude-haiku-4-5-20251001";
  if (!apiKey) return NextResponse.json({ ok: false, category: "API_KEY_MISSING", model }, { status: 500 });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 32,
        messages: [{ role: "user", content: "Return a short Korean confirmation." }],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: { ok: { type: "boolean" } },
              required: ["ok"],
            },
          },
        },
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json({ ok: false, status: response.status, category: classify(response.status, body), model });
    }
    const usage = body && typeof body === "object" && !Array.isArray(body) ? (body as { usage?: unknown }).usage ?? null : null;
    return NextResponse.json({ ok: true, status: response.status, category: "OK", model, usage });
  } catch (error) {
    return NextResponse.json({ ok: false, category: error instanceof Error && error.name === "AbortError" ? "TIMEOUT" : "NETWORK", model }, { status: 500 });
  }
}
