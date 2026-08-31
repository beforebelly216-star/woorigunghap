import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredRelationshipNetworkData } from "@/lib/relationship-network-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401,
      headers: { "cache-control": "no-store" },
    });
  }

  const purged = await purgeExpiredRelationshipNetworkData();
  if (!purged) {
    return NextResponse.json({ error: "Store is not configured" }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }

  return NextResponse.json({ ok: true }, {
    headers: { "cache-control": "no-store" },
  });
}
