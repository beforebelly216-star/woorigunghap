"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import type { DetailedReportContent, PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import type {
  ActionSegment,
  DynamicsSegment,
  IntroSegment,
  PaidReportSegmentContent,
  PaidReportSegmentMeta,
  PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToOneOrderDraft } from "@/lib/orders";
import {
  emptyReportProgress,
  loadReportProgress,
  saveReportProgress,
  type ReportProgress,
} from "@/lib/report-progress-storage";
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

const SEGMENTS: PaidReportSegmentName[] = ["intro", "dynamics", "action"];
const PERMANENT_FAILURE_LABELS: Record<string, string> = {
  API_AUTH: "Claude API 키 인증 설정을 확인해야 해요.",
  API_BILLING: "Claude API 사용 크레딧을 확인해야 해요.",
  API_PERMISSION: "현재 API 키의 모델 사용 권한을 확인해야 해요.",
  AI_MODE: "AI 서술 모드 설정을 확인해야 해요.",
  API_KEY_MISSING: "Claude API 키 설정을 확인해야 해요.",
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function completedCount(progress: ReportProgress) {
  return Number(!!progress.segments.intro) + Number(!!progress.segments.dynamics) + Number(!!progress.segments.action);
}

function assembleContent(progress: ReportProgress): DetailedReportContent | null {
  const { intro, dynamics, action } = progress.segments;
  if (!intro || !dynamics || !action) return null;
  return { ...intro, ...dynamics, ...action };
}

function assignSegment(progress: ReportProgress, segment: PaidReportSegmentName, content: PaidReportSegmentContent, meta: PaidReportSegmentMeta | null) {
  if (segment === "intro") progress.segments.intro = content as IntroSegment;
  if (segment === "dynamics") progress.segments.dynamics = content as DynamicsSegment;
  if (segment === "action") progress.segments.action = content as ActionSegment;
  if (meta) progress.metas[segment] = meta;
  progress.updatedAt = new Date().toISOString();
}

type SegmentApiPayload = {
  ok?: boolean;
  segment?: PaidReportSegmentName;
  segmentContent?: PaidReportSegmentContent;
  segmentMeta?: PaidReportSegmentMeta;
  reportFacts?: PaidReportFacts;
  snapshot?: CompatibilityCalculationSnapshot;
  error?: string;
  reason?: string;
  retryable?: boolean;
  runtimeVersion?: string;
};

export default function ResultV2() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const debug = params.get("debug") === "1";
  const [order, setOrder] = useState<OneToOneOrderDraft | null>(null);
  const [snapshot, setSnapshot] = useState<CompatibilityCalculationSnapshot | null>(null);
  const [content, setContent] = useState<DetailedReportContent | null>(null);
  const [facts, setFacts] = useState<PaidReportFacts | null>(null);
  const [progressMeta, setProgressMeta] = useState<ReportProgress["metas"] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [progressStep, setProgressStep] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      void (async () => {
        let progress = loadReportProgress(paymentId, draft.createdAt) ?? emptyReportProgress(paymentId, draft.createdAt);
        setProgressStep(completedCount(progress));

        const cachedContent = assembleContent(progress);
        if (cachedContent && progress.snapshot && progress.facts) {
          if (cancelled) return;
          setSnapshot(progress.snapshot);
          setFacts(progress.facts);
          setProgressMeta(progress.metas);
          setContent(cachedContent);
          setStatus("ready");
          return;
        }

        for (const segment of SEGMENTS) {
          if (cancelled) return;
          if (progress.segments[segment]) {
            setProgressStep(completedCount(progress));
            continue;
          }

          let attempts = 0;
          while (!cancelled && !progress.segments[segment]) {
            attempts += 1;
            try {
              const response = await fetch("/api/compatibility/one-to-one/segment", {
                method: "POST",
                headers: { "content-type": "application/json" },
                cache: "no-store",
                body: JSON.stringify({ paymentId: draft.paymentId, input: draft.inputSnapshot, segment }),
              });
              const payload = await response.json().catch(() => null) as SegmentApiPayload | null;

              if (response.ok && payload?.ok && payload.segmentContent && payload.snapshot && payload.reportFacts) {
                assignSegment(progress, segment, payload.segmentContent, payload.segmentMeta ?? null);
                progress.snapshot = payload.snapshot;
                progress.facts = payload.reportFacts;
                saveReportProgress(progress);
                setProgressStep(completedCount(progress));
                setRetryCount(0);
                break;
              }

              if (payload && payload.retryable === false) {
                const permanentMessage = payload.reason ? PERMANENT_FAILURE_LABELS[payload.reason] : null;
                throw new Error(`PERMANENT:${permanentMessage ?? payload.error ?? "리포트 생성 설정을 확인해야 해요."}`);
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : "";
              if (message.startsWith("PERMANENT:")) {
                if (cancelled) return;
                setErrorMessage(message.slice("PERMANENT:".length));
                setStatus("error");
                return;
              }
            }

            if (cancelled) return;
            setRetryCount((value) => value + 1);
            const backoff = Math.min(30_000, 2_000 * Math.max(1, Math.min(attempts, 15)));
            await sleep(backoff);
          }
        }

        if (cancelled) return;
        progress = loadReportProgress(paymentId, draft.createdAt) ?? progress;
        const finalContent = assembleContent(progress);
        if (!finalContent || !progress.snapshot || !progress.facts) return;
        setSnapshot(progress.snapshot);
        setFacts(progress.facts);
        setProgressMeta(progress.metas);
        setContent(finalContent);
        setStatus("ready");
      })();
    });

    return () => { cancelled = true; };
  }, [paymentId]);

  const visibleDimensions = useMemo(() => {
    if (!snapshot) return [];
    return (Object.entries(snapshot.dimensions) as Array<[CompatibilityDimension, CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension]]>)
      .filter(([dimension, value]) => value.maxPoints > 0 && dimension !== "luckCycleAlignment");
  }, [snapshot]);

  if (status === "missing") return <main className="v2-page"><div className="v2-state"><h1>결제 결과를 불러올 입력정보가 없어요.</h1><p>결제 자체는 사라지지 않았어요. 아래에서 두 사람의 정보만 다시 입력하면 기존 결제로 결과를 복구할 수 있어요.</p>{paymentId ? <Link href={`/one-to-one?recoverPaymentId=${encodeURIComponent(paymentId)}`} className="primary-link">결제 없이 입력정보 다시 넣기</Link> : <Link href="/one-to-one">1:1 입력으로 돌아가기</Link>}</div></main>;

  if (status === "loading") return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리궁합</p><h1>두 사람의 상세 리포트를 계속 작성하고 있어요.</h1><p>전체 3단계 중 <strong>{progressStep}단계</strong>가 완료됐어요. 오래 걸려도 완료된 구간은 저장되며, 일시적인 지연이나 네트워크 오류가 생기면 자동으로 다시 이어서 작성합니다.</p><p>새로고침하거나 다시 들어와도 같은 브라우저에서는 완료된 단계부터 이어집니다.{retryCount > 0 ? ` 현재 자동 재시도 ${retryCount}회째예요.` : ""}</p></div></main>;

  if (status === "error" || !order) return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리궁합</p><h1>리포트 생성 설정을 확인해야 해요.</h1><p>{errorMessage ?? "결제·API 설정처럼 자동 재시도로 해결되지 않는 문제가 확인됐어요."}</p></div></main>;

  if (!snapshot || !content || !facts) return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리궁합</p><h1>두 사람의 상세 리포트를 계속 작성하고 있어요.</h1><p>완료된 부분부터 이어서 작성 중입니다.</p></div></main>;

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

    {debug && progressMeta && <section className="v2-debug"><strong>QA debug</strong><pre>{JSON.stringify({ segmentMeta: progressMeta, scoringVersion: snapshot.scoringVersion, engineVersion: snapshot.engineVersion }, null, 2)}</pre></section>}
    <footer className="v2-footer"><Link href="/one-to-one">다른 사람과 다시 보기</Link><Link href="/">처음으로</Link></footer>
  </div></main>;
}
