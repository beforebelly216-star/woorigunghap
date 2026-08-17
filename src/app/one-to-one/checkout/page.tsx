"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PaymentButton } from "@/components/payment-button";
import { PurchasePolicyConsent } from "@/components/purchase-policy-consent";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToOneOrderDraft } from "@/lib/orders";
import { RELATIONSHIP_LABELS } from "@/lib/report-input";

function formatBirth(order: OneToOneOrderDraft, person: "personA" | "personB") {
  const value = order.inputSnapshot[person];
  const calendar = value.calendarType === "solar" ? "양력" : value.isLeapMonth ? "음력 · 윤달" : "음력";
  const time = value.birthTimeKnown ? value.birthTime : "시간 모름";
  return `${calendar} ${value.birthDate} · ${time}`;
}

function CheckoutContent() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const [order, setOrder] = useState<OneToOneOrderDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = paymentId ? loadOrderDraft(paymentId) : null;
      setOrder(stored?.product === "oneToOne" ? stored : null);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  if (!loaded) {
    return <p className="checkout-state" role="status">주문 정보를 불러오는 중이에요.</p>;
  }

  if (!order) {
    return (
      <div className="checkout-state">
        <h1>주문 정보를 찾지 못했어요.</h1>
        <p>입력 화면부터 다시 시작해 주세요.</p>
        <Link href="/one-to-one" className="primary-link">1:1 입력으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <>
      <header className="checkout-header">
        <p className="eyebrow">결제 전 마지막 확인</p>
        <h1>입력 내용을 확인해 주세요.</h1>
        <p>결제가 확인된 뒤 이 주문의 입력 스냅샷으로 궁합 계산과 디지털 리포트 생성이 즉시 시작됩니다.</p>
      </header>

      <section className="checkout-card" aria-label="주문 정보">
        <div className="checkout-row">
          <span>관계</span>
          <strong>{RELATIONSHIP_LABELS[order.inputSnapshot.relationshipType]}</strong>
        </div>
        <div className="checkout-person">
          <strong>{order.inputSnapshot.personA.displayName}</strong>
          <span>{formatBirth(order, "personA")}</span>
        </div>
        <div className="checkout-person">
          <strong>{order.inputSnapshot.personB.displayName}</strong>
          <span>{formatBirth(order, "personB")}</span>
        </div>
        <div className="checkout-total">
          <span>1:1 관계 궁합 리포트</span>
          <strong>{order.amount.toLocaleString("ko-KR")}원</strong>
        </div>
      </section>

      <PurchasePolicyConsent checked={policyAccepted} onChange={setPolicyAccepted} />
      <PaymentButton product="oneToOne" paymentId={order.paymentId} inputSnapshot={order.inputSnapshot} agreementAccepted={policyAccepted} />
      <Link href="/one-to-one" className="back-link checkout-back">입력 수정하기</Link>
      <p className="checkout-note">결제 승인 후 서버가 입력 해시와 금액을 검증한 뒤 결과를 생성·저장합니다. 결제창을 닫거나 네트워크가 끊겨도 같은 주문으로 다시 확인할 수 있고, 완료된 결과는 복구키 또는 로그인 계정 보관함에서 재열람할 수 있습니다.</p>
    </>
  );
}

export default function OneToOneCheckoutPage() {
  return (
    <main className="input-page">
      <div className="checkout-shell">
        <Suspense fallback={<p className="checkout-state" role="status">주문 정보를 불러오는 중이에요.</p>}>
          <CheckoutContent />
        </Suspense>
      </div>
    </main>
  );
}
