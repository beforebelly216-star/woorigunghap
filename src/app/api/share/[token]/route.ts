import { NextResponse } from "next/server";
import { isOpaqueToken } from "@/lib/auth-policy";
import { loadPublicShare } from "@/lib/share/public-share-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicHeaders = {
  "cache-control": "public, max-age=60, stale-while-revalidate=300",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isOpaqueToken(token)) {
    return NextResponse.json({ error: "공유 링크가 올바르지 않습니다." }, { status: 404, headers: publicHeaders });
  }

  try {
    const share = await loadPublicShare(token);
    if (!share) {
      return NextResponse.json({ error: "공유 결과를 찾지 못했습니다." }, { status: 404, headers: publicHeaders });
    }
    return NextResponse.json({ share }, { headers: publicHeaders });
  } catch (error) {
    console.error("[woorigunghap:public-share-read]", error);
    return NextResponse.json({ error: "공유 결과를 불러오지 못했습니다." }, { status: 503, headers: publicHeaders });
  }
}
