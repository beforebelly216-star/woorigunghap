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
  retryable?: boolean;
};

const MAX_VERIFY_ATTEMPTS = 7;
const VERIFY_REQUEST_TIMEOUT_MS = 12_000;
const RETRYABLE_PAYMENT_CODES = new Set([
  "PORTONE_LOOKUP_FAILED",
  "PAYMENT_NOT_PAID",
  "PAYMENT_PAID_STORE_PENDING",
  "PAYMENT_STORE_UNAVAILABLE",
  "PAYMENT_STORE_RECOVERY_FAILED",
  "PAYMENT_ORDER_MISSING",
  "PAYMENT_VERIFY_UNEXPECTED",
]);
const RECHECK_ONLY_PAYMENT_CODES = new Set([
  "PAYMENT_STORE_NOT_CONFIGURED",
  "PAYMENT_SERVER_NOT_CONFIGURED",
]);

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function retryDelay(attempt: number) {
  return Math.min(8_000, 1_000 * 2 ** Math.min(3, Math.max(0, attempt - 1)));
}

async function verifyPaymentRequest(paymentId: string) {
  const order = loadOrderDraft(paymentId);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), VERIFY_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paymentId,
        accessToken: order?.resultAccessToken,
        input: order?.inputSnapshot,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as VerifyPayload | null;
    return { response, payload, order };
  } finally {
    window.clearTimeout(timeout);
  }
}

function PaymentResult() {
  const params = useSearchParams();
  const router = useRouter();
  const paymentId = params.get("paymentId");
  const code = params.get("code");
  const [state, setState] = useState<State>(code ? "cancelled" : "checking");
  const [attempt, setAttempt] = useState(1);
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);
  const [safeRecheckOnly, setSafeRecheckOnly] = useState(false);

  useEffect(() => {
    if (!paymentId || code) return;
    const verifiedPaymentId = paymentId;
    let cancelled = false;

    async function verifyUntilReady() {
      let lastMessage = "결제 상태를 아직 확정하지 못했습니다.";

      for (let currentAttempt = 1; currentAttempt <= MAX_VERIFY_ATTEMPTS && !cancelled; currentAttempt += 1) {
        setAttempt(currentAttempt);

        try {
          const { response, payload, order } = await verifyPaymentRequest(verifiedPaymentId);
          if (cancelled) return;

          if (response.ok && payload?.verified) {
            setState("success");
            const resultUrl = productFromPaymentId(verifiedPaymentId) === "oneToMany"
              ? buildOneToManyResultUrl(verifiedPaymentId, order?.resultAccessToken)
              : buildOneToOneResultUrl(verifiedPaymentId, order?.resultAccessToken);
            router.replace(resultUrl);
            return;
          }

          lastMessage = payload?.error ?? lastMessage;
          if (RECHECK_ONLY_PAYMENT_CODES.has(payload?.code ?? "")) {
            setFatalMessage(`${lastMessage} 결제는 다시 하지 말고 서버 설정 복구 후 같은 결제를 다시 확인해 줘.`);
            setSafeRecheckOnly(true);
            setState("failed");
            return;
          }
          const retryable = payload?.retryable === true
            || RETRYABLE_PAYMENT_CODES.has(payload?.code ?? "")
            || response.status === 429
            || response.status >= 500;

          if (!retryable) {
            setFatalMessage(lastMessage);
            setSafeRecheckOnly(false);
            setState("failed");
            return;
          }
        } catch {
          lastMessage = "결제 확인 서버 응답이 늦어지고 있어.";
        }

        if (currentAttempt < MAX_VERIFY_ATTEMPTS) {
          await wait(retryDelay(currentAttempt));
        }
      }

      if (cancelled) return;
      setSafeRecheckOnly(true);
      setFatalMessage(`${lastMessage} 결제는 다시 하지 말고 같은 결제를 다시 확인해 줘.`);
      setState("failed");
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
        ? `서버에 결제 상태를 다시 확인하고 있어요. ${attempt}/${MAX_VERIFY_ATTEMPTS} · 추가 결제는 하지 않습니다.`
        : "확인되면 결과 생성을 시작하고 궁합 결과로 이동해요.",
    ],
    success: ["결제가 확인됐어", "결과 만들기를 시작했어. 보관함으로 이동해도 계속 진행돼."],
    failed: [
      safeRecheckOnly ? "같은 결제를 다시 확인해 줘" : "결제 정보를 확인해야 해",
      fatalMessage ?? "결제 상품 또는 금액을 다시 확인해 줘.",
    ],
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
      <p className="eyebrow">주토피</p>
      <h1>{copy[0]}</h1>
      <p>{copy[1]}</p>
      {state === "checking" ? (
        <p className="result-note">확인이 끝나지 않아도 새 결제를 만들지 않습니다.</p>
      ) : null}
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
      ) : state === "failed" && safeRecheckOnly ? (
        <div className="recovery-actions">
          <button type="button" className="primary-link" onClick={() => window.location.reload()}>
            같은 결제 다시 확인
          </button>
          <Link href="/" className="back-link">처음으로 돌아가기</Link>
        </div>
      ) : state === "cancelled" ? (
        <div className="recovery-actions">
          {retryHref ? <Link href={retryHref} className="primary-link">결제 화면으로 돌아가기</Link> : null}
          <Link href="/" className="back-link">처음으로 돌아가기</Link>
        </div>
      ) : state === "failed" ? (
        <div className="recovery-actions">
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
        <main className="result-page payment-result-page" aria-live="polite" aria-busy="true">
          <p>결제 정보를 불러오는 중이에요.</p>
        </main>
      }
    >
      <PaymentResult />
    </Suspense>
  );
}
