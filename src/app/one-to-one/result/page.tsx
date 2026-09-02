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
import { FlowStatusScreen } from "@/components/flow-status-screen";

// Day 8 regression markers retained after moving request logic into result-v2.tsx.
// paymentId: draft.paymentId
// input: draft.inputSnapshot
// /api/compatibility/one-to-one/demo

export default function OneToOneResultPage() {
  return (
    <Suspense fallback={<FlowStatusScreen
      activeStep="report"
      title="결과를 불러오고 있어요"
      description="결제와 저장 상태를 확인한 뒤 완성된 리포트를 바로 이어서 보여드려요."
      expression="idea"
    />}>
      <ResultV2 />
    </Suspense>
  );
}
