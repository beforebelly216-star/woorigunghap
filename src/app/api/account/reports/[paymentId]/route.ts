import { NextRequest, NextResponse } from "next/server";
import {
  deleteOwnedAccountReport,
  loadOwnedAccountReport,
  loadResumableOwnedOneToOneReport,
} from "@/lib/account-report-store";
import { isSameOriginPost } from "@/lib/auth-policy";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: privateHeaders });
  }
  const { paymentId } = await params;
  if (!paymentId || paymentId.length > 160) {
    return NextResponse.json({ error: "결과 식별자가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }
  try {
    const report = await loadOwnedAccountReport(user.userId, paymentId);
    if (report) return NextResponse.json(report, { headers: privateHeaders });

    const resumable = await loadResumableOwnedOneToOneReport(user.userId, paymentId);
    if (resumable) return NextResponse.json(resumable, { headers: privateHeaders });

    return NextResponse.json({ error: "보관함에서 결과를 찾지 못했습니다." }, { status: 404, headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:account-report-detail]", error);
    return NextResponse.json({ error: "보관함 결과를 불러오지 못했습니다." }, { status: 503, headers: privateHeaders });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: privateHeaders });
  }
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: privateHeaders });
  }
  const { paymentId } = await params;
  if (!paymentId || paymentId.length > 160) {
    return NextResponse.json({ error: "결과 식별자가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }
  try {
    const completed = await loadOwnedAccountReport(user.userId, paymentId);
    if (!completed) {
      return NextResponse.json({ error: "완성된 보관함 결과를 찾지 못했습니다." }, { status: 404, headers: privateHeaders });
    }
    const deleted = await deleteOwnedAccountReport(user.userId, paymentId);
    if (!deleted) {
      return NextResponse.json({ error: "삭제할 보관함 결과를 찾지 못했습니다." }, { status: 404, headers: privateHeaders });
    }
    return NextResponse.json({ deleted: true }, { headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:account-report-delete]", error);
    return NextResponse.json({ error: "보관함 결과를 삭제하지 못했습니다." }, { status: 503, headers: privateHeaders });
  }
}
