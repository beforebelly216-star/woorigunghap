import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
  KAKAO_NOTIFY_INTENT_COOKIE,
  KAKAO_OAUTH_STATE_COOKIE,
  KAKAO_RETURN_TO_COOKIE,
  createOpaqueToken,
  normalizeReturnTo,
  opaqueTokensMatch,
} from "@/lib/auth-policy";
import { createDatabaseSession, upsertKakaoUser } from "@/lib/auth-store";
import {
  exchangeKakaoAuthorizationCode,
  getKakaoAuthConfig,
  retrieveKakaoIdentity,
} from "@/lib/kakao-auth";
import { saveKakaoTokenBundle } from "@/lib/kakao-token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearTransientCookies(response: NextResponse) {
  response.cookies.set(KAKAO_OAUTH_STATE_COOKIE, "", { maxAge: 0, path: "/api/auth/kakao" });
  response.cookies.set(KAKAO_RETURN_TO_COOKIE, "", { maxAge: 0, path: "/api/auth/kakao" });
  response.cookies.set(KAKAO_NOTIFY_INTENT_COOKIE, "", { maxAge: 0, path: "/api/auth/kakao" });
}

function failureResponse(request: NextRequest, reason: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url);
  clearTransientCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(KAKAO_OAUTH_STATE_COOKIE)?.value;
  if (!opaqueTokensMatch(state, expectedState)) {
    return failureResponse(request, "state");
  }

  const error = request.nextUrl.searchParams.get("error");
  if (error) return failureResponse(request, error === "access_denied" ? "cancelled" : "provider");

  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 1024) return failureResponse(request, "provider");

  const config = getKakaoAuthConfig();
  if (!config) return failureResponse(request, "config");
  const returnTo = normalizeReturnTo(request.cookies.get(KAKAO_RETURN_TO_COOKIE)?.value);
  const wantsMessageNotification = request.cookies.get(KAKAO_NOTIFY_INTENT_COOKIE)?.value === "1";

  let userId: string;
  let notificationEnrollment: "enabled" | "failed" | null = null;
  try {
    const tokenBundle = await exchangeKakaoAuthorizationCode(config, code);
    const identity = await retrieveKakaoIdentity(tokenBundle.accessToken);
    const user = await upsertKakaoUser(identity.providerUserId, identity.displayName);
    userId = user.userId;
    if (wantsMessageNotification) {
      const saved = await saveKakaoTokenBundle(userId, tokenBundle, true);
      notificationEnrollment = saved ? "enabled" : "failed";
    }
  } catch (authError) {
    console.error("[woorigunghap:kakao-auth]", authError instanceof Error ? authError.name : "unknown");
    return failureResponse(request, "callback");
  }

  const sessionToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000);
  try {
    await createDatabaseSession(userId, sessionToken, expiresAt);
  } catch {
    return failureResponse(request, "session");
  }

  const destination = new URL(returnTo, request.nextUrl.origin);
  destination.searchParams.set("login", "success");
  if (notificationEnrollment) destination.searchParams.set("notify", notificationEnrollment);
  const response = NextResponse.redirect(destination);
  clearTransientCookies(response);
  response.cookies.set(AUTH_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
  return response;
}
