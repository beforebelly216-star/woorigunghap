import { NextRequest, NextResponse } from "next/server";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";
import { getFullbuyStore } from "@/lib/fullbuy-store";

export const runtime = "nodejs";
const headers = { "cache-control":"private, no-store" };
export async function GET(request: NextRequest) {
  if (!isAllowedTossOrigin(request.headers.get("origin"))) return NextResponse.json({error:"invalid_origin"},{status:403,headers});
  const user = await loadAuthenticatedRequestUser(request).catch(()=>null);
  if (!user || user.provider!=="toss") return NextResponse.json({error:"login_required"},{status:401,headers});
  if (process.env.APPS_IN_TOSS_FULLBUY_ENABLED!=="true") return NextResponse.json({error:"fullbuy_not_configured"},{status:503,headers});
  try {
    const store = getFullbuyStore();
    await store.releaseStale(user.userId);
    return NextResponse.json(await store.wallet(user.userId),{headers});
  }
  catch { return NextResponse.json({error:"wallet_unavailable"},{status:503,headers}); }
}
