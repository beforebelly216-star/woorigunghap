"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FlowStatusScreen } from "@/components/flow-status-screen";

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

  if (!authorized) return <FlowStatusScreen
    activeStep="login"
    title="로그인 상태를 확인하고 있어요"
    description="저장된 결과와 결제 정보를 안전하게 연결하고 있어요. 확인되면 자동으로 다음 단계로 이동합니다."
    detail="이 화면에서 새 결제나 중복 요청은 발생하지 않아요."
    expression="thinking"
  />;
  return children;
}
