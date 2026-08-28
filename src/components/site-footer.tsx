"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OPERATOR_PUBLIC_INFO } from "@/lib/operating-policy";

export function SiteFooter() {
  const pathname = usePathname();
  if (
    pathname === "/"
    || pathname === "/free"
    || pathname === "/free/result"
    || pathname === "/one-to-one"
    || pathname === "/one-to-one/result"
    || pathname === "/one-to-many"
    || pathname.startsWith("/one-to-many/result")
    || pathname.startsWith("/share/")
  ) return null;

  return <footer className="site-footer">
    <nav aria-label="운영 정책">
      <Link href="/terms">이용약관</Link>
      <Link href="/privacy">개인정보처리방침</Link>
      <Link href="/refund">환불·청약철회</Link>
    </nav>
    <p>운영자: {OPERATOR_PUBLIC_INFO.name}</p>
    <p>고객지원: {OPERATOR_PUBLIC_INFO.email}</p>
    <p className="site-footer-note">정식 유료 판매 전 사업자·통신판매업 신고 정보를 최종 입력해야 합니다.</p>
  </footer>;
}
