"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PaymentButton } from "@/components/payment-button";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToManyOrderDraft } from "@/lib/orders";
import { RELATIONSHIP_LABELS } from "@/lib/report-input";

function CheckoutContent() {
  const paymentId = useSearchParams().get("paymentId");
  const [order, setOrder] = useState<OneToManyOrderDraft | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = paymentId ? loadOrderDraft(paymentId) : null;
    queueMicrotask(() => {
      setOrder(stored?.product === "oneToMany" ? stored : null);
      setLoaded(true);
    });
  }, [paymentId]);

  if (!loaded) return <p className="checkout-state">주문 정보를 불러오는 중이에요.</p>;
  if (!order) {
    return <div className="checkout-state"><h1>주문 정보를 찾지 못했어요.</h1><Link href="/one-to-many" className="primary-link">입력으로 돌아가기</Link></div>;
  }

  return <>
    <header className="checkout-header">
      <p className="eyebrow">1:다 결제 전 마지막 확인</p>
      <h1>비교 대상을 확인해 주세요.</h1>
      <p>결제 확인 전에는 계산과 AI 해설을 시작하지 않습니다.</p>
    </header>
    <section className="checkout-card">
      <div className="checkout-row"><span>관계</span><strong>{RELATIONSHIP_LABELS[order.inputSnapshot.relationshipType]}</strong></div>
      <div className="checkout-person"><strong>기준자 · {order.inputSnapshot.referencePerson.displayName}</strong><span>비교의 중심</span></div>
      {order.inputSnapshot.candidates.map((candidate, index) => (
        <div className="checkout-person" key={index}><strong>후보 {index + 1} · {candidate.displayName}</strong><span>동일 기준으로 비교</span></div>
      ))}
      <div className="checkout-total"><span>1:다 관계 비교 리포트</span><strong>{order.amount.toLocaleString("ko-KR")}원</strong></div>
    </section>
    <PaymentButton product="oneToMany" paymentId={order.paymentId} inputSnapshot={order.inputSnapshot} />
    <Link href="/one-to-many" className="back-link checkout-back">입력 수정하기</Link>
    <p className="checkout-note">결제 승인 후 서버가 점수와 순위를 확정하고, 익명화한 근거로 AI 해설을 한 번 생성합니다. 결과는 암호화 수준의 복구키가 포함된 현재 브라우저 링크로 다시 열 수 있습니다.</p>
  </>;
}

export default function OneToManyCheckoutPage() {
  return <main className="input-page"><div className="checkout-shell"><Suspense fallback={<p className="checkout-state">주문 정보를 불러오는 중이에요.</p>}><CheckoutContent /></Suspense></div></main>;
}
