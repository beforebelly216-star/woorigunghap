"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatus } from "@/components/auth-status";

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname === "/") {
    return <header className="site-header site-header-home-a99">
      <Link href="/" className="site-brand">우리사주</Link>
      <button type="button" className="home-notification-button" aria-label="알림">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </header>;
  }

  return <header className="site-header">
    <Link href="/" className="site-brand">우리사주</Link>
    <AuthStatus />
  </header>;
}
