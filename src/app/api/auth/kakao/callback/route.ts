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
  KakaoAuthError,
  exchangeKakaoAuthorizationCode,
  getKakaoAuthConfig,
  retrieveKakaoIdentity,
  sendKakaoMemo,
  type KakaoTokenBundle,
} from "@/lib/kakao-auth";
import {
  isKakaoMessageEnabled,
  saveKakaoTokenBundle,
  setKakaoMessageEnabled,
} from "@/lib/kakao-token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NotificationResult = "enabled" | "scope" | "setup" | "send_failed";

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

function notificationReturnResponse(request: NextRequest, returnTo: string, result: NotificationResult) {
  const destination = new URL(returnTo, request.nextUrl.origin);
  destination.searchParams.set("notify", result);
  const response = NextResponse.redirect(destination);
  clearTransientCookies(response);
  return response;
}

function notificationDestinationUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return new URL("/account/reports", url.origin).toString();
  } catch {
    return null;
  }
}

function notificationFailureResult(error: unknown): NotificationResult {
  if (error instanceof KakaoAuthError && error.code === "memo_scope_required") return "scope";
  return "send_failed";
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(KAKAO_OAUTH_STATE_COOKIE)?.value;
  if (!opaqueTokensMatch(state, expectedState)) {
    return failureResponse(request, "state");
  }

  const returnTo = normalizeReturnTo(request.cookies.get(KAKAO_RETURN_TO_COOKIE)?.value);
  const wantsMessageNotification = request.cookies.get(KAKAO_NOTIFY_INTENT_COOKIE)?.value === "1";
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    if (wantsMessageNotification && error === "access_denied") {
      return notificationReturnResponse(request, returnTo, "scope");
    }
    return failureResponse(request, error === "access_denied" ? "cancelled" : "provider");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 1024) return failureResponse(request, "provider");

  const config = getKakaoAuthConfig();
  if (!config) return failureResponse(request, "config");

  let userId: string;
  let tokenBundle: KakaoTokenBundle;
  try {
    tokenBundle = await exchangeKakaoAuthorizationCode(config, code);
    const identity = await retrieveKakaoIdentity(tokenBundle.accessToken);
    const user = await upsertKakaoUser(identity.providerUserId, identity.displayName);
    userId = user.userId;
  } catch (authError) {
    console.error("[woorigunghap:kakao-auth]", authError instanceof Error ? authError.name : "unknown");
    return failureResponse(request, "callback");
  }

  let notificationResult: NotificationResult | null = null;
  if (wantsMessageNotification) {
    try {
      const saved = await saveKakaoTokenBundle(userId, tokenBundle);
      if (!saved) {
        notificationResult = "setup";
      } else if (!await isKakaoMessageEnabled(userId)) {
        notificationResult = "scope";
      } else {
        const destinationUrl = notificationDestinationUrl();
        if (!destinationUrl) {
          await setKakaoMessageEnabled(userId, false);
          notificationResult = "setup";
        } else {
          try {
            await sendKakaoMemo(
              tokenBundle.accessToken,
              "우리궁합 완료 알림 연결이 확인됐어요. 결과 생성이 끝나면 이 채팅으로 알려드릴게요.",
              destinationUrl,
            );
            notificationResult = "enabled";
          } catch (sendError) {
            await setKakaoMessageEnabled(userId, false).catch(() => false);
            notificationResult = notificationFailureResult(sendError);
            console.warn("[woorigunghap:kakao-notify-test-send]", JSON.stringify({
              result: notificationResult,
              reason: sendError instanceof KakaoAuthError ? sendError.code : "unknown",
            }));
          }
        }
      }
    } catch (notificationError) {
      console.error(
        "[woorigunghap:kakao-notify-enable]",
        notificationError instanceof Error ? notificationError.name : "unknown",
      );
      await setKakaoMessageEnabled(userId, false).catch(() => false);
      notificationResult = "setup";
    }
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
  if (notificationResult) destination.searchParams.set("notify", notificationResult);
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
