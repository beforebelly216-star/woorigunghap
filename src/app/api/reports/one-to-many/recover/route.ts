import { NextRequest, NextResponse } from "next/server";
import { isResultAccessToken } from "@/lib/result-access-token";
import { isServerReportStoreConfigured, loadOneToManyReportForAccess } from "@/lib/server-report-store";

export const runtime = "nodejs";
const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "복구 요청 형식이 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }
  const candidate = body && typeof body === "object" && !Array.isArray(body)
    ? body as { paymentId?: unknown; accessToken?: unknown }
    : null;
  const paymentId = typeof candidate?.paymentId === "string" ? candidate.paymentId : null;
  const accessToken = isResultAccessToken(candidate?.accessToken) ? candidate.accessToken : null;
  if (!paymentId || !accessToken) {
    return NextResponse.json({ error: "복구 링크가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }
  if (!isServerReportStoreConfigured()) {
    return NextResponse.json({ error: "결과 저장소를 확인할 수 없습니다." }, { status: 503, headers: privateHeaders });
  }
  try {
    const recovered = await loadOneToManyReportForAccess(paymentId, accessToken);
    if (!recovered) {
      return NextResponse.json({ error: "복구할 수 있는 1:다 결과를 찾지 못했습니다." }, { status: 404, headers: privateHeaders });
    }
    return NextResponse.json(recovered, { headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:one-to-many-recovery]", error);
    return NextResponse.json({ error: "결과 복구 중 서버 오류가 발생했습니다." }, { status: 503, headers: privateHeaders });
  }
}
