import { NextRequest, NextResponse } from "next/server";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";
import { getFullbuyStore } from "@/lib/fullbuy-store";
import { isTossAuthConfigured } from "@/lib/toss-auth";

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
    const sku = process.env.APPS_IN_TOSS_ONE_TO_ONE_SKU?.trim();
    const amount = Number(process.env.APPS_IN_TOSS_FULLBUY_SKU_AMOUNT);
    const purchase = process.env.APPS_IN_TOSS_IAP_GRANT_ENABLED === "true" && isTossAuthConfigured() && sku &&
      Number.isSafeInteger(amount) && amount >= 3 && amount <= 3000 && amount % 3 === 0 ? { sku, amount } : null;
    return NextResponse.json({ ...await store.wallet(user.userId), purchase },{headers});
  }
  catch { return NextResponse.json({error:"wallet_unavailable"},{status:503,headers}); }
}
