import { NextRequest, NextResponse } from "next/server";
import { isSameOriginPost } from "@/lib/auth-policy";
import { parseGrowthAnalyticsEvent } from "@/lib/growth-analytics-contract";
import { recordGrowthEvent } from "@/lib/growth-analytics-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: privateHeaders });
  }

  const event = parseGrowthAnalyticsEvent(await request.json().catch(() => null));
  if (!event) {
    return NextResponse.json({ error: "이벤트 정보가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }

  try {
    const stored = await recordGrowthEvent(event);
    return new NextResponse(null, { status: stored ? 204 : 202, headers: privateHeaders });
  } catch (error) {
    console.error("[woorisaju:growth-analytics]", error);
    return new NextResponse(null, { status: 202, headers: privateHeaders });
  }
}
