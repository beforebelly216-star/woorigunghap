"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type State = "checking" | "success" | "failed" | "cancelled";

function PaymentResult() {
  const params = useSearchParams();
  const router = useRouter();
  const paymentId = params.get("paymentId");
  const code = params.get("code");
  const [state, setState] = useState<State>(code ? "cancelled" : "checking");

  useEffect(() => {
    if (!paymentId || code) return;

    let cancelled = false;
    void fetch("/api/payments/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId }),
    })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setState("failed");
          return;
        }

        setState("success");
        router.replace(`/one-to-one/result?paymentId=${encodeURIComponent(paymentId)}`);
      })
      .catch(() => {
        if (!cancelled) setState("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [code, paymentId, router]);

  const copy = {
    checking: ["결제를 확인하고 있어요", "확인되면 궁합 결과로 바로 이동해요."],
    success: ["결제가 확인됐어요", "궁합 결과를 여는 중이에요."],
    failed: ["결제 확인에 실패했어요", "결제 상태와 금액을 다시 확인해 주세요."],
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
          href={`/one-to-one/result?paymentId=${encodeURIComponent(paymentId)}`}
          className="primary-link"
        >
          바로 결과 보기
        </Link>
      ) : (
        <Link href="/" className="back-link">
          처음으로 돌아가기
        </Link>
      )}
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
