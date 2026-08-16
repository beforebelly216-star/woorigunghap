"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; displayName: string };

export function AuthStatus() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.authenticated && typeof payload.user?.displayName === "string") {
          setAuth({ status: "authenticated", displayName: payload.user.displayName });
        } else {
          setAuth({ status: "guest" });
        }
      })
      .catch(() => setAuth({ status: "guest" }));
  }, []);

  function openLogin(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const returnTo = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?${new URLSearchParams({ returnTo }).toString()}`);
  }

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (response.ok) setAuth({ status: "guest" });
  }

  if (auth.status === "loading") {
    return <span className="auth-status auth-status-loading" aria-label="로그인 상태 확인 중">확인 중</span>;
  }
  if (auth.status === "guest") {
    return <a className="auth-status auth-login-link" href="/login" onClick={openLogin}>카카오 로그인</a>;
  }
  return <div className="auth-user">
    <Link href="/account/reports" className="auth-library-link">보관함</Link>
    <span className="auth-status">{auth.displayName}</span>
    <button type="button" className="auth-logout-button" onClick={logout}>로그아웃</button>
  </div>;
}
