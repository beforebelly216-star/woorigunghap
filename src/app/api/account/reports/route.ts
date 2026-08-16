import { NextRequest, NextResponse } from "next/server";
import { listAccountReports } from "@/lib/account-report-store";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function GET(request: NextRequest) {
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ authenticated: false, reports: [] }, { status: 401, headers: privateHeaders });
  }
  try {
    const reports = await listAccountReports(user.userId);
    return NextResponse.json({ authenticated: true, reports }, { headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:account-report-list]", error);
    return NextResponse.json({ error: "보관함을 불러오지 못했습니다." }, { status: 503, headers: privateHeaders });
  }
}
