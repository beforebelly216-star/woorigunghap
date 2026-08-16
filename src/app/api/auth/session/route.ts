import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-policy";
import { isAuthStoreConfigured, loadDatabaseSession } from "@/lib/auth-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!token || !isAuthStoreConfigured()) {
    return NextResponse.json({ authenticated: false }, { headers: privateHeaders });
  }
  try {
    const user = await loadDatabaseSession(token);
    if (!user) return NextResponse.json({ authenticated: false }, { headers: privateHeaders });
    return NextResponse.json({
      authenticated: true,
      user: { displayName: user.displayName ?? "카카오 사용자" },
    }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers: privateHeaders });
  }
}
