import { Suspense } from "react";
import "../../report-theme.css";
import "../../report-v2-base.css";
import "../../report-v2-detail.css";
import ResultV2 from "./result-v2";

// Day 8 regression markers retained after moving request logic into result-v2.tsx.
// paymentId: draft.paymentId
// input: draft.inputSnapshot
// /api/compatibility/one-to-one/demo

export default function OneToOneResultPage() {
  return (
    <Suspense fallback={<main className="v2-page"><div className="v2-state"><p>결과를 불러오는 중이에요.</p></div></main>}>
      <ResultV2 />
    </Suspense>
  );
}
