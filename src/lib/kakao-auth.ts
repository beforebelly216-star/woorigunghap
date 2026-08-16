import "server-only";

export const KAKAO_AUTHORIZE_ENDPOINT = "https://kauth.kakao.com/oauth/authorize";
export const KAKAO_TOKEN_ENDPOINT = "https://kauth.kakao.com/oauth/token";
export const KAKAO_USER_ENDPOINT = "https://kapi.kakao.com/v2/user/me";

export type KakaoAuthConfig = {
  restApiKey: string;
  clientSecret: string;
  redirectUri: string;
};

type KakaoTokenResponse = {
  access_token?: unknown;
  token_type?: unknown;
};

type KakaoUserResponse = {
  id?: unknown;
  kakao_account?: {
    profile?: {
      nickname?: unknown;
    };
  };
};

export class KakaoAuthError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "KakaoAuthError";
  }
}

export function getKakaoAuthConfig(): KakaoAuthConfig | null {
  const restApiKey = process.env.KAKAO_REST_API_KEY?.trim();
  const clientSecret = process.env.KAKAO_CLIENT_SECRET?.trim();
  const redirectUri = process.env.KAKAO_REDIRECT_URI?.trim();
  if (!restApiKey || !clientSecret || !redirectUri) return null;

  try {
    const url = new URL(redirectUri);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
  } catch {
    return null;
  }

  return { restApiKey, clientSecret, redirectUri };
}

export function buildKakaoAuthorizationUrl(config: KakaoAuthConfig, state: string) {
  const url = new URL(KAKAO_AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", config.restApiKey);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url;
}

export async function exchangeKakaoAuthorizationCode(
  config: KakaoAuthConfig,
  code: string,
) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.restApiKey,
    redirect_uri: config.redirectUri,
    code,
    client_secret: config.clientSecret,
  });
  const response = await fetch(KAKAO_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new KakaoAuthError("token_exchange_failed");

  const payload = await response.json().catch(() => null) as KakaoTokenResponse | null;
  if (
    typeof payload?.access_token !== "string"
    || payload.access_token.length < 16
    || payload.token_type !== "bearer"
  ) throw new KakaoAuthError("invalid_token_response");
  return payload.access_token;
}

export async function retrieveKakaoIdentity(accessToken: string) {
  const response = await fetch(KAKAO_USER_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new KakaoAuthError("user_lookup_failed");

  const payload = await response.json().catch(() => null) as KakaoUserResponse | null;
  const rawId = payload?.id;
  if (
    (typeof rawId !== "number" || !Number.isSafeInteger(rawId) || rawId <= 0)
    && (typeof rawId !== "string" || !/^\d{1,32}$/.test(rawId))
  ) throw new KakaoAuthError("invalid_user_response");

  const nickname = payload?.kakao_account?.profile?.nickname;
  return {
    providerUserId: String(rawId),
    displayName: typeof nickname === "string" && nickname.trim()
      ? nickname.trim().slice(0, 80)
      : null,
  };
}
