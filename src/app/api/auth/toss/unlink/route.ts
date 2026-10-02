import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revokeTossUserSessions } from "@/lib/auth-store";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };

async function handle(request: NextRequest) {
  const expected = process.env.APPS_IN_TOSS_UNLINK_AUTHORIZATION;
  if (!expected) return NextResponse.json({ error: "callback_not_configured" }, { status: 503, headers });
  const candidate = request.headers.get("authorization") ?? "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(candidate), digest(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const input = request.method === "GET" ? Object.fromEntries(request.nextUrl.searchParams)
    : await request.json().catch(() => null);
  const userKey = input?.userKey;
  const numericKey = typeof userKey === "string" && /^[1-9]\d{0,15}$/.test(userKey) ? Number(userKey) : userKey;
  if (!Number.isSafeInteger(numericKey) || numericKey <= 0 || !["UNLINK", "WITHDRAWAL_TERMS"].includes(input?.referrer)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }
  try {
    await revokeTossUserSessions(String(numericKey));
    // Provider disconnect revokes access; account/paid-result deletion is a separate explicit flow.
    return NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ error: "session_revocation_failed" }, { status: 503, headers }); }
}

export const GET = handle;
export const POST = handle;
