"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PaymentButton } from "@/components/payment-button";
import { PurchasePolicyConsent } from "@/components/purchase-policy-consent";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToManyOrderDraft } from "@/lib/orders";
import { RELATIONSHIP_LABELS } from "@/lib/report-input";
import "../one-to-many-foundation.css";

function CheckoutContent() {
  const paymentId = useSearchParams().get("paymentId");
  const [order, setOrder] = useState<OneToManyOrderDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  useEffect(() => {
    const stored = paymentId ? loadOrderDraft(paymentId) : null;
    queueMicrotask(() => {
      setOrder(stored?.product === "oneToMany" ? stored : null);
      setLoaded(true);
    });
  }, [paymentId]);

  if (!loaded) return <p className="checkout-state" role="status">주문 정보를 불러오는 중이에요.</p>;
  if (!order) {
    return <div className="checkout-state"><h1>주문 정보를 찾지 못했어요.</h1><Link href="/one-to-many" className="primary-link">입력으로 돌아가기</Link></div>;
  }

  return <>
    <header className="checkout-header checkout-v3-header">
      <p className="eyebrow">1:N 궁합 · 결제</p>
      <h1>후보 비교를 시작할 준비가 됐어요.</h1>
      <p>같은 기준으로 모든 후보를 계산한 뒤 순위와 차이를 한 화면에서 비교합니다.</p>
      <ol className="paid-flow-steps" aria-label="결제 진행 단계">
        <li className="is-done"><span>01</span><strong>입력 완료</strong></li>
        <li className="is-current"><span>02</span><strong>결제</strong></li>
        <li><span>03</span><strong>비교 생성</strong></li>
      </ol>
    </header>

    <section className="checkout-card checkout-v3-summary" aria-label="주문 정보">
      <div className="checkout-row"><span>관계</span><strong>{RELATIONSHIP_LABELS[order.inputSnapshot.relationshipType]}</strong></div>
      <div className="checkout-person"><strong>기준자 · {order.inputSnapshot.referencePerson.displayName}</strong><span>비교의 중심</span></div>
      {order.inputSnapshot.candidates.map((candidate, index) => (
        <div className="checkout-person" key={index}><strong>후보 {index + 1} · {candidate.displayName}</strong><span>동일 기준으로 비교</span></div>
      ))}
      <div className="checkout-total"><span>1:N 관계 비교 리포트</span><strong>{order.amount.toLocaleString("ko-KR")}원</strong></div>
    </section>

    <section className="checkout-unlock-preview checkout-v3-unlocks" aria-labelledby="one-to-many-unlock-title">
      <p className="card-label">결제 후 바로 열리는 것</p>
      <h2 id="one-to-many-unlock-title">누가 더 맞는지보다, 왜 차이가 나는지까지 비교해요.</h2>
      <div>
        <article><span>01</span><strong>전체 후보 순위</strong><p>같은 계산 기준으로 후보별 종합점수와 순위를 한 번에 확인합니다.</p></article>
        <article><span>02</span><strong>공통 지표 비교</strong><p>대화, 갈등, 신뢰, 생활 리듬 등 후보마다 어디가 강하고 약한지 나란히 봅니다.</p></article>
        <article><span>03</span><strong>후보별 선택 포인트</strong><p>각 후보의 강점·주의점·관계에서 써먹을 행동 가이드를 구분해 제공합니다.</p></article>
      </div>
      <p className="checkout-price-anchor">한 번 결제로 모든 후보 비교 결과를 저장해 다시 볼 수 있어요.</p>
    </section>

    <div className="checkout-v3-assurance" aria-label="결제 안내">
      <span><b>1회 결제</b>후보 전체 포함</span>
      <span><b>자동 저장</b>완성 결과 재열람</span>
      <span><b>중복 생성 방지</b>같은 주문은 한 번만 생성</span>
    </div>

    <PurchasePolicyConsent checked={policyAccepted} onChange={setPolicyAccepted} />
    <div className="checkout-sticky-cta">
      <PaymentButton product="oneToMany" paymentId={order.paymentId} inputSnapshot={order.inputSnapshot} agreementAccepted={policyAccepted} buttonLabel="1:N 전체 비교 보기 · 3,000원" />
    </div>
    <Link href="/one-to-many" className="back-link checkout-back">입력 수정하기</Link>
    <p className="checkout-note">결제 승인 뒤 비교 계산과 해설 생성이 시작됩니다. 생성 중 화면을 이동해도 같은 결과 링크에서 이어서 확인할 수 있고, 완성된 결과는 복구키 또는 로그인 계정 보관함에서 재열람할 수 있습니다.</p>
  </>;
}

export default function OneToManyCheckoutPage() {
  return <main className="one-to-many-checkout-page"><div className="one-to-many-checkout-shell"><Suspense fallback={<p className="checkout-state" role="status">주문 정보를 불러오는 중이에요.</p>}><CheckoutContent /></Suspense></div></main>;
}
