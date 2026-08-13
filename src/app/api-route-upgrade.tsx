"use client";

import { useEffect } from "react";

export default function ApiRouteUpgrade() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === "string" && input === "/api/compatibility/one-to-one") {
        return originalFetch("/api/compatibility/one-to-one-v4", init);
      }
      if (input instanceof URL && input.pathname === "/api/compatibility/one-to-one") {
        const replacement = new URL(input.toString());
        replacement.pathname = "/api/compatibility/one-to-one-v4";
        return originalFetch(replacement, init);
      }
      return originalFetch(input, init);
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
