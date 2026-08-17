"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { loadOrderDraft } from "@/lib/order-storage";
import { buildOneToManyResultUrl, buildOneToOneResultUrl } from "@/lib/result-access-token";
import { productFromPaymentId } from "@/lib/payments/verification";

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
          const order = loadOrderDraft(verifiedPaymentId);
          const response = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              paymentId: verifiedPaymentId,
              accessToken: order?.resultAccessToken,
              input: order?.inputSnapshot,
            }),
            cache: "no-store",
          });
          const payload = await response.json().catch(() => null) as VerifyPayload | null;
          if (cancelled) return;

          if (response.ok && payload?.verified) {
            setState("success");
            const resultUrl = productFromPaymentId(verifiedPaymentId) === "oneToMany"
              ? buildOneToManyResultUrl(verifiedPaymentId, order?.resultAccessToken)
              : buildOneToOneResultUrl(verifiedPaymentId, order?.resultAccessToken);
            router.replace(resultUrl);
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
        : "확인되면 결과 생성을 시작하고 궁합 결과로 이동해요.",
    ],
    success: ["결제가 확인됐어요", "결과 생성을 시작했어요. 보관함으로 이동해도 계속 진행됩니다."],
    failed: ["결제 정보를 확인해야 해요", fatalMessage ?? "결제 상품 또는 금액을 다시 확인해 주세요."],
    cancelled: [
      "결제가 완료되지 않았어요",
      params.get("message") ?? "결제는 승인되지 않았습니다. 입력 내용은 그대로 두고 다시 시도할 수 있어요.",
    ],
  }[state];

  const product = paymentId ? productFromPaymentId(paymentId) : null;
  const retryHref = paymentId && product
    ? `${product === "oneToMany" ? "/one-to-many/checkout" : "/one-to-one/checkout"}?paymentId=${encodeURIComponent(paymentId)}`
    : null;

  return (
    <main className="result-page payment-result-page" aria-live="polite" aria-busy={state === "checking"}>
      <p className="eyebrow">우리궁합</p>
      <h1>{copy[0]}</h1>
      <p>{copy[1]}</p>
      {state === "success" && paymentId ? (
        <div className="recovery-actions">
          <Link
            href={product === "oneToMany"
              ? buildOneToManyResultUrl(paymentId)
              : buildOneToOneResultUrl(paymentId)}
            className="primary-link"
          >
            바로 결과 보기
          </Link>
          <Link href="/account/reports" className="back-link">보관함에서 생성 상태 보기</Link>
        </div>
      ) : state === "failed" || state === "cancelled" ? (
        <div className="recovery-actions">
          {retryHref ? <Link href={retryHref} className="primary-link">같은 주문으로 결제 다시 시도</Link> : null}
          <Link href="/" className="back-link">처음으로 돌아가기</Link>
        </div>
      ) : null}
    </main>
  );
}

export default function PaymentRedirectPage() {
  return (
    <Suspense
      fallback={
        <main className="result-page" aria-live="polite" aria-busy="true">
          <p>결제 정보를 불러오는 중이에요.</p>
        </main>
      }
    >
      <PaymentResult />
    </Suspense>
  );
}
