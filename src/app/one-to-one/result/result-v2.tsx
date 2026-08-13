"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import type { DetailedReportContent, DetailedReportMeta, PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToOneOrderDraft } from "@/lib/orders";
import { RELATIONSHIP_LABELS } from "@/lib/report-input";
import { ElementFacts, Paragraph, PillarGrid } from "./report-v2-components";
import ReportChaptersA from "./report-v2-chapters-a";
import ReportChaptersB from "./report-v2-chapters-b";

const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "일간 상성", dayBranch: "일지 상성", usefulGodFit: "필요한 기운 보완",
  elementComplementarity: "오행 상보성", heavenlyStemInteraction: "천간 합충",
  earthlyBranchInteraction: "지지 형충파해", specialStars: "귀인 신호",
  spouseStarRealization: "관계 역할 맞물림", luckCycleAlignment: "관계 타이밍",
};

function gradeFor(score: number) {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  if (score >= 40) return "E";
  return "F";
}

export default function ResultV2() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const debug = params.get("debug") === "1";
  const [order, setOrder] = useState<OneToOneOrderDraft | null>(null);
  const [snapshot, setSnapshot] = useState<CompatibilityCalculationSnapshot | null>(null);
  const [content, setContent] = useState<DetailedReportContent | null>(null);
  const [facts, setFacts] = useState<PaidReportFacts | null>(null);
  const [meta, setMeta] = useState<DetailedReportMeta | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!paymentId) { setStatus("missing"); return; }
      const draft = loadOrderDraft(paymentId);
      if (!draft) { setStatus("missing"); return; }
      setOrder(draft);
      setStatus("loading");
      setErrorMessage(null);
      void fetch("/api/compatibility/one-to-one", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: draft.paymentId, input: draft.inputSnapshot }),
      }).then(async (response) => {
        const payload = await response.json() as {
          snapshot?: CompatibilityCalculationSnapshot;
          reportContent?: DetailedReportContent;
          reportFacts?: PaidReportFacts;
          reportMeta?: DetailedReportMeta;
          error?: string;
        };
        if (!response.ok || !payload.snapshot || !payload.reportContent || !payload.reportFacts) throw new Error(payload.error ?? "상세 리포트를 생성하지 못했어요.");
        if (cancelled) return;
        setSnapshot(payload.snapshot); setContent(payload.reportContent); setFacts(payload.reportFacts); setMeta(payload.reportMeta ?? null); setStatus("ready");
      }).catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "상세 리포트를 생성하지 못했어요."); setStatus("error");
      });
    });
    return () => { cancelled = true; };
  }, [paymentId, retryKey]);

  const visibleDimensions = useMemo(() => {
    if (!snapshot) return [];
    return (Object.entries(snapshot.dimensions) as Array<[CompatibilityDimension, CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension]]>)
      .filter(([dimension, value]) => value.maxPoints > 0 && dimension !== "luckCycleAlignment");
  }, [snapshot]);

  if (status === "missing") return <main className="v2-page"><div className="v2-state"><h1>결제 결과를 찾지 못했어요.</h1><p>결제했던 같은 브라우저에서 결과 링크를 다시 열어 주세요.</p><Link href="/one-to-one">1:1 궁합으로 돌아가기</Link></div></main>;
  if (status === "loading") return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리궁합</p><h1>두 사람의 상세 리포트를 쓰고 있어요.</h1><p>점수 계산을 확인한 뒤 개인화된 긴 해설을 구성하고 있어요. 첫 생성은 잠시 걸릴 수 있습니다.</p></div></main>;
  if (status === "error" || !order || !snapshot || !content || !facts) return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리궁합</p><h1>상세 해설 생성이 지연되고 있어요.</h1><p>{errorMessage ?? "잠시 후 다시 시도해 주세요."}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)}>같은 결제로 다시 생성하기</button></div></main>;

  const { personA, personB, relationshipType } = order.inputSnapshot;
  const relationshipLabel = RELATIONSHIP_LABELS[relationshipType];
  return <main className="v2-page"><div className="v2-shell">
    <header className="v2-hero">
      <p className="v2-kicker">{relationshipLabel} 궁합 리포트</p>
      <h1>{personA.displayName} <span>×</span> {personB.displayName}</h1>
      <h2>{content.overview.headline}</h2>
      <Paragraph>{content.overview.detailedSummary}</Paragraph>
      <div className="v2-score"><span>{gradeFor(snapshot.score)}</span><strong>{snapshot.score}</strong><small>/ 100</small></div>
      {(!personA.birthTimeKnown || !personB.birthTimeKnown) && <p className="v2-uncertainty">출생시간 미상 시나리오 {snapshot.scenarioPolicy.pairScenarios.toLocaleString("ko-KR")}개를 함께 비교했어요. 현재 입력 기준 점수 범위는 {snapshot.uncertaintyRange.min}~{snapshot.uncertaintyRange.max}점입니다.</p>}
    </header>

    <section className="v2-basic-facts">
      <div className="v2-section-title"><small>FOUR PILLARS & FIVE ELEMENTS</small><h2>두 사람의 사주팔자와 오행</h2><p>어떤 명식을 바탕으로 계산했는지 먼저 보여드려요. 오행의 겉개수와 실제 세력 비중은 서로 다른 정보입니다.</p></div>
      <div className="v2-facts-grid">
        <article><div className="v2-person-title"><span>{personA.displayName}</span><strong>나의 사주</strong></div><PillarGrid facts={facts.A} /><ElementFacts facts={facts.A} /></article>
        <article><div className="v2-person-title"><span>{personB.displayName}</span><strong>상대의 사주</strong></div><PillarGrid facts={facts.B} /><ElementFacts facts={facts.B} /></article>
      </div>
    </section>

    <section className="v2-score-section">
      <div className="v2-section-title"><small>COMPATIBILITY SCORE</small><h2>핵심 궁합 지표</h2><p>점수는 해설의 근거 강도를 보여주는 참고값입니다. 본문에서 실제 관계에서 어떤 의미인지 자세히 설명합니다.</p></div>
      <div className="v2-score-grid">{visibleDimensions.map(([dimension, value]) => <div key={dimension}><span>{DIMENSION_LABELS[dimension]}</span><strong>{Math.round(value.normalizedScore)}</strong><i><b style={{ width: `${Math.min(100, Math.max(0, value.normalizedScore))}%` }} /></i></div>)}</div>
    </section>

    <ReportChaptersA content={content} personAName={personA.displayName} personBName={personB.displayName} />
    <ReportChaptersB content={content} personAName={personA.displayName} personBName={personB.displayName} relationshipLabel={relationshipLabel} />

    {debug && meta && <section className="v2-debug"><strong>QA debug</strong><pre>{JSON.stringify({ meta, scoringVersion: snapshot.scoringVersion, engineVersion: snapshot.engineVersion }, null, 2)}</pre></section>}
    <footer className="v2-footer"><Link href="/one-to-one">다른 사람과 다시 보기</Link><Link href="/">처음으로</Link></footer>
  </div></main>;
}
