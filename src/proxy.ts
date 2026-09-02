import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-policy";

const PUBLIC_PAGES = new Set(["/", "/login", "/terms", "/privacy", "/refund", "/operating-policy"]);

function isPublicRequest(pathname: string) {
  return PUBLIC_PAGES.has(pathname)
    || pathname.endsWith("/opengraph-image")
    || pathname.startsWith("/api/auth/")
    || pathname === "/api/manse/health"
    || pathname.startsWith("/api/webhooks/")
    || pathname.startsWith("/api/cron/");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublicRequest(pathname) || request.cookies.has(AUTH_SESSION_COOKIE)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "카카오 로그인이 필요해." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|jootopi/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
