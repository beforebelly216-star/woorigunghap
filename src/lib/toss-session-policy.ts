export const TOSS_SESSION_SECONDS = 60 * 60;

export function allowedTossOrigins(appName: string | undefined, allowLocal = false) {
  if (!appName || !/^[a-z][a-z0-9-]{0,63}$/.test(appName)) return [];
  return [
    `https://${appName}.apps.tossmini.com`,
    `https://${appName}.private-apps.tossmini.com`,
    ...(allowLocal ? ["http://127.0.0.1:5173"] : []),
  ];
}

export function isAllowedTossOrigin(origin: string | null) {
  return origin !== null && allowedTossOrigins(process.env.APPS_IN_TOSS_APP_NAME,
    process.env.NODE_ENV !== "production" && process.env.APPS_IN_TOSS_ALLOW_LOCAL_ORIGIN === "true").includes(origin);
}

export function parseTossBearer(header: string | null) {
  const match = header?.match(/^Bearer ([a-f0-9]{64})$/);
  return match?.[1] ?? null;
}

export function isTossBrowserApi(path: string) {
  return ["/api/auth/toss", "/api/auth/session", "/api/auth/logout", "/api/account/reports",
    "/api/free/soulmate", "/api/toss/iap/status", "/api/toss/wallet"].includes(path);
}

export function tossCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}
