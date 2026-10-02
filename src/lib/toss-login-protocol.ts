export type TossLoginInput = { authorizationCode: string; referrer: "DEFAULT" | "SANDBOX" };
export type TossTransport = (path: string, body?: TossLoginInput, accessToken?: string) => Promise<unknown>;

export function parseTossLoginInput(value: unknown): TossLoginInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.authorizationCode !== "string" || !input.authorizationCode.trim()
    || input.authorizationCode.length > 4096 || /[\u0000-\u001f\u007f]/.test(input.authorizationCode)
    || (input.referrer !== "DEFAULT" && input.referrer !== "SANDBOX")) return null;
  // Never accept a userKey supplied by the browser as proof of identity.
  return { authorizationCode: input.authorizationCode, referrer: input.referrer };
}

function success(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("toss_invalid_response");
  const response = value as Record<string, unknown>;
  if (response.resultType !== "SUCCESS" || !response.success || typeof response.success !== "object") {
    throw new Error("toss_request_failed");
  }
  return response.success as Record<string, unknown>;
}

export async function verifyTossIdentity(input: TossLoginInput, transport: TossTransport) {
  const token = success(await transport("/api-partner/v1/apps-in-toss/user/oauth2/generate-token", input));
  if (typeof token.accessToken !== "string" || !token.accessToken || token.accessToken.length > 16384
    || /[\u0000-\u0020\u007f]/.test(token.accessToken)) throw new Error("toss_invalid_token");
  const identity = success(await transport("/api-partner/v1/apps-in-toss/user/oauth2/login-me", undefined, token.accessToken));
  if (!Number.isSafeInteger(identity.userKey) || (identity.userKey as number) <= 0) {
    throw new Error("toss_invalid_identity");
  }
  // Personal information is encrypted by Toss. Do not store it or request extra scopes.
  return { providerUserId: String(identity.userKey), displayName: null };
}
