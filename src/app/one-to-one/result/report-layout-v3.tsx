import Link from "next/link";
import type { ReactNode } from "react";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import type { PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import { ZootopiCaption } from "@/components/zootopi-mark";
import { CompatibilityHeatmap, ElementFacts, Paragraph, PillarGrid } from "./report-v2-components";
import styles from "./report-layout-v3.module.css";

function SectionHeading({ number, title, description }: { number: string; title: string; description?: string }) {
  return <div className={styles.sectionHeading}>
    <span>{number}</span>
    <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
  </div>;
}

export default function ReportLayoutV3({
  personAName,
  personBName,
  relationshipLabel,
  score,
  content,
  facts,
  visibleDimensions,
  dimensionLabels,
  dimensionEvidence,
  shareNode,
  accountNode,
  debugNode,
}: {
  personAName: string;
  personBName: string;
  relationshipLabel: string;
  score: number;
  content: EnhancedDetailedReportContent;
  facts: PaidReportFacts;
  visibleDimensions: Array<[CompatibilityDimension, CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension]]>;
  dimensionLabels: Record<CompatibilityDimension, string>;
  dimensionEvidence: Partial<Record<CompatibilityDimension, string>>;
  shareNode: ReactNode;
  accountNode: ReactNode;
  debugNode?: ReactNode;
}) {
  const conflictScenarios = content.relationshipFlow.conflictScenarios.slice(0, 3);

  return <div className={styles.shell}>
    <header className={styles.topbar}>
      <Link href="/" aria-label="홈으로">‹</Link>
      <strong>1:1 궁합 결과</strong>
      <a href="#share" aria-label="공유하기">↗</a>
    </header>

    <section className={styles.hero} aria-labelledby="result-title">
      <div className={styles.scoreOrb}><strong>{score}</strong><small>점</small></div>
      <h1 id="result-title">{personAName} <span>×</span> {personBName}</h1>
      <p className={styles.heroMeta}>{relationshipLabel}</p>
      <div className={styles.heroSummary}><strong>{content.overview.headline}</strong></div>
    </section>

    <section id="overview" className={styles.section}>
      <SectionHeading number="01" title="둘 사이 케미는 어떨까?" description="각 항목을 누르면 뜻과 두 사람의 계산 근거를 함께 볼 수 있어." />
      <CompatibilityHeatmap dimensions={visibleDimensions.map(([dimension, value]) => ({
        label: dimensionLabels[dimension],
        shortLabel: dimensionLabels[dimension].replace(" 상성", "").replace("관계 ", ""),
        score: value.normalizedScore,
        evidence: dimensionEvidence[dimension] ?? "두 사람의 원국에서 확인되는 근거만 살폈어.",
      }))} />
    </section>

    <section id="pillars" className={styles.section}>
      <SectionHeading number="02" title="두 사람은 어떤 기운을 가졌을까?" description="주토피가 해석에 사용한 두 사람의 사주 원국이야." />
      <div className={styles.personStack}>
        <article className={styles.personCard}>
          <div className={styles.personHeader}><small>첫 번째 사람</small><strong>{personAName}</strong></div>
          <PillarGrid facts={facts.A} />
          <ElementFacts facts={facts.A} />
        </article>
        <article className={styles.personCard}>
          <div className={styles.personHeader}><small>두 번째 사람</small><strong>{personBName}</strong></div>
          <PillarGrid facts={facts.B} />
          <ElementFacts facts={facts.B} />
        </article>
      </div>
    </section>

    <section id="chemistry" className={styles.section}>
      <SectionHeading number="03" title="둘이 붙으면 어떤 힘이 살아날까?" description="끌림과 시너지가 어디에서 시작되는지 네 갈래로 나눠봤어." />
      <article className={styles.leadCard}><strong>{content.chemistry.overview}</strong></article>
      <div className={styles.quadGrid}>
        <article><small>일간</small><p>{content.chemistry.dayMaster}</p></article>
        <article><small>일지</small><p>{content.chemistry.dayBranch}</p></article>
        <article><small>오행</small><p>{content.chemistry.elements}</p></article>
        <article><small>음양 리듬</small><p>{content.chemistry.yinYang}</p></article>
      </div>
    </section>

    <section id="structure" className={styles.section}>
      <SectionHeading number="04" title="관계의 힘은 어느 쪽으로 흐를까?" description="두 사람이 서로에게 주는 영향의 방향을 따로 읽어봤어." />
      <article className={styles.quoteCard}><strong>{content.bondAndFriction.overview}</strong></article>
      <div className={styles.directionStack}>
        <article><span>{personAName} → {personBName}</span><p>{content.directionalImpact.aToB}</p></article>
        <article><span>{personBName} → {personAName}</span><p>{content.directionalImpact.bToA}</p></article>
        <article><span>둘 사이의 차이</span><p>{content.directionalImpact.asymmetry}</p></article>
      </div>
    </section>

    <section id="profiles" className={styles.section}>
      <SectionHeading number="05" title="서로 관계에서 무엇을 원할까?" description="같은 장면에서도 각자가 원하는 반응은 다를 수 있어." />
      <div className={styles.profileStack}>
        <article><small>{personAName}</small><h3>{content.personA.relationshipNeeds}</h3><Paragraph>{content.personA.overallProfile}</Paragraph></article>
        <article><small>{personBName}</small><h3>{content.personB.relationshipNeeds}</h3><Paragraph>{content.personB.overallProfile}</Paragraph></article>
      </div>
    </section>

    <section id="conflict" className={styles.section}>
      <SectionHeading number="06" title="부딪힐 때 어떤 장면이 반복될까?" description="갈등을 단정하지 않고, 반복될 수 있는 장면과 풀리는 실마리를 함께 볼게." />
      <div className={styles.scenarioStack}>
        {conflictScenarios.map((scenario, index) => <article key={`${index}-${scenario.situation}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div><h3>{scenario.situation}</h3><p>{scenario.likelyPattern}</p><p><strong>풀리는 실마리</strong>{scenario.response}</p></div>
        </article>)}
      </div>
    </section>

    <section id="deep-dive" className={styles.section}>
      <SectionHeading number="07" title="지금 이 관계에서 가장 중요한 건 뭘까?" description="현재 관계의 맥락에서 놓치기 쉬운 핵심만 골랐어." />
      <article className={styles.leadCard}><strong>{content.relationshipSpecific.overview}</strong></article>
      <div className={styles.numberedCards}>
        {content.relationshipSpecific.points.slice(0, 4).map((point, index) => <article key={`${index}-${point.title}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{point.title}</h3><p>{point.detail}</p></div></article>)}
      </div>
    </section>

    <section className={styles.ending}>
      <div><small>주토피 노트</small><h2>점수보다 중요한 건, 둘 사이에서 실제로 반복되는 장면이야.</h2></div>
      <ZootopiCaption expression={score >= 80 ? "idea" : score >= 55 ? "smile" : "thinking"}>잘 맞는 순간은 더 자주 만들고, 부딪히는 패턴은 조금 일찍 알아차려 봐.</ZootopiCaption>
    </section>

    <section id="share" className={styles.utilitySection}>{shareNode}</section>
    <section className={styles.utilitySection}>{accountNode}</section>
    {debugNode}
  </div>;
}
