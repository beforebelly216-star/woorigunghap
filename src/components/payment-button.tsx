"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { useState } from "react";
import { PRODUCTS, type ProductKey } from "@/lib/catalog";
import { ORDER_BINDING_VERSION, hashOneToManyInput, hashOneToOneInput } from "@/lib/order-binding";
import type { OneToManyReportInput, OneToOneReportInput } from "@/lib/report-input";
import { buildOneToManyResultUrl, buildOneToOneResultUrl } from "@/lib/result-access-token";

type PaymentReadyPayload = {
  ready?: boolean;
  alreadyPaid?: boolean;
  error?: string;
};

export function PaymentButton({
  product,
  paymentId,
  inputSnapshot,
  resultAccessToken,
  agreementAccepted = true,
  buttonLabel,
}: {
  product: ProductKey;
  paymentId: string;
  inputSnapshot: OneToOneReportInput | OneToManyReportInput;
  resultAccessToken: string;
  agreementAccepted?: boolean;
  buttonLabel?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const item = PRODUCTS[product];

  async function startPayment() {
    if (!agreementAccepted) {
      setMessage("결제 전에 이용약관·개인정보 처리 및 디지털 콘텐츠 제공 조건을 확인해 주세요.");
      return;
    }
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
    if (!storeId || !channelKey) {
      setMessage("결제 설정이 아직 완료되지 않았어요. 환경변수를 확인해 주세요.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      let paymentReadyResponse: Response;
      try {
        paymentReadyResponse = await fetch("/api/orders/payment-ready", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentId, accessToken: resultAccessToken, input: inputSnapshot }),
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
      const paymentReady = await paymentReadyResponse.json().catch(() => null) as PaymentReadyPayload | null;
      if (!paymentReadyResponse.ok || !paymentReady?.ready) {
        setMessage(paymentReady?.error ?? "안전한 주문 저장 상태를 확인하지 못해 결제를 시작하지 않았습니다.");
        setIsLoading(false);
        return;
      }
      if (paymentReady.alreadyPaid) {
        window.location.assign(product === "oneToMany"
          ? buildOneToManyResultUrl(paymentId, resultAccessToken)
          : buildOneToOneResultUrl(paymentId, resultAccessToken));
        return;
      }

      const inputHash = product === "oneToMany"
        ? await hashOneToManyInput(inputSnapshot as OneToManyReportInput)
        : await hashOneToOneInput(inputSnapshot as OneToOneReportInput);

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: item.orderName,
        totalAmount: item.amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        redirectUrl: `${window.location.origin}/payment/redirect`,
        forceRedirect: true,
        customData: {
          product,
          bindingVersion: ORDER_BINDING_VERSION,
          inputHash,
        },
      });

      if (response?.code) {
        setMessage(response.message ?? "결제를 완료하지 못했어요. 다시 시도해 주세요.");
        setIsLoading(false);
      }
    } catch {
      setMessage("안전한 주문 상태를 확인하지 못해 결제를 시작하지 않았습니다. 잠시 후 다시 시도해 주세요.");
      setIsLoading(false);
    }
  }

  return (
    <div className="payment-area" aria-busy={isLoading}>
      <button type="button" className="payment-button" disabled={isLoading || !agreementAccepted} onClick={startPayment}>
        {isLoading ? "결제창을 여는 중..." : buttonLabel ?? `${item.amount.toLocaleString("ko-KR")}원 결제하기`}
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {isLoading ? "결제창을 여는 중입니다." : !agreementAccepted ? "구매 조건 확인 후 결제할 수 있습니다." : ""}
      </p>
      {message ? <p className="payment-message" role="alert">{message}</p> : null}
    </div>
  );
}
