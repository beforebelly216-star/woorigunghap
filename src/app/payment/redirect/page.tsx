"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { loadOrderDraft } from "@/lib/order-storage";
import { buildOneToOneResultUrl } from "@/lib/result-access-token";

type State = "checking" | "success" | "failed" | "cancelled";

type VerifyPayload = {
  verified?: boolean;
  error?: string;
  code?: string;
};

const RETRYABLE_PAYMENT_CODES = new Set([
  "PORTONE_LOOKUP_FAILED",
  "PAYMENT_NOT_PAID",
]);

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function retryDelay(attempt: number) {
  return Math.min(10_000, 1_000 * 2 ** Math.min(4, Math.max(0, attempt - 1)));
}

function PaymentResult() {
  const params = useSearchParams();
  const router = useRouter();
  const paymentId = params.get("paymentId");
  const code = params.get("code");
  const [state, setState] = useState<State>(code ? "cancelled" : "checking");
  const [attempt, setAttempt] = useState(1);
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId || code) return;
    const verifiedPaymentId = paymentId;
    let cancelled = false;

    async function verifyUntilReady() {
      let currentAttempt = 0;
      while (!cancelled) {
        currentAttempt += 1;
        setAttempt(currentAttempt);

        try {
          const response = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ paymentId: verifiedPaymentId }),
            cache: "no-store",
          });
          const payload = await response.json().catch(() => null) as VerifyPayload | null;
          if (cancelled) return;

          if (response.ok && payload?.verified) {
            setState("success");
            const order = loadOrderDraft(verifiedPaymentId);
            router.replace(buildOneToOneResultUrl(verifiedPaymentId, order?.resultAccessToken));
            return;
          }

          const retryable = !payload
            || RETRYABLE_PAYMENT_CODES.has(payload.code ?? "")
            || response.status === 429
            || response.status >= 500;

          if (!retryable) {
            setFatalMessage(payload?.error ?? "결제 상품 또는 금액을 확인해야 합니다.");
            setState("failed");
            return;
          }
        } catch {
          // Browser/network interruptions are transient; keep checking the same payment.
        }

        await wait(retryDelay(currentAttempt));
      }
    }

    void verifyUntilReady();
    return () => {
      cancelled = true;
    };
  }, [code, paymentId, router]);

  const copy = {
    checking: [
      "결제를 확인하고 있어요",
      attempt > 1
        ? "결제 반영이 늦어 자동으로 다시 확인하고 있어요. 추가 결제는 하지 않습니다."
        : "확인되면 궁합 결과로 바로 이동해요.",
    ],
    success: ["결제가 확인됐어요", "궁합 결과를 여는 중이에요."],
    failed: ["결제 정보를 확인해야 해요", fatalMessage ?? "결제 상품 또는 금액을 다시 확인해 주세요."],
    cancelled: [
      "결제가 완료되지 않았어요",
      params.get("message") ?? "원하면 다시 시도할 수 있어요.",
    ],
  }[state];

  return (
    <main className="result-page">
      <p className="eyebrow">우리궁합</p>
      <h1>{copy[0]}</h1>
      <p>{copy[1]}</p>
      {state === "success" && paymentId ? (
        <Link
          href={buildOneToOneResultUrl(paymentId)}
          className="primary-link"
        >
          바로 결과 보기
        </Link>
      ) : state === "failed" || state === "cancelled" ? (
        <Link href="/" className="back-link">처음으로 돌아가기</Link>
      ) : null}
    </main>
  );
}

export default function PaymentRedirectPage() {
  return (
    <Suspense
      fallback={
        <main className="result-page">
          <p>결제 정보를 불러오는 중이에요.</p>
        </main>
      }
    >
      <PaymentResult />
    </Suspense>
  );
}
