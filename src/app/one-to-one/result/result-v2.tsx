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
  PaidReportSegmentMeta,
  PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import { loadOrderDraft, saveOrderDraft } from "@/lib/order-storage";
import type { OneToOneOrderDraft } from "@/lib/orders";
import { ReportAccountLink } from "@/components/report-account-link";
import {
  emptyReportProgress,
  loadReportProgress,
  saveReportProgress,
  type ReportProgress,
} from "@/lib/report-progress-storage";
import { COWORKER_HIERARCHY_LABELS, RELATIONSHIP_LABELS } from "@/lib/report-input";
import {
  buildOneToOneResultUrl,
  isResultAccessToken,
} from "@/lib/result-access-token";
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
const MAX_TOTAL_WAIT_MS = 240_000;
const MAX_TRANSIENT_FAILURES = 2;
const MAX_ACCOUNT_RESUME_ATTEMPTS = 4;
const STAGE_COPY: Record<"prepare" | PaidReportSegmentName, string> = {
  prepare: "결제와 궁합 점수를 확인하고 있어요.",
  intro: "1~3장 · 두 사람의 사주와 관계 성향을 풀어 쓰고 있어요.",
  dynamics: "4~6장 · 기본 케미와 실제 결속·마찰을 분석하고 있어요.",
  action: "7~10장 · 관계 흐름과 갈등 대응·실전 매뉴얼을 만들고 있어요.",
};

class FatalGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalGenerationError";
  }
}

function gradeFor(score: number) {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  if (score >= 40) return "E";
  return "F";
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function retryDelay(attempt: number) {
  return Math.min(5_000, 1_200 * 2 ** Math.min(3, Math.max(0, attempt - 1)));
}

function completeContent(progress: Pick<ReportProgress, "segments">): DetailedReportContent | null {
  const { intro, dynamics, action } = progress.segments;
  if (!intro || !dynamics || !action) return null;
  return { ...intro, ...dynamics, ...action };
}

type RecoveryPayload = {
  order?: OneToOneOrderDraft;
  progress?: {
    paymentId: string;
    snapshot: CompatibilityCalculationSnapshot | null;
    facts: PaidReportFacts | null;
    segments: ReportProgress["segments"];
    metas: ReportProgress["metas"];
    updatedAt: string;
  } | null;
};

type DisplayOneToOneOrder = Omit<OneToOneOrderDraft, "resultAccessToken"> & {
  resultAccessToken?: string;
};

type AccountReportPayload = {
  product?: "oneToOne" | "oneToMany";
  order?: DisplayOneToOneOrder;
  progress?: RecoveryPayload["progress"];
  error?: string;
};

type ResumePayload = {
  status?: "generating" | "ready";
  completedSegments?: number;
  retryable?: boolean;
  error?: string;
};

function accessTokenFromFragment() {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.hash.slice(1)).get("accessToken");
  return isResultAccessToken(token) ? token : null;
}

function saveRecoveredProgress(order: OneToOneOrderDraft, payload: RecoveryPayload) {
  if (!payload.progress) return;
  saveReportProgress({
    version: "report-progress-v7-1",
    paymentId: order.paymentId,
    orderCreatedAt: order.createdAt,
    snapshot: payload.progress.snapshot,
    facts: payload.progress.facts,
    segments: payload.progress.segments,
    metas: payload.progress.metas,
    updatedAt: payload.progress.updatedAt,
  });
}

export default function ResultV2() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const accountSource = params.get("source") === "account";
  const debug = params.get("debug") === "1";
  const [order, setOrder] = useState<DisplayOneToOneOrder | null>(null);
  const [snapshot, setSnapshot] = useState<CompatibilityCalculationSnapshot | null>(null);
  const [content, setContent] = useState<DetailedReportContent | null>(null);
  const [facts, setFacts] = useState<PaidReportFacts | null>(null);
  const [segmentMetas, setSegmentMetas] = useState<Partial<Record<PaidReportSegmentName, PaidReportSegmentMeta>>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "fatal">("loading");
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);
  const [stage, setStage] = useState<"prepare" | PaidReportSegmentName>("prepare");
  const [stageAttempt, setStageAttempt] = useState(1);
  const [completedSegments, setCompletedSegments] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [accountOwned, setAccountOwned] = useState(false);

  useEffect(() => {
    if (status !== "loading") return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    const generationDeadline = Date.now() + MAX_TOTAL_WAIT_MS;
    let accountResumeAttempts = 0;

    function ensureWithinDeadline() {
      if (Date.now() >= generationDeadline) {
        throw new FatalGenerationError("생성이 예상보다 오래 걸리고 있어요. 결제는 유지되며 보관함에서 마지막 저장 단계부터 다시 이어서 만들 수 있습니다.");
      }
    }

    async function postPhase<T>(
      draft: OneToOneOrderDraft,
      phase: "prepare" | PaidReportSegmentName,
    ): Promise<T> {
      let attempt = 0;
      let transientFailures = 0;

      while (!cancelled) {
        ensureWithinDeadline();
        attempt += 1;
        setStage(phase);
        setStageAttempt(attempt);

        try {
          const response = await fetch("/api/compatibility/one-to-one", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              paymentId: draft.paymentId,
              accessToken: draft.resultAccessToken,
              input: draft.inputSnapshot,
              phase,
            }),
            cache: "no-store",
          });
          const payload = await response.json().catch(() => null) as ({
            error?: string;
            code?: string;
            reason?: string;
            retryable?: boolean;
          } & T) | null;

          if (response.ok && payload) return payload;

          if (payload?.code === "REPORT_GENERATION_IN_PROGRESS") {
            await wait(2_500);
            continue;
          }

          const transient = payload?.retryable === true
            || response.status === 429
            || response.status >= 500;

          if (!transient) {
            throw new FatalGenerationError(payload?.error ?? "상세 리포트 생성 설정을 확인해야 합니다.");
          }

          transientFailures += 1;
          if (transientFailures >= MAX_TRANSIENT_FAILURES) {
            throw new FatalGenerationError(payload?.error ?? "생성이 지연되고 있어요. 보관함에서 다시 이어서 만들 수 있습니다.");
          }
        } catch (error) {
          if (error instanceof FatalGenerationError) throw error;
          transientFailures += 1;
          if (transientFailures >= MAX_TRANSIENT_FAILURES) {
            throw new FatalGenerationError("네트워크 또는 생성 서버 응답이 지연되고 있어요. 결제는 유지되며 보관함에서 다시 이어서 만들 수 있습니다.");
          }
        }

        if (cancelled) throw new Error("CANCELLED");
        ensureWithinDeadline();
        await wait(retryDelay(transientFailures));
      }

      throw new Error("CANCELLED");
    }

    async function run() {
      if (!paymentId) {
        setStatus("missing");
        return;
      }

      if (accountSource) {
        try {
          ensureWithinDeadline();
          const response = await fetch(`/api/account/reports/${encodeURIComponent(paymentId)}`, {
            cache: "no-store",
            referrerPolicy: "no-referrer",
          });
          const payload = await response.json().catch(() => null) as AccountReportPayload | null;
          const recoveredContent = payload?.progress ? completeContent(payload.progress) : null;
          if (
            response.ok
            && payload?.product === "oneToOne"
            && payload.order
            && payload.progress?.snapshot
            && payload.progress.facts
            && recoveredContent
          ) {
            setOrder(payload.order);
            setSnapshot(payload.progress.snapshot);
            setFacts(payload.progress.facts);
            setContent(recoveredContent);
            setSegmentMetas(payload.progress.metas);
            setCompletedSegments(3);
            setAccountOwned(true);
            setStatus("ready");
            return;
          }

          if (response.status === 401) {
            setFatalMessage("이 보관함 결과를 열려면 다시 로그인해 주세요.");
            setStatus("fatal");
            return;
          }

          if (response.status === 404 && accountResumeAttempts < MAX_ACCOUNT_RESUME_ATTEMPTS) {
            accountResumeAttempts += 1;
            setStageAttempt(accountResumeAttempts);
            const resumeResponse = await fetch(`/api/account/reports/${encodeURIComponent(paymentId)}/resume`, {
              method: "POST",
              cache: "no-store",
              referrerPolicy: "no-referrer",
            });
            const resumePayload = await resumeResponse.json().catch(() => null) as ResumePayload | null;
            if (typeof resumePayload?.completedSegments === "number") {
              setCompletedSegments(Math.min(3, Math.max(0, resumePayload.completedSegments)));
            }
            if (resumeResponse.ok || resumeResponse.status === 202 || resumePayload?.retryable === true) {
              ensureWithinDeadline();
              await wait(2_000);
              if (!cancelled) void run();
              return;
            }
            throw new FatalGenerationError(resumePayload?.error ?? "보관함 결과 생성을 이어서 시작하지 못했습니다.");
          }

          throw new FatalGenerationError(
            payload?.error ?? "생성이 지연되고 있어요. 보관함에서 잠시 후 다시 열면 저장된 단계부터 이어서 만들 수 있습니다.",
          );
        } catch (error) {
          if (cancelled) return;
          setFatalMessage(error instanceof FatalGenerationError
            ? error.message
            : "보관함에서 결과 생성을 이어서 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setStatus("fatal");
          return;
        }
      }

      const storedDraft = loadOrderDraft(paymentId);
      let draft: OneToOneOrderDraft | null = storedDraft?.product === "oneToOne" ? storedDraft : null;
      if (!draft) {
        const accessToken = accessTokenFromFragment();
        if (accessToken) {
          try {
            const response = await fetch("/api/reports/one-to-one/recover", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ paymentId, accessToken }),
              cache: "no-store",
              referrerPolicy: "no-referrer",
            });
            const payload = await response.json().catch(() => null) as RecoveryPayload | null;
            if (response.ok && payload?.order) {
              draft = payload.order;
              saveOrderDraft(draft);
              saveRecoveredProgress(draft, payload);
            }
          } catch {
            // The manual paid-order recovery path remains available below.
          }
        }
        if (!draft) {
          setStatus("missing");
          return;
        }
      }
      const shareableUrl = buildOneToOneResultUrl(draft.paymentId, draft.resultAccessToken);
      window.history.replaceState(null, "", shareableUrl);
      setOrder(draft);
      setStatus("loading");
      setFatalMessage(null);

      let progress = loadReportProgress(draft.paymentId, draft.createdAt)
        ?? emptyReportProgress(draft.paymentId, draft.createdAt);

      const cachedContent = completeContent(progress);
      if (progress.snapshot && progress.facts && cachedContent) {
        setSnapshot(progress.snapshot);
        setFacts(progress.facts);
        setContent(cachedContent);
        setSegmentMetas(progress.metas);
        setCompletedSegments(3);
        setStatus("ready");
        return;
      }

      try {
        if (!progress.snapshot || !progress.facts) {
          const prepared = await postPhase<{
            snapshot: CompatibilityCalculationSnapshot;
            reportFacts: PaidReportFacts;
          }>(draft, "prepare");
          if (cancelled) return;
          progress = {
            ...progress,
            snapshot: prepared.snapshot,
            facts: prepared.reportFacts,
          };
          saveReportProgress(progress);
        }

        if (cancelled) return;
        setSnapshot(progress.snapshot);
        setFacts(progress.facts);

        for (const segment of SEGMENTS) {
          if (progress.segments[segment]) {
            setCompletedSegments((current) => Math.max(current, SEGMENTS.indexOf(segment) + 1));
            continue;
          }

          const generated = await postPhase<{
            segmentContent: IntroSegment | DynamicsSegment | ActionSegment;
            segmentMeta: PaidReportSegmentMeta;
          }>(draft, segment);
          if (cancelled) return;

          if (segment === "intro") progress.segments.intro = generated.segmentContent as IntroSegment;
          if (segment === "dynamics") progress.segments.dynamics = generated.segmentContent as DynamicsSegment;
          if (segment === "action") progress.segments.action = generated.segmentContent as ActionSegment;
          progress.metas[segment] = generated.segmentMeta;
          saveReportProgress(progress);
          setCompletedSegments(SEGMENTS.indexOf(segment) + 1);
          setSegmentMetas({ ...progress.metas });
        }

        const finalContent = completeContent(progress);
        if (!finalContent || !progress.snapshot || !progress.facts) {
          throw new FatalGenerationError("완성된 리포트를 조립하지 못했습니다.");
        }

        setSnapshot(progress.snapshot);
        setFacts(progress.facts);
        setContent(finalContent);
        setSegmentMetas(progress.metas);
        setStatus("ready");
      } catch (error) {
        if (cancelled || (error instanceof Error && error.message === "CANCELLED")) return;
        setFatalMessage(error instanceof FatalGenerationError
          ? error.message
          : "생성이 지연되고 있어요. 결제는 유지되며 보관함에서 다시 이어서 만들 수 있습니다.");
        setStatus("fatal");
      }
    }

    queueMicrotask(() => {
      if (!cancelled) void run();
    });

    return () => {
      cancelled = true;
    };
  }, [accountSource, paymentId]);

  const visibleDimensions = useMemo(() => {
    if (!snapshot) return [];
    return (Object.entries(snapshot.dimensions) as Array<[CompatibilityDimension, CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension]]>)
      .filter(([, value]) => value.maxPoints > 0);
  }, [snapshot]);

  if (status === "missing") return <main className="v2-page"><div className="v2-state"><h1>결제 결과를 불러올 입력정보가 없어요.</h1><p>결제 자체는 사라지지 않았어요. 같은 브라우저의 원래 결제 탭이 있으면 그 탭을 다시 열어 주세요. 없으면 아래에서 두 사람의 정보만 다시 입력해 기존 결제로 결과를 복구할 수 있어요.</p>{paymentId ? <Link href={`/one-to-one?recoverPaymentId=${encodeURIComponent(paymentId)}`} className="primary-link">결제 없이 입력정보 다시 넣기</Link> : <Link href="/one-to-one">1:1 입력으로 돌아가기</Link>}</div></main>;

  if (status === "loading") return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리궁합</p><h1>상세 리포트를 만들고 있어요.</h1><p>{STAGE_COPY[stage]}</p><p>{completedSegments}/3개 해설 묶음 완료 · {elapsedSeconds}초 경과</p>{stageAttempt > 1 ? <p>일시적인 지연을 다시 확인하고 있어요. 전체 대기는 최대 약 4분까지만 진행하며, 그 이후에도 결제는 유지되고 보관함에서 이어서 만들 수 있습니다.</p> : <p>창을 닫아도 결제와 이미 저장된 생성 단계는 유지됩니다. 오래 걸리면 보관함에서 이어서 만들 수 있어요.</p>}</div></main>;

  if (status === "fatal" && accountSource) return <main className="v2-page"><div className="v2-state">
    <p className="v2-kicker">내 궁합 보관함</p>
    <h1>결과 생성이 지연되고 있어요.</h1>
    <p>{fatalMessage ?? "로그인 상태와 결과 소유권을 다시 확인해 주세요."}</p>
    <button type="button" className="secondary-action" onClick={() => window.location.reload()}>저장된 단계부터 다시 이어서 만들기</button>
    <Link href="/account/reports">보관함으로 돌아가기</Link>
  </div></main>;

  if (status === "fatal" || !order || !snapshot || !content || !facts) return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리궁합</p><h1>결과 생성이 잠시 지연되고 있어요.</h1><p>{fatalMessage ?? "생성 서버 상태를 확인한 뒤 다시 이어서 만들 수 있습니다."}</p><p>결제는 다시 하지 않아도 되고, 이미 저장된 해설 묶음은 유지됩니다.</p><Link href="/account/reports" className="primary-link">보관함에서 상태 확인하기</Link></div></main>;

  const { personA, personB, relationshipType } = order.inputSnapshot;
  const relationshipLabel = RELATIONSHIP_LABELS[relationshipType];
  const coworkerHierarchyLabel = relationshipType === "coworker" && order.inputSnapshot.coworkerHierarchy
    ? COWORKER_HIERARCHY_LABELS[order.inputSnapshot.coworkerHierarchy]
    : null;
  return <main className="v2-page"><div className="v2-shell">
    <header className="v2-hero">
      <p className="v2-kicker">{relationshipLabel}{coworkerHierarchyLabel ? ` · ${coworkerHierarchyLabel}` : ""} 궁합 리포트</p>
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
    <ReportChaptersB
      content={content}
      personAName={personA.displayName}
      personBName={personB.displayName}
      relationshipLabel={relationshipLabel}
      threeYearTiming={snapshot.threeYearTiming}
    />

    <ReportAccountLink
      paymentId={order.paymentId}
      accessToken={order.resultAccessToken ?? null}
      alreadyClaimed={accountOwned}
    />

    {debug && <section className="v2-debug"><strong>QA debug</strong><pre>{JSON.stringify({ segmentMetas, scoringVersion: snapshot.scoringVersion, engineVersion: snapshot.engineVersion, threeYearTiming: snapshot.threeYearTiming }, null, 2)}</pre></section>}
    <footer className="v2-footer"><Link href="/one-to-one">다른 사람과 다시 보기</Link><Link href="/">처음으로</Link></footer>
  </div></main>;
}
