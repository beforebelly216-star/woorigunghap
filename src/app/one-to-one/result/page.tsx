import { Suspense } from "react";
import "../../report-theme.css";
import "../../report-v2-base.css";
import "../../report-v2-detail.css";
import "../../report-p5-overrides.css";
import "../../report-p5-mobile.css";
import "./result-status.css";
import "./report-foundation.css";
import "../../../components/zootopi-mark.css";
import "../../../components/candlestick-score.css";
import ResultV2 from "./result-v2";

// Day 8 regression markers retained after moving request logic into result-v2.tsx.
// paymentId: draft.paymentId
// input: draft.inputSnapshot
// /api/compatibility/one-to-one/demo

export default function OneToOneResultPage() {
  return (
    <Suspense fallback={<main className="v2-page"><div className="v2-state"><p className="v2-kicker">주토피</p><h1>결과를 불러오고 있어.</h1><p>결제와 저장 상태를 확인한 뒤 바로 이어서 보여줄게.</p></div></main>}>
      <ResultV2 />
    </Suspense>
  );
}
