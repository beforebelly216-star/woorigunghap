"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatus } from "@/components/auth-status";

export function SiteHeader() {
  const pathname = usePathname();

  if (
    pathname === "/free"
    || pathname === "/free/result"
    || pathname === "/one-to-one"
    || pathname === "/one-to-one/result"
    || pathname === "/one-to-many"
    || pathname.startsWith("/one-to-many/result")
    || pathname.startsWith("/share/")
  ) return null;

  if (pathname === "/") {
    return <header className="site-header site-header-home-a99">
      <Link href="/" className="site-brand">우리사주</Link>
      <AuthStatus />
    </header>;
  }

  return <header className="site-header">
    <Link href="/" className="site-brand">우리사주</Link>
    <AuthStatus />
  </header>;
}
