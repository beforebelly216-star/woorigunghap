import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_SESSION_MAX_AGE_SECONDS, createOpaqueToken, isSameOriginPost } from "@/lib/auth-policy";
import { createDatabaseSession, isAuthStoreConfigured, upsertProviderUser } from "@/lib/auth-store";
import { isTossAuthConfigured, retrieveTossIdentity } from "@/lib/toss-auth";
import { parseTossLoginInput } from "@/lib/toss-login-protocol";

export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store", "referrer-policy": "no-referrer" };

async function readLoginInput(request: NextRequest) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return parseTossLoginInput(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch { return null; }
  finally { reader.releaseLock(); }
}

// Same-origin preparation endpoint. Cross-origin miniapp transport is a separate rollout.
export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
  if (!isAuthStoreConfigured() || !isTossAuthConfigured()) {
    return NextResponse.json({ error: "toss_login_not_configured" }, { status: 503, headers });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }
  const input = await readLoginInput(request);
  if (!input) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  try {
    const identity = await retrieveTossIdentity(input);
    const user = await upsertProviderUser("toss", identity.providerUserId, identity.displayName);
    const sessionToken = createOpaqueToken();
    const expires = new Date(Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000);
    await createDatabaseSession(user.userId, sessionToken, expires);
    const response = NextResponse.json({ authenticated: true }, { headers });
    response.cookies.set(AUTH_SESSION_COOKIE, sessionToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/", expires, maxAge: AUTH_SESSION_MAX_AGE_SECONDS, priority: "high",
    });
    return response;
  } catch {
    // Do not log authorization codes, provider tokens, PII, or raw provider errors.
    return NextResponse.json({ error: "toss_login_failed" }, { status: 502, headers });
  }
}
