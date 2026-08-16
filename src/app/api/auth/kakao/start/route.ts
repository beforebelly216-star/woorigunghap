import { NextRequest, NextResponse } from "next/server";
import {
  KAKAO_OAUTH_STATE_COOKIE,
  KAKAO_RETURN_TO_COOKIE,
  OAUTH_STATE_MAX_AGE_SECONDS,
  createOpaqueToken,
  normalizeReturnTo,
} from "@/lib/auth-policy";
import { buildKakaoAuthorizationUrl, getKakaoAuthConfig } from "@/lib/kakao-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getKakaoAuthConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const state = createOpaqueToken();
  const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const response = NextResponse.redirect(buildKakaoAuthorizationUrl(config, state));
  const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/api/auth/kakao",
  };
  response.cookies.set(KAKAO_OAUTH_STATE_COOKIE, state, cookieBase);
  response.cookies.set(KAKAO_RETURN_TO_COOKIE, returnTo, cookieBase);
  return response;
}
