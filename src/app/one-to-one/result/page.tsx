"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToOneOrderDraft } from "@/lib/orders";
import { RELATIONSHIP_LABELS } from "@/lib/report-input";

const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "일간 상성",
  dayBranch: "일지 상성",
  usefulGodFit: "용신·기신 부합",
  elementComplementarity: "오행 상보성",
  heavenlyStemInteraction: "천간 합충",
  earthlyBranchInteraction: "지지 형충파해",
  specialStars: "신살·귀인·공망",
  spouseStarRealization: "배우자성 실체화",
  luckCycleAlignment: "대운 동조",
};

const DIMENSION_COPY: Record<CompatibilityDimension, string> = {
  dayMaster: "두 사람의 기본 기운이 만나는 방식이에요.",
  dayBranch: "가까워졌을 때 드러나는 생활·정서 리듬을 봐요.",
  usefulGodFit: "서로가 상대에게 필요한 기운을 얼마나 보완하는지 봐요.",
  elementComplementarity: "두 원국의 오행 편중이 함께 있을 때 얼마나 보완되는지 봐요.",
  heavenlyStemInteraction: "겉으로 드러나는 결속과 긴장 신호를 비교해요.",
  earthlyBranchInteraction: "관계 속 반복적인 결속·마찰 신호를 종합해요.",
  specialStars: "MVP에서는 천을귀인 신호를 보수적으로 반영해요.",
  spouseStarRealization: "연애 관계에서 서로의 관계 역할 기운이 얼마나 맞물리는지 봐요.",
  luckCycleAlignment: "대운 계산은 후속 버전에서 정밀화하며 현재는 중립값을 사용해요.",
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

function summaryFor(score: number) {
  if (score >= 85) return "서로의 강점을 자연스럽게 살리기 좋은 조합이에요.";
  if (score >= 75) return "전반적인 호흡이 좋은 편이고, 몇 가지 차이만 조율하면 좋아요.";
  if (score >= 65) return "잘 맞는 지점과 조율할 지점이 함께 있는 균형형 궁합이에요.";
  if (score >= 55) return "차이가 분명하지만 서로의 방식을 이해하면 관계의 여지가 있어요.";
  return "마찰 가능성이 비교적 커서 관계의 규칙과 거리 조절이 중요해요.";
}

function confidenceLabel(value: CompatibilityCalculationSnapshot["confidence"]) {
  return value === "high" ? "높음" : value === "medium" ? "보통" : "낮음";
}

function MissingOrderState() {
  return (
    <div className="report-state">
      <p className="eyebrow">우리궁합</p>
      <h1>주문 정보를 찾지 못했어요.</h1>
      <p>같은 브라우저 탭에서 입력 화면부터 다시 시작해 주세요.</p>
      <Link href="/one-to-one" className="primary-link">1:1 궁합 다시 입력하기</Link>
    </div>
  );
}

function ResultContent() {
  const params = useSearchParams();
  const paymentId = params.get("paymentId");
  const [order, setOrder] = useState<OneToOneOrderDraft | null>(null);
  const [snapshot, setSnapshot] = useState<CompatibilityCalculationSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const draft = loadOrderDraft(paymentId);
      if (!draft) {
        setStatus("missing");
        return;
      }
      setOrder(draft);

      void fetch("/api/compatibility/one-to-one", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft.inputSnapshot),
      })
        .then(async (response) => {
          const payload = await response.json() as {
            snapshot?: CompatibilityCalculationSnapshot;
            error?: string;
          };
          if (!response.ok || !payload.snapshot) {
            throw new Error(payload.error ?? "궁합 결과를 계산하지 못했어요.");
          }
          if (cancelled) return;
          setSnapshot(payload.snapshot);
          setStatus("ready");
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setErrorMessage(error instanceof Error ? error.message : "궁합 결과를 계산하지 못했어요.");
          setStatus("error");
        });
    });

    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const visibleDimensions = useMemo(() => {
    if (!snapshot) return [];
    return (Object.entries(snapshot.dimensions) as Array<[
      CompatibilityDimension,
      CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension],
    ]>).filter(([, value]) => value.maxPoints > 0);
  }, [snapshot]);

  if (!paymentId || status === "missing") {
    return <MissingOrderState />;
  }

  if (status === "loading") {
    return <div className="report-state"><p className="eyebrow">우리궁합</p><h1>궁합을 계산하고 있어요.</h1><p>두 사람의 명식을 비교해 9개 항목을 정리하는 중이에요.</p></div>;
  }

  if (!order) {
    return <MissingOrderState />;
  }

  if (status === "error" || !snapshot) {
    return <div className="report-state"><p className="eyebrow">우리궁합</p><h1>결과 계산에 실패했어요.</h1><p>{errorMessage ?? "잠시 후 다시 시도해 주세요."}</p><Link href={`/one-to-one/checkout?paymentId=${encodeURIComponent(order.paymentId)}`} className="primary-link">주문 확인으로 돌아가기</Link></div>;
  }

  const { personA, personB, relationshipType } = order.inputSnapshot;
  const hasUnknownTime = !personA.birthTimeKnown || !personB.birthTimeKnown;
  const grade = gradeFor(snapshot.score);

  return (
    <main className="report-page">
      <div className="report-shell">
        <header className="report-hero">
          <p className="eyebrow">{RELATIONSHIP_LABELS[relationshipType]} 궁합 리포트</p>
          <h1>{personA.displayName} <span>×</span> {personB.displayName}</h1>
          <p className="report-summary">{summaryFor(snapshot.score)}</p>

          <div className="score-hero-card">
            <div>
              <span className="score-grade">{grade}</span>
              <strong className="score-number">{snapshot.score}</strong>
              <span className="score-unit">/ 100</span>
            </div>
            <p>관계 프로필 <strong>{RELATIONSHIP_LABELS[relationshipType]}</strong> 기준 종합점수</p>
          </div>

          <div className={`confidence-banner confidence-${snapshot.confidence}`}>
            <strong>계산 신뢰도 {confidenceLabel(snapshot.confidence)}</strong>
            {hasUnknownTime ? (
              <span>출생시간 미상 시나리오 {snapshot.scenarioPolicy.pairScenarios.toLocaleString("ko-KR")}개를 비교했어요. 예상 점수 범위는 {snapshot.uncertaintyRange.min}~{snapshot.uncertaintyRange.max}점이에요.</span>
            ) : (
              <span>두 사람의 입력 시간이 모두 확정되어 현재 입력 기준 변동폭은 {snapshot.uncertaintyRange.width}점이에요.</span>
            )}
          </div>
        </header>

        <section className="report-section">
          <div className="section-heading">
            <p className="card-label">Compatibility breakdown</p>
            <h2>9개 항목으로 본 두 사람</h2>
            <p>카드 점수는 각 항목을 0~100으로 정규화한 값이고, 종합점수에는 관계 유형별 배점이 따로 적용돼요.</p>
          </div>

          <div className="score-card-grid">
            {visibleDimensions.map(([dimension, value]) => (
              <article className="dimension-card" key={dimension}>
                <div className="dimension-card-head">
                  <div>
                    <span>{DIMENSION_LABELS[dimension]}</span>
                    <strong>{Math.round(value.normalizedScore)}</strong>
                  </div>
                  <small>배점 {value.weightedPoints.toFixed(1)} / {value.maxPoints}</small>
                </div>
                <div className="score-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, value.normalizedScore))}%` }} /></div>
                <p>{DIMENSION_COPY[dimension]}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="report-section insight-section">
          <div className="insight-card strength-card">
            <p className="card-label">Strength</p>
            <h2>두 사람의 강점</h2>
            <div className="insight-list">
              {snapshot.strengths.map((dimension) => (
                <div key={dimension}>
                  <strong>{DIMENSION_LABELS[dimension]}</strong>
                  <span>{DIMENSION_COPY[dimension]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="insight-card adjustment-card">
            <p className="card-label">Adjustment</p>
            <h2>조율하면 좋은 지점</h2>
            <div className="insight-list">
              {snapshot.adjustmentPoints.map((dimension) => (
                <div key={dimension}>
                  <strong>{DIMENSION_LABELS[dimension]}</strong>
                  <span>이 영역은 서로의 차이를 의식하고 대화의 규칙을 만들수록 관계가 편해져요.</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-method-note">
          <strong>점수는 어떻게 만들었나요?</strong>
          <p>만세력과 궁합 점수는 서버의 규칙 엔진이 계산하며 AI가 점수를 바꾸지 않아요. 이 점수는 관계의 성공확률이 아니라 사주 원국 규칙에 따른 참고용 관계 적합도예요.</p>
          <small>scoring {snapshot.scoringVersion} · engine {snapshot.engineVersion}</small>
        </section>

        <div className="report-actions">
          <Link href="/one-to-one" className="secondary-link">다른 사람과 다시 보기</Link>
          <Link href="/" className="primary-link">처음으로</Link>
        </div>
      </div>
    </main>
  );
}

export default function OneToOneResultPage() {
  return (
    <Suspense fallback={<main className="report-page"><div className="report-state"><p>결과를 불러오는 중이에요.</p></div></main>}>
      <ResultContent />
    </Suspense>
  );
}
