import { Suspense } from "react";
import OneToManyPaidResult from "./one-to-many-paid-result";
import "../one-to-many-foundation.css";

export default function OneToManyResultPage() {
  return <Suspense fallback={<main className="one-to-many-result-page"><div className="comparison-empty-state"><p className="eyebrow">1:다 비교 결과</p><h1>결과를 불러오고 있어요.</h1><p>저장된 비교 결과와 결제 상태를 확인하고 있어요.</p></div></main>}>
    <OneToManyPaidResult />
  </Suspense>;
}
