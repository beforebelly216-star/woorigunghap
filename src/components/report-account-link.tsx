"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SaveState = "checking" | "guest" | "claiming" | "claimed" | "conflict" | "failed";

type ReportAccountLinkProps = {
  paymentId: string;
  accessToken: string | null;
  alreadyClaimed?: boolean;
};

export function ReportAccountLink({
  paymentId,
  accessToken,
  alreadyClaimed = false,
}: ReportAccountLinkProps) {
  const [state, setState] = useState<SaveState>(alreadyClaimed ? "claimed" : "checking");
  const started = useRef(false);

  useEffect(() => {
    if (alreadyClaimed || started.current) return;
    started.current = true;
    let cancelled = false;

    async function connect() {
      try {
        if (!accessToken) {
          setState("failed");
          return;
        }

        setState("claiming");
        const response = await fetch("/api/account/reports/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentId, accessToken }),
          cache: "no-store",
          referrerPolicy: "no-referrer",
        });
        if (cancelled) return;
        if (response.ok) {
          setState("claimed");
          return;
        }
        if (response.status === 401) setState("guest");
        else setState(response.status === 409 ? "conflict" : "failed");
      } catch {
        if (!cancelled) setState("failed");
      }
    }

    void connect();
    return () => {
      cancelled = true;
    };
  }, [accessToken, alreadyClaimed, paymentId]);

  const loginHref = `/login?${new URLSearchParams({
    returnTo: typeof window === "undefined"
      ? "/"
      : `${window.location.pathname}${window.location.search}`,
  }).toString()}`;

  return <aside className={`account-save-panel account-save-${state}`} aria-live="polite">
    <div>
      <strong>{state === "claimed" ? "이 리포트를 보관함에 저장했어요" : "구매 리포트 보관함"}</strong>
      <p>
        {state === "checking" && "로그인 상태를 확인하고 있어요."}
        {state === "guest" && "카카오 로그인 후 이 결과를 계정에 안전하게 저장할 수 있어요."}
        {state === "claiming" && "완료된 결제 결과를 계정에 연결하고 있어요."}
        {state === "claimed" && "다른 기기에서도 로그인하면 같은 결과를 다시 열 수 있어요."}
        {state === "conflict" && "이 결과는 이미 다른 카카오 계정에 저장되어 있어요."}
        {state === "failed" && "자동 저장을 완료하지 못했어. 결과 링크는 그대로 쓸 수 있어."}
      </p>
    </div>
    {state === "guest" ? <Link className="account-save-action" href={loginHref}>카카오 로그인하고 보관하기</Link> : null}
    {state === "claimed" ? <Link className="account-save-action" href="/account/reports">내 보관함 열기</Link> : null}
  </aside>;
}
