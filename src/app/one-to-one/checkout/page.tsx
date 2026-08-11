"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PaymentButton } from "@/components/payment-button";
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

  useEffect(() => {
    setOrder(paymentId ? loadOrderDraft(paymentId) : null);
    setLoaded(true);
  }, [paymentId]);

  if (!loaded) {
    return <p className="checkout-state">주문 정보를 불러오는 중이에요.</p>;
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
        <p>결제가 확인된 뒤 이 주문의 입력 스냅샷으로 궁합 계산을 진행하게 됩니다.</p>
      </header>

      <section className="checkout-card">
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

      <PaymentButton product="oneToOne" paymentId={order.paymentId} />
      <Link href="/one-to-one" className="back-link checkout-back">입력 수정하기</Link>
      <p className="checkout-note">현재 개발 단계에서는 주문 입력값을 같은 브라우저 탭에 임시 보관합니다. DB 저장은 후속 단계에서 연결합니다.</p>
    </>
  );
}

export default function OneToOneCheckoutPage() {
  return (
    <main className="input-page">
      <div className="checkout-shell">
        <Suspense fallback={<p className="checkout-state">주문 정보를 불러오는 중이에요.</p>}>
          <CheckoutContent />
        </Suspense>
      </div>
    </main>
  );
}
