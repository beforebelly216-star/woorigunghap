"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { useState } from "react";
import { PRODUCTS, type ProductKey } from "@/lib/catalog";

export function PaymentButton({
  product,
  paymentId,
}: {
  product: ProductKey;
  paymentId?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const item = PRODUCTS[product];

  async function startPayment() {
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
    if (!storeId || !channelKey) {
      setMessage("결제 설정이 아직 완료되지 않았어요. 환경변수를 확인해 주세요.");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    const resolvedPaymentId = paymentId ?? `woori-${product}-${crypto.randomUUID()}`;
    const response = await PortOne.requestPayment({
      storeId,
      channelKey,
      paymentId: resolvedPaymentId,
      orderName: item.orderName,
      totalAmount: item.amount,
      currency: "CURRENCY_KRW",
      payMethod: "CARD",
      redirectUrl: `${window.location.origin}/payment/redirect`,
      forceRedirect: true,
    });

    if (response?.code) {
      setMessage(response.message ?? "결제를 완료하지 못했어요. 다시 시도해 주세요.");
      setIsLoading(false);
    }
  }

  return (
    <div className="payment-area">
      <button type="button" className="payment-button" disabled={isLoading} onClick={startPayment}>
        {isLoading ? "결제창을 여는 중..." : `${item.amount.toLocaleString("ko-KR")}원 결제하기`}
      </button>
      {message ? <p className="payment-message">{message}</p> : null}
    </div>
  );
}
