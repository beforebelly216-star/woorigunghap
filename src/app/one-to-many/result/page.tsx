import { Suspense } from "react";
import OneToManyPaidResult from "./one-to-many-paid-result";

export default function OneToManyResultPage() {
  return <Suspense fallback={<main className="comparison-report-page"><div className="comparison-empty-state"><p>결과를 불러오는 중이에요.</p></div></main>}>
    <OneToManyPaidResult />
  </Suspense>;
}
