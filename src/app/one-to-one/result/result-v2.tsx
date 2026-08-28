"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import type { PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import {
  mergePaidReportSegmentContents,
  type ActionSegment,
  type DynamicsSegment,
  type IntroSegment,
  type PaidReportSegmentMeta,
  type PaidReportSegmentName,
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
import { CompatibilityShareCard } from "./compatibility-share-card";
import { buildCompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";
import { normalizeStoredPaidReportForDisplay } from "@/lib/narrative/stored-report-compat";
import { calibrateCompatibilityScore, getCompatibilityScoreBand } from "@/lib/compatibility/score-scale";
import { COMPATIBILITY_SCORING_VERSION } from "@/lib/compatibility/weights";
import ReportLayoutV3 from "./report-layout-v3";

const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "일간 상성", dayBranch: "일지 상성", usefulGodFit: "필요한 기운 보완",
  elementComplementarity: "오행 상보성", heavenlyStemInteraction: "천간 합충",
  earthlyBranchInteraction: "지지 형충파해", specialStars: "귀인 신호",
  spouseStarRealization: "관계 역할 맞물림", luckCycleAlignment: "관계 타이밍",
};

const SEGMENTS: PaidReportSegmentName[] = ["intro", "dynamics", "action"];
const MAX_AUTOMATIC_FORMAT_ATTEMPTS = 2;
const STAGE_COPY: Record<"prepare" | PaidReportSegmentName, string> = {
  prepare: "결제와 궁합 점수를 확인하고 있어요.",
  intro: "1~3장 · 두 사람의 사주와 관계 성향을 풀어 쓰고 있어요.",
  dynamics: "4~6장 · 기본 케미와 실제 결속·마찰을 분석하고 있어요.",
  action: "7~10장 · 관계 흐름과 갈등 대응·실전 매뉴얼을 만들고 있어요.",
};

class FatalGenerationError extends Error {
  reason: string | null;

  constructor(message: string, reason: string | null = null) {
    super(message);
    this.name = "FatalGenerationError";
    this.reason = reason;
  }
}

function fatalGenerationTitle(reason: string | null) {
  if (reason && ["API_AUTH", "API_BILLING", "API_PERMISSION", "API_MODEL", "API_REQUEST", "AI_MODE", "API_KEY_MISSING"].includes(reason)) {
    return "리포트 생성 설정을 확인해야 해요.";
  }
  return "리포트 생성을 이번 시도에서 마치지 못했어요.";
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function retryDelay(attempt: number) {
  return Math.min(20_000, 1_500 * 2 ** Math.min(4, Math.max(0, attempt - 1)));
}

function completeContent(progress: Pick<ReportProgress, "segments">): EnhancedDetailedReportContent | null {
  const { intro, dynamics, action } = progress.segments;
  if (!intro || !dynamics || !action) return null;
  return mergePaidReportSegmentContents([intro, dynamics, action]);
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
  const [content, setContent] = useState<EnhancedDetailedReportContent | null>(null);
  const [facts, setFacts] = useState<PaidReportFacts | null>(null);
  const [segmentMetas, setSegmentMetas] = useState<Partial<Record<PaidReportSegmentName, PaidReportSegmentMeta>>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "fatal">("loading");
  const [fatalMessage, setFatalMessage] = useState<string | null>(null);
  const [fatalReason, setFatalReason] = useState<string | null>(null);
  const [stage, setStage] = useState<"prepare" | PaidReportSegmentName>("prepare");
  const [stageAttempt, setStageAttempt] = useState(1);
  const [completedSegments, setCompletedSegments] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [accountOwned, setAccountOwned] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [generationRun, setGenerationRun] = useState(0);

  useEffect(() => {
    if (status !== "ready") return;
    function updateReadingProgress() {
      const root = document.documentElement;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      setReadingProgress(Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))));
    }
    updateReadingProgress();
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress);
    return () => {
      window.removeEventListener("scroll", updateReadingProgress);
      window.removeEventListener("resize", updateReadingProgress);
    };
  }, [status]);

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

    async function postPhase<T>(
      draft: OneToOneOrderDraft,
      phase: "prepare" | PaidReportSegmentName,
    ): Promise<T> {
      let attempt = 0;

      while (!cancelled) {
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

          const reason = payload?.reason ?? payload?.code ?? null;
          const exhaustedFormatRetry = reason === "AI_FORMAT"
            && attempt >= MAX_AUTOMATIC_FORMAT_ATTEMPTS;
          const transient = !exhaustedFormatRetry && (payload?.retryable === true
            || response.status === 429
            || response.status >= 500);

          if (!transient) {
            throw new FatalGenerationError(
              payload?.error ?? "상세 리포트 생성을 완료하지 못했습니다.",
              payload?.reason ?? payload?.code ?? null,
            );
          }
        } catch (error) {
          if (error instanceof FatalGenerationError) throw error;
          // Network interruption or a platform/server timeout is retried indefinitely.
        }

        if (cancelled) throw new Error("CANCELLED");
        await wait(retryDelay(attempt));
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
          setFatalMessage(response.status === 401
            ? "이 보관함 결과를 열려면 다시 로그인해 주세요."
            : payload?.error ?? "보관함에서 결과를 불러오지 못했습니다.");
          setStatus("fatal");
          return;
        } catch {
          setFatalMessage("보관함에서 결과를 불러오지 못했습니다.");
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
      setFatalReason(null);

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
        if (error instanceof FatalGenerationError) {
          setFatalMessage(error.message);
          setFatalReason(error.reason);
          setStatus("fatal");
          return;
        }
        // Any unknown transport-level issue should keep waiting rather than show a delay error.
        setStageAttempt((current) => current + 1);
        await wait(3_000);
        if (!cancelled) void run();
      }
    }

    queueMicrotask(() => {
      if (!cancelled) void run();
    });

    return () => {
      cancelled = true;
    };
  }, [accountSource, generationRun, paymentId]);

  function retrySamePayment() {
    setFatalMessage(null);
    setFatalReason(null);
    setStage("prepare");
    setStageAttempt(1);
    setElapsedSeconds(0);
    setStatus("loading");
    setGenerationRun((current) => current + 1);
  }

  const visibleDimensions = useMemo(() => {
    if (!snapshot) return [];
    return (Object.entries(snapshot.dimensions) as Array<[CompatibilityDimension, CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension]]>)
      .filter(([, value]) => value.maxPoints > 0);
  }, [snapshot]);

  if (status === "missing") return <main className="v2-page"><div className="v2-state"><h1>결제 결과를 불러올 입력정보가 없어요.</h1><p>결제 자체는 사라지지 않았어요. 같은 브라우저의 원래 결제 탭이 있으면 그 탭을 다시 열어 주세요. 없으면 아래에서 두 사람의 정보만 다시 입력해 기존 결제로 결과를 복구할 수 있어요.</p>{paymentId ? <Link href={`/one-to-one?recoverPaymentId=${encodeURIComponent(paymentId)}`} className="primary-link">결제 없이 입력정보 다시 넣기</Link> : <Link href="/one-to-one">1:1 입력으로 돌아가기</Link>}</div></main>;

  if (status === "loading") return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리사주</p><h1>상세 리포트를 만들고 있어요.</h1><p>{STAGE_COPY[stage]}</p><p>{completedSegments}/3개 해설 묶음 완료 · {elapsedSeconds}초 경과</p>{stageAttempt > 1 ? <p>연결이 끊겨도 자동으로 이어서 시도하고 있어요. 이 화면은 완료될 때까지 계속 기다립니다.</p> : <p>첫 장문 생성은 시간이 걸릴 수 있어요. 창을 그대로 열어두면 완료될 때까지 이어서 진행합니다.</p>}</div></main>;

  if (status === "fatal" && accountSource) return <main className="v2-page"><div className="v2-state">
    <p className="v2-kicker">내 궁합 보관함</p>
    <h1>보관함 결과를 열 수 없어요.</h1>
    <p>{fatalMessage ?? "로그인 상태와 결과 소유권을 다시 확인해 주세요."}</p>
    <Link href={`/login?${new URLSearchParams({ returnTo: `/one-to-one/result?paymentId=${paymentId ?? ""}&source=account` }).toString()}`} className="primary-link">카카오 로그인 다시 하기</Link>
    <Link href="/account/reports">보관함으로 돌아가기</Link>
  </div></main>;

  if (status === "fatal" || !order || !snapshot || !content || !facts) return <main className="v2-page"><div className="v2-state"><p className="v2-kicker">우리사주</p><h1>{fatalGenerationTitle(fatalReason)}</h1><p>{fatalMessage ?? "결제 또는 API 상태를 확인해 주세요."}</p><p>결제는 다시 하지 않아도 됩니다.</p>{paymentId ? <button type="button" className="primary-link" onClick={retrySamePayment}>같은 결제로 다시 시도</button> : null}</div></main>;

  const { personA, personB, relationshipType } = order.inputSnapshot;
  const relationshipLabel = RELATIONSHIP_LABELS[relationshipType];
  const coworkerHierarchyLabel = relationshipType === "coworker" && order.inputSnapshot.coworkerHierarchy
    ? COWORKER_HIERARCHY_LABELS[order.inputSnapshot.coworkerHierarchy]
    : null;
  const displayRelationshipLabel = coworkerHierarchyLabel
    ? `${relationshipLabel} · ${coworkerHierarchyLabel}`
    : relationshipLabel;
  const publicScore = calibrateCompatibilityScore(snapshot.rawTotal);
  const scoreBand = getCompatibilityScoreBand(publicScore);
  const publicUncertaintyRange = snapshot.scoringVersion === COMPATIBILITY_SCORING_VERSION
    ? snapshot.uncertaintyRange
    : (() => {
        const min = calibrateCompatibilityScore(snapshot.uncertaintyRange.min);
        const max = calibrateCompatibilityScore(snapshot.uncertaintyRange.max);
        return { min, max, width: max - min };
      })();
  const displaySnapshot = snapshot.score === publicScore && snapshot.uncertaintyRange.min === publicUncertaintyRange.min
    ? snapshot
    : { ...snapshot, score: publicScore, uncertaintyRange: publicUncertaintyRange };
  const shareArchetype = buildCompatibilityShareArchetype(displaySnapshot);
  const displayContent = normalizeStoredPaidReportForDisplay(content, facts);

  return <main className="v2-page">
    <div className="v2-reading-progress" role="progressbar" aria-label="리포트 읽기 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readingProgress}>
      <span style={{ width: `${readingProgress}%` }} />
      <b style={{ left: `${readingProgress}%` }} aria-hidden="true">용</b>
    </div>
    <ReportLayoutV3
      personAName={personA.displayName}
      personBName={personB.displayName}
      relationshipLabel={displayRelationshipLabel}
      score={publicScore}
      scoreLabel={scoreBand.label}
      scoreDescription={scoreBand.description}
      archetypeLabel={shareArchetype.label}
      archetypeSubtitle={shareArchetype.subtitle}
      content={displayContent}
      facts={facts}
      snapshot={displaySnapshot}
      visibleDimensions={visibleDimensions}
      dimensionLabels={DIMENSION_LABELS}
      threeYearTiming={snapshot.threeYearTiming}
      shareNode={<CompatibilityShareCard
        selfName={personA.displayName}
        partnerName={personB.displayName}
        relationshipLabel={relationshipLabel}
        score={publicScore}
        archetype={shareArchetype}
      />}
      accountNode={<>
        <ReportAccountLink
          paymentId={order.paymentId}
          accessToken={order.resultAccessToken ?? null}
          alreadyClaimed={accountOwned}
        />
        <footer className="v2-footer"><Link href="/one-to-one">다른 사람과 다시 보기</Link><Link href="/">처음으로</Link></footer>
      </>}
      debugNode={debug ? <section className="v2-debug"><strong>QA debug</strong><pre>{JSON.stringify({ segmentMetas, scoringVersion: snapshot.scoringVersion, engineVersion: snapshot.engineVersion, threeYearTiming: snapshot.threeYearTiming }, null, 2)}</pre></section> : undefined}
    />
  </main>;
}
