import "server-only";

export const KAKAO_AUTHORIZE_ENDPOINT = "https://kauth.kakao.com/oauth/authorize";
export const KAKAO_TOKEN_ENDPOINT = "https://kauth.kakao.com/oauth/token";
export const KAKAO_USER_ENDPOINT = "https://kapi.kakao.com/v2/user/me";
export const KAKAO_UNLINK_ENDPOINT = "https://kapi.kakao.com/v1/user/unlink";
export const KAKAO_MEMO_ENDPOINT = "https://kapi.kakao.com/v2/api/talk/memo/default/send";

export type KakaoAuthConfig = {
  restApiKey: string;
  clientSecret: string;
  redirectUri: string;
};

export type KakaoTokenBundle = {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string | null;
  refreshTokenExpiresInSeconds: number | null;
  scopes: string[];
};

type KakaoTokenResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  refresh_token_expires_in?: unknown;
  scope?: unknown;
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

export function buildKakaoAuthorizationUrl(
  config: KakaoAuthConfig,
  state: string,
  scopes: string[] = [],
) {
  const url = new URL(KAKAO_AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", config.restApiKey);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (scopes.length > 0) url.searchParams.set("scope", scopes.join(","));
  return url;
}

function parseTokenBundle(payload: KakaoTokenResponse | null): KakaoTokenBundle {
  if (
    typeof payload?.access_token !== "string"
    || payload.access_token.length < 16
    || payload.token_type !== "bearer"
    || typeof payload.expires_in !== "number"
    || !Number.isFinite(payload.expires_in)
    || payload.expires_in <= 0
  ) throw new KakaoAuthError("invalid_token_response");

  return {
    accessToken: payload.access_token,
    expiresInSeconds: Math.floor(payload.expires_in),
    refreshToken: typeof payload.refresh_token === "string" && payload.refresh_token.length >= 16
      ? payload.refresh_token
      : null,
    refreshTokenExpiresInSeconds:
      typeof payload.refresh_token_expires_in === "number"
      && Number.isFinite(payload.refresh_token_expires_in)
      && payload.refresh_token_expires_in > 0
        ? Math.floor(payload.refresh_token_expires_in)
        : null,
    scopes: typeof payload.scope === "string"
      ? payload.scope.split(/\s+/).map((scope) => scope.trim()).filter(Boolean)
      : [],
  };
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
  return parseTokenBundle(payload);
}

export async function refreshKakaoAccessToken(config: KakaoAuthConfig, refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.restApiKey,
    refresh_token: refreshToken,
    client_secret: config.clientSecret,
  });
  const response = await fetch(KAKAO_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new KakaoAuthError("token_refresh_failed");
  const payload = await response.json().catch(() => null) as KakaoTokenResponse | null;
  return parseTokenBundle(payload);
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

export async function sendKakaoMemo(
  accessToken: string,
  text: string,
  webUrl: string,
) {
  const templateObject = {
    object_type: "text",
    text: text.slice(0, 200),
    link: { web_url: webUrl, mobile_web_url: webUrl },
    button_title: "결과 확인하기",
  };
  const body = new URLSearchParams({ template_object: JSON.stringify(templateObject) });
  const response = await fetch(KAKAO_MEMO_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new KakaoAuthError("memo_send_failed");
  return true;
}

export async function unlinkKakaoUserByAdminKey(providerUserId: string) {
  const adminKey = process.env.KAKAO_ADMIN_KEY?.trim();
  if (!adminKey || !/^\d{1,32}$/.test(providerUserId)) return false;
  const body = new URLSearchParams({ target_id_type: "user_id", target_id: providerUserId });
  const response = await fetch(KAKAO_UNLINK_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `KakaoAK ${adminKey}`,
      "content-type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
    cache: "no-store",
  });
  return response.ok;
}
