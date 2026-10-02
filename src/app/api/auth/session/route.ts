import { NextRequest, NextResponse } from "next/server";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function GET(request: NextRequest) {
  try {
    const user = await loadAuthenticatedRequestUser(request);
    if (!user) return NextResponse.json({ authenticated: false }, { headers: privateHeaders });
    return NextResponse.json({
      authenticated: true,
      user: { displayName: user.displayName ?? "우리사주 사용자" },
    }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers: privateHeaders });
  }
}
