"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PaymentButton } from "@/components/payment-button";
import { PurchasePolicyConsent } from "@/components/purchase-policy-consent";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToOneOrderDraft } from "@/lib/orders";
import { COWORKER_HIERARCHY_LABELS, RELATIONSHIP_LABELS } from "@/lib/report-input";
import styles from "../one-to-one-flow.module.css";

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

  const hierarchy = order.inputSnapshot.relationshipType === "coworker"
    ? order.inputSnapshot.coworkerHierarchy ?? null
    : null;
  const duration = order.inputSnapshot.relationshipType === "crush"
    ? null
    : order.inputSnapshot.relationshipDurationMonths ?? null;
  const mostCurious = order.inputSnapshot.mostCurious?.trim() || null;

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
        {duration != null ? <div className="checkout-row">
          <span>관계 기간</span>
          <strong>{duration.toLocaleString("ko-KR")}개월</strong>
        </div> : null}
        {hierarchy ? <div className="checkout-row">
          <span>업무 관계</span>
          <strong>{COWORKER_HIERARCHY_LABELS[hierarchy]}</strong>
        </div> : null}
        <div className="checkout-person">
          <strong>{order.inputSnapshot.personA.displayName}</strong>
          <span>{formatBirth(order, "personA")}</span>
        </div>
        <div className="checkout-person">
          <strong>{order.inputSnapshot.personB.displayName}</strong>
          <span>{formatBirth(order, "personB")}</span>
        </div>
        {mostCurious ? <div className="checkout-person">
          <strong>가장 궁금한 점</strong>
          <span>{mostCurious}</span>
        </div> : null}
        <div className="checkout-total">
          <span>1:1 관계 궁합 리포트</span>
          <strong>{order.amount.toLocaleString("ko-KR")}원</strong>
        </div>
      </section>

      <section className="checkout-unlock-preview" aria-labelledby="checkout-unlock-title">
        <p className="card-label">결제 후 바로 열리는 것</p>
        <h2 id="checkout-unlock-title">사주소년이 두 사람의 관계를 끝까지 읽어드려요.</h2>
        <div>
          <article><span>01</span><strong>그 사람의 속마음</strong><p>계산된 관계 반응을 바탕으로, 겉으로 드러나는 모습과 속의 반응 차이를 풀어봅니다.</p></article>
          <article><span>02</span><strong>갈등과 회복의 사용법</strong><p>어떤 장면에서 자주 어긋나고 어떻게 다시 대화하면 좋은지 정리합니다.</p></article>
          <article><span>03</span><strong>실전 관계 매뉴얼</strong><p>연락, 표현, 거리 조절과 앞으로 써먹을 행동 가이드를 챕터별로 제공합니다.</p></article>
        </div>
        <p className="checkout-price-anchor">한 번 결제로 완성된 리포트 전체를 저장해 다시 볼 수 있어요.</p>
      </section>
      <PurchasePolicyConsent checked={policyAccepted} onChange={setPolicyAccepted} />
      <div className="checkout-sticky-cta">
        <PaymentButton product="oneToOne" paymentId={order.paymentId} inputSnapshot={order.inputSnapshot} agreementAccepted={policyAccepted} buttonLabel="속마음까지 다 보기 · 1,000원" />
      </div>
      <Link href="/one-to-one" className="back-link checkout-back">입력 수정하기</Link>
      <p className="checkout-note">결제 승인 후 서버가 입력 해시와 금액을 검증한 뒤 결과를 생성·저장합니다. 결제창을 닫거나 네트워크가 끊겨도 같은 주문으로 다시 확인할 수 있고, 완료된 결과는 복구키 또는 로그인 계정 보관함에서 재열람할 수 있습니다.</p>
    </>
  );
}

export default function OneToOneCheckoutPage() {
  return (
    <main className={styles.checkoutPage}>
      <div className={styles.checkoutShell}>
        <Suspense fallback={<p className="checkout-state" role="status">주문 정보를 불러오는 중이에요.</p>}>
          <CheckoutContent />
        </Suspense>
      </div>
    </main>
  );
}
