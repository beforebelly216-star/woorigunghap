"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import type { CompatibilityNarrative } from "@/lib/narrative/engine";
import { loadOrderDraft } from "@/lib/order-storage";
import type { OneToOneOrderDraft } from "@/lib/orders";
import { RELATIONSHIP_LABELS, type RelationshipType } from "@/lib/report-input";

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

const FLOW_TITLES: Record<RelationshipType, [string, string, string]> = {
  crush: ["끌림 포인트", "다가가는 흐름", "주의할 지점"],
  flirting: ["썸의 흐름", "거리 좁히는 포인트", "주의할 지점"],
  lover: ["관계의 중심축", "서로를 채우는 방식", "갈등 조율 포인트"],
  friend: ["친구 케미", "함께할 때 좋은 점", "주의할 지점"],
  coworker: ["협업 흐름", "업무 시너지", "조율할 지점"],
};

const DEMO_ORDER: OneToOneOrderDraft = {
  version: "order-draft-v1",
  orderId: "day7-demo-order",
  paymentId: "day7-demo-payment",
  product: "oneToOne",
  amount: 1000,
  status: "draft",
  createdAt: "2026-08-12T00:00:00.000Z",
  inputSnapshot: {
    relationshipType: "lover",
    personA: {
      displayName: "나",
      gender: "male",
      calendarType: "solar",
      birthDate: "1990-05-15",
      birthTimeKnown: true,
      birthTime: "14:30",
      isLeapMonth: false,
    },
    personB: {
      displayName: "상대",
      gender: "female",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTimeKnown: true,
      birthTime: "05:30",
      isLeapMonth: false,
    },
  },
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
  const isDemo = params.get("demo") === "1";
  const [order, setOrder] = useState<OneToOneOrderDraft | null>(null);
  const [snapshot, setSnapshot] = useState<CompatibilityCalculationSnapshot | null>(null);
  const [narrative, setNarrative] = useState<CompatibilityNarrative | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isDemo && !paymentId) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const draft = isDemo ? DEMO_ORDER : loadOrderDraft(paymentId!);
      if (!draft) {
        setStatus("missing");
        return;
      }
      setOrder(draft);

      const request = isDemo
        ? fetch("/api/compatibility/one-to-one/demo")
        : fetch("/api/compatibility/one-to-one", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              paymentId: draft.paymentId,
              input: draft.inputSnapshot,
            }),
          });

      void request
        .then(async (response) => {
          const payload = await response.json() as {
            snapshot?: CompatibilityCalculationSnapshot;
            narrative?: CompatibilityNarrative;
            error?: string;
          };
          if (!response.ok || !payload.snapshot || !payload.narrative) {
            throw new Error(payload.error ?? "궁합 결과를 계산하지 못했어요.");
          }
          if (cancelled) return;
          setSnapshot(payload.snapshot);
          setNarrative(payload.narrative);
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
  }, [isDemo, paymentId]);

  const visibleDimensions = useMemo(() => {
    if (!snapshot) return [];
    return (Object.entries(snapshot.dimensions) as Array<[
      CompatibilityDimension,
      CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension],
    ]>).filter(([, value]) => value.maxPoints > 0);
  }, [snapshot]);

  if ((!isDemo && !paymentId) || status === "missing") {
    return <MissingOrderState />;
  }

  if (status === "loading") {
    return <div className="report-state"><p className="eyebrow">우리궁합</p><h1>궁합을 계산하고 있어요.</h1><p>결제 상태를 확인한 뒤 두 사람의 명식을 비교하고 리포트를 정리하고 있어요.</p></div>;
  }

  if (!order) {
    return <MissingOrderState />;
  }

  if (status === "error" || !snapshot || !narrative) {
    return <div className="report-state"><p className="eyebrow">우리궁합</p><h1>결과를 열 수 없어요.</h1><p>{errorMessage ?? "결제 상태와 입력 정보를 다시 확인해 주세요."}</p><Link href="/one-to-one" className="primary-link">입력 화면으로 돌아가기</Link></div>;
  }

  const { personA, personB, relationshipType } = order.inputSnapshot;
  const hasUnknownTime = !personA.birthTimeKnown || !personB.birthTimeKnown;
  const grade = gradeFor(snapshot.score);
  const flowTitles = FLOW_TITLES[relationshipType];
  const flowCards = [
    { title: flowTitles[0], body: narrative.flow.primary },
    { title: flowTitles[1], body: narrative.flow.secondary },
    { title: flowTitles[2], body: narrative.flow.caution },
  ];
  const strengthCopies = [narrative.strengths.first, narrative.strengths.second];
  const adjustmentCopies = [narrative.adjustments.first, narrative.adjustments.second];
  const practicalGuides = [
    narrative.practicalGuide.first,
    narrative.practicalGuide.second,
    narrative.practicalGuide.third,
  ];

  return (
    <main className="report-page">
      <div className="report-shell">
        <header className="report-hero">
          <p className="eyebrow">{isDemo ? "샘플 · " : ""}{RELATIONSHIP_LABELS[relationshipType]} 궁합 리포트</p>
          <h1>{personA.displayName} <span>×</span> {personB.displayName}</h1>
          <p className="report-summary"><strong>{narrative.headline}</strong><br />{narrative.summary}</p>

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

        <section className="report-section">
          <div className="section-heading">
            <p className="card-label">Relationship flow</p>
            <h2>{RELATIONSHIP_LABELS[relationshipType]} 관계의 흐름</h2>
            <p>서버가 확정한 계산값을 바꾸지 않고, 계산 근거를 읽기 쉬운 문장으로 정리한 영역이에요.</p>
          </div>
          <div className="flow-grid">
            {flowCards.map((card) => (
              <article className="flow-card" key={card.title}>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="report-section insight-section">
          <div className="insight-card strength-card">
            <p className="card-label">Strength</p>
            <h2>두 사람의 강점</h2>
            <div className="insight-list">
              {snapshot.strengths.map((dimension, index) => (
                <div key={dimension}>
                  <strong>{DIMENSION_LABELS[dimension]}</strong>
                  <span>{strengthCopies[index] ?? DIMENSION_COPY[dimension]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="insight-card adjustment-card">
            <p className="card-label">Adjustment</p>
            <h2>조율하면 좋은 지점</h2>
            <div className="insight-list">
              {snapshot.adjustmentPoints.map((dimension, index) => (
                <div key={dimension}>
                  <strong>{DIMENSION_LABELS[dimension]}</strong>
                  <span>{adjustmentCopies[index] ?? "서로의 차이를 의식하고 구체적인 기대치를 맞춰 보세요."}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-section">
          <div className="section-heading">
            <p className="card-label">Practical guide</p>
            <h2>지금 관계에 써먹는 가이드</h2>
          </div>
          <div className="guide-list">
            {practicalGuides.map((guide, index) => (
              <div key={`${index}-${guide}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{guide}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="report-method-note">
          <strong>점수는 어떻게 만들었나요?</strong>
          <p>만세력과 궁합 점수는 서버의 규칙 엔진이 계산하며 AI가 점수를 바꾸지 않아요. AI는 확정된 점수와 핵심 근거를 사용자용 문장으로 정리하는 역할만 해요. AI가 실패해도 같은 계산값을 사용하는 기본 템플릿으로 자동 전환돼요.</p>
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
