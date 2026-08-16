import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";

export function SiteHeader() {
  return <header className="site-header">
    <Link href="/" className="site-brand">우리궁합</Link>
    <AuthStatus />
  </header>;
}
