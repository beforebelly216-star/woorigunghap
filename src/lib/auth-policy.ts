import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const AUTH_SESSION_COOKIE = "woori_auth_session";
export const KAKAO_OAUTH_STATE_COOKIE = "woori_kakao_state";
export const KAKAO_RETURN_TO_COOKIE = "woori_kakao_return_to";
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;
export const AUTH_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const OPAQUE_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function createOpaqueToken() {
  return randomBytes(32).toString("hex");
}

export function isOpaqueToken(value: unknown): value is string {
  return typeof value === "string" && OPAQUE_TOKEN_PATTERN.test(value);
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function opaqueTokensMatch(left: unknown, right: unknown) {
  if (!isOpaqueToken(left) || !isOpaqueToken(right)) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function normalizeReturnTo(value: unknown) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 512
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(value)
  ) return "/";

  try {
    const parsed = new URL(value, "https://woorigunghap.invalid");
    if (parsed.origin !== "https://woorigunghap.invalid") return "/";
    if (parsed.pathname === "/login" || parsed.pathname.startsWith("/api/auth/")) return "/";
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}

export function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
