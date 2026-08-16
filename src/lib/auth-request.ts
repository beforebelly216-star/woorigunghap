import "server-only";

import type { NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-policy";
import { isAuthStoreConfigured, loadDatabaseSession } from "@/lib/auth-store";

export async function loadAuthenticatedRequestUser(request: NextRequest) {
  const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!sessionToken || !isAuthStoreConfigured()) return null;
  return loadDatabaseSession(sessionToken);
}
