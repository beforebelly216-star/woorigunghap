import { NextResponse } from "next/server";
import { calculateOneToManyCompatibility } from "@/lib/compatibility/one-to-many";
import { ONE_TO_MANY_DEMO_INPUT } from "@/lib/compatibility/one-to-many-demo";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    snapshot: calculateOneToManyCompatibility(ONE_TO_MANY_DEMO_INPUT),
    demo: true,
  });
}
