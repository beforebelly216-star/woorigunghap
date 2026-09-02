"use client";

import { usePathname } from "next/navigation";
import { AuthStatus } from "@/components/auth-status";
import { WoorisajuBrand } from "@/components/woorisaju-brand";

export function SiteHeader() {
  const pathname = usePathname();

  if (
    pathname === "/free"
    || pathname === "/free/result"
    || pathname === "/one-to-one"
    || pathname === "/one-to-one/result"
    || pathname === "/one-to-many"
    || pathname.startsWith("/one-to-many/network/")
    || pathname.startsWith("/one-to-many/result")
    || pathname.startsWith("/share/")
  ) return null;

  if (pathname === "/") {
    return <header className="site-header site-header-home-a99">
      <WoorisajuBrand className="site-brand" />
      <AuthStatus />
    </header>;
  }

  return <header className="site-header">
    <WoorisajuBrand className="site-brand" />
    <AuthStatus />
  </header>;
}
