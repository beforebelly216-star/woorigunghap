export const RESULT_ACCESS_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function createResultAccessToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isResultAccessToken(value: unknown): value is string {
  return typeof value === "string" && RESULT_ACCESS_TOKEN_PATTERN.test(value);
}

export function buildOneToOneResultUrl(paymentId: string, accessToken?: string) {
  const query = new URLSearchParams({ paymentId });
  const fragment = accessToken && isResultAccessToken(accessToken)
    ? `#${new URLSearchParams({ accessToken }).toString()}`
    : "";
  return `/one-to-one/result?${query.toString()}${fragment}`;
}

