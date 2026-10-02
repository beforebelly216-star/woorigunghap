import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, isSameOriginPost } from "@/lib/auth-policy";
import { revokeDatabaseSession } from "@/lib/auth-store";
import { requestSessionToken } from "@/lib/auth-request";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request) && !isAllowedTossOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "허용되지 않은 로그아웃 요청입니다." }, { status: 403 });
  }
  const token = requestSessionToken(request);
  try { if (token) await revokeDatabaseSession(token); }
  catch { return NextResponse.json({ error: "로그아웃을 완료하지 못했습니다." }, { status: 503 }); }

  const response = NextResponse.json({ ok: true }, {
    headers: { "cache-control": "private, no-store, max-age=0" },
  });
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
