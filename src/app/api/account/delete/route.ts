import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, isSameOriginPost } from "@/lib/auth-policy";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { deleteAccountAndScrubReports } from "@/lib/account-report-store";
import { unlinkKakaoUserByAdminKey } from "@/lib/kakao-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "허용되지 않은 탈퇴 요청입니다." }, { status: 403 });
  }
  const user = await loadAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { confirmation?: unknown } | null;
  if (payload?.confirmation !== "탈퇴") {
    return NextResponse.json({ error: "확인 문구가 일치하지 않습니다." }, { status: 400 });
  }

  try {
    const deleted = await deleteAccountAndScrubReports(user.userId);
    if (!deleted) return NextResponse.json({ error: "계정을 찾지 못했습니다." }, { status: 404 });

    const kakaoUnlinked = await unlinkKakaoUserByAdminKey(deleted.providerUserId).catch(() => false);
    const response = NextResponse.json({ ok: true, kakaoUnlinked }, {
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
    response.cookies.set(AUTH_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "탈퇴 처리 중 문제가 발생했습니다." }, { status: 500 });
  }
}
