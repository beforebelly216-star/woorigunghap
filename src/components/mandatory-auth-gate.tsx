"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PUBLIC_PATHS = new Set(["/", "/login", "/terms", "/privacy", "/refund", "/operating-policy"]);

export function MandatoryAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.has(pathname);
  const [authorized, setAuthorized] = useState(isPublic);

  useEffect(() => {
    let active = true;
    if (isPublic) {
      queueMicrotask(() => active && setAuthorized(true));
      return () => { active = false; };
    }

    queueMicrotask(() => active && setAuthorized(false));
    fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active) return;
        if (payload?.authenticated === true) {
          setAuthorized(true);
          return;
        }
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?${new URLSearchParams({ returnTo }).toString()}`);
      })
      .catch(() => {
        if (!active) return;
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?${new URLSearchParams({ returnTo }).toString()}`);
      });

    return () => { active = false; };
  }, [isPublic, pathname]);

  if (!authorized) return <main className="auth-gate-screen" role="status">카카오 로그인 상태를 확인하고 있어.</main>;
  return children;
}
