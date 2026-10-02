import "server-only";

import type { NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-policy";
import { isAuthStoreConfigured, loadDatabaseSession } from "@/lib/auth-store";
import { isAllowedTossOrigin, parseTossBearer } from "@/lib/toss-session-policy";

export function requestSessionToken(request: NextRequest) {
  if (isAllowedTossOrigin(request.headers.get("origin"))) {
    return parseTossBearer(request.headers.get("authorization"));
  }
  // Cookie sessions remain the authentication mechanism for the existing web app.
  return request.cookies.get(AUTH_SESSION_COOKIE)?.value ?? null;
}

export async function loadAuthenticatedRequestUser(request: NextRequest) {
  const sessionToken = requestSessionToken(request);
  if (!sessionToken || !isAuthStoreConfigured()) return null;
  const user = await loadDatabaseSession(sessionToken);
  if (isAllowedTossOrigin(request.headers.get("origin")) && user?.provider !== "toss") return null;
  return user;
}
