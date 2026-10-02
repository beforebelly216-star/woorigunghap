import { NextResponse, type NextRequest } from "next/server";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { isAllowedTossOrigin, isTossBrowserApi, tossCorsHeaders } from "@/lib/toss-session-policy";

const PUBLIC_PAGES = new Set(["/", "/login", "/terms", "/privacy", "/refund", "/operating-policy"]);

function isPublicRequest(pathname: string) {
  return PUBLIC_PAGES.has(pathname)
    || pathname.endsWith("/opengraph-image")
    || pathname.startsWith("/api/auth/")
    || pathname === "/api/manse/health"
    || pathname.startsWith("/api/webhooks/")
    || pathname.startsWith("/api/cron/");
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const origin = request.headers.get("origin");
  const tossBrowser = isTossBrowserApi(pathname) && isAllowedTossOrigin(origin);
  const decorate = (response: NextResponse) => {
    if (tossBrowser) {
      for (const [key, value] of Object.entries(tossCorsHeaders(origin!))) response.headers.set(key, value);
    }
    return response;
  };
  if (request.method === "OPTIONS" && isTossBrowserApi(pathname)) {
    return tossBrowser ? decorate(new NextResponse(null, { status: 204 }))
      : new NextResponse(null, { status: 403 });
  }
  if (isPublicRequest(pathname)) {
    return decorate(NextResponse.next());
  }

  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (user) return decorate(NextResponse.next());

  if (pathname.startsWith("/api/")) {
    return decorate(NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }));
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|jootopi/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
