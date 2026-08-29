import Link from "next/link";
import type { ReactNode } from "react";
import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { CompatibilityDimension } from "@/lib/compatibility/types";
import type { PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import { ZootopiCaption } from "@/components/zootopi-mark";
import { CompatibilityHeatmap, ElementFacts, Paragraph, PillarGrid } from "./report-v2-components";
import styles from "./report-layout-v3.module.css";

const SECTION_NAV = [
  ["01", "한눈에 보기", "overview"],
  ["02", "두 사람 사주", "pillars"],
  ["03", "끌림 + 시너지", "chemistry"],
  ["04", "관계 구조", "structure"],
  ["05", "관계 성향", "profiles"],
  ["06", "갈등 루프", "conflict"],
  ["07", "관계 심층", "deep-dive"],
  ["08", "장기 전망", "future"],
  ["09", "사용설명서", "manual"],
] as const;

function take(items: string[] | undefined, count = 3) {
  return (items ?? []).filter(Boolean).slice(0, count);
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return <div className={styles.sectionHeading}>
    <span>{number}</span>
    <div>
      <small>{eyebrow}</small>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  </div>;
}

function ListCard({ title, items, tone = "plain" }: { title: string; items: string[]; tone?: "plain" | "good" | "caution" }) {
  return <article className={`${styles.listCard} ${styles[tone]}`}>
    <h3>{title}</h3>
    <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
  </article>;
}

export default function ReportLayoutV3({
  personAName,
  personBName,
  relationshipLabel,
  score,
  scoreLabel,
  scoreDescription,
  archetypeLabel,
  archetypeSubtitle,
  content,
  facts,
  snapshot,
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
  scoreLabel: string;
  scoreDescription: string;
  archetypeLabel: string;
  archetypeSubtitle: string;
  content: EnhancedDetailedReportContent;
  facts: PaidReportFacts;
  snapshot: CompatibilityCalculationSnapshot;
  visibleDimensions: Array<[CompatibilityDimension, CompatibilityCalculationSnapshot["dimensions"][CompatibilityDimension]]>;
  dimensionLabels: Record<CompatibilityDimension, string>;
  dimensionEvidence: Partial<Record<CompatibilityDimension, string>>;
  shareNode: ReactNode;
  accountNode: ReactNode;
  debugNode?: ReactNode;
}) {
  const strengths = take(content.strengthsAndRisks.strengths, 3);
  const frictions = take(content.strengthsAndRisks.repeatedFrictions, 3);
  const conflictScenarios = content.relationshipFlow.conflictScenarios.slice(0, 3);

  return <div className={styles.shell}>
    <header className={styles.topbar}>
      <Link href="/" aria-label="홈으로">‹</Link>
      <strong>1:1 궁합 결과</strong>
      <a href="#share" aria-label="공유하기">↗</a>
    </header>

    <section className={styles.hero} aria-labelledby="result-title">
      <div className={styles.heroMeta}>{relationshipLabel} 궁합 리포트</div>
      <h1 id="result-title">{personAName} <span>×</span> {personBName}</h1>
      <div className={styles.heroScoreRow}>
        <div className={styles.scoreOrb}><strong>{score}</strong><small>점</small></div>
        <div className={styles.heroScoreCopy}>
          <small>{scoreLabel}</small>
          <strong>{archetypeLabel}</strong>
          <p>{archetypeSubtitle}</p>
        </div>
      </div>
      <div className={styles.heroSummary}>
        <strong>{content.overview.headline}</strong>
        <Paragraph>{content.overview.detailedSummary}</Paragraph>
      </div>
    </section>

    <nav className={styles.sectionNav} aria-label="리포트 목차">
      {SECTION_NAV.map(([number, label, id]) => <a key={id} href={`#${id}`}><span>{number}</span>{label}</a>)}
    </nav>

    <section id="overview" className={styles.section}>
      <SectionHeading number="01" eyebrow="AT A GLANCE" title="한눈에 보기" description="점수보다 먼저, 이 관계의 강점과 주의 지점을 빠르게 잡습니다." />
      <div className={styles.overviewScoreCard}>
        <div><small>궁합 점수</small><strong>{score}<em>/100</em></strong></div>
        <p>{scoreDescription}</p>
      </div>
      <CompatibilityHeatmap dimensions={visibleDimensions.map(([dimension, value]) => ({
        label: dimensionLabels[dimension],
        shortLabel: dimensionLabels[dimension].replace(" 상성", "").replace("관계 ", ""),
        score: value.normalizedScore,
        evidence: dimensionEvidence[dimension] ?? "두 사람의 원국에서 확인 가능한 계산 근거만 반영했습니다.",
      }))} />
      <div className={styles.twoCol}>
        <ListCard title="이 관계를 살리는 힘" items={strengths} tone="good" />
        <ListCard title="반복 주의 지점" items={frictions} tone="caution" />
      </div>
    </section>

    <section id="pillars" className={styles.section}>
      <SectionHeading number="02" eyebrow="FOUR PILLARS" title="두 사람의 사주 원국" description="해석이 어떤 명식을 바탕으로 만들어졌는지 먼저 확인합니다." />
      <div className={styles.personStack}>
        <article className={styles.personCard}>
          <div className={styles.personHeader}><small>PERSON 01</small><strong>{personAName}</strong></div>
          <PillarGrid facts={facts.A} />
          <ElementFacts facts={facts.A} />
        </article>
        <article className={styles.personCard}>
          <div className={styles.personHeader}><small>PERSON 02</small><strong>{personBName}</strong></div>
          <PillarGrid facts={facts.B} />
          <ElementFacts facts={facts.B} />
        </article>
      </div>
      {(!snapshot.scenarioPolicy || snapshot.scenarioPolicy.pairScenarios <= 1) ? null : <p className={styles.note}>출생시간 미상 시나리오 {snapshot.scenarioPolicy.pairScenarios.toLocaleString("ko-KR")}개를 함께 비교한 결과입니다.</p>}
    </section>

    <section id="chemistry" className={styles.section}>
      <SectionHeading number="03" eyebrow="ATTRACTION & SYNERGY" title="끌림 + 시너지" description="둘이 붙었을 때 자연스럽게 살아나는 힘과 템포를 봅니다." />
      <article className={styles.leadCard}><small>CHEMISTRY</small><strong>{content.chemistry.overview}</strong></article>
      <div className={styles.quadGrid}>
        <article><small>일간</small><p>{content.chemistry.dayMaster}</p></article>
        <article><small>일지</small><p>{content.chemistry.dayBranch}</p></article>
        <article><small>오행</small><p>{content.chemistry.elements}</p></article>
        <article><small>음양 리듬</small><p>{content.chemistry.yinYang}</p></article>
      </div>
    </section>

    <section id="structure" className={styles.section}>
      <SectionHeading number="04" eyebrow="RELATIONSHIP STRUCTURE" title="관계 구조" description="누가 어떤 방식으로 영향을 주고받는지, 관계 안의 힘의 방향을 읽습니다." />
      <article className={styles.quoteCard}><small>핵심 구조</small><strong>{content.bondAndFriction.overview}</strong></article>
      <div className={styles.directionStack}>
        <article><span>{personAName} → {personBName}</span><p>{content.directionalImpact.aToB}</p></article>
        <article><span>{personBName} → {personAName}</span><p>{content.directionalImpact.bToA}</p></article>
        <article><span>둘 사이의 비대칭</span><p>{content.directionalImpact.asymmetry}</p></article>
      </div>
    </section>

    <section id="profiles" className={styles.section}>
      <SectionHeading number="05" eyebrow="RELATIONSHIP PROFILES" title="두 사람의 관계 성향" description="각자가 관계 안에서 원하는 것과 예민해지는 지점을 분리해서 봅니다." />
      <div className={styles.profileStack}>
        <article><small>{personAName}</small><h3>{content.personA.relationshipNeeds}</h3><Paragraph>{content.personA.overallProfile}</Paragraph></article>
        <article><small>{personBName}</small><h3>{content.personB.relationshipNeeds}</h3><Paragraph>{content.personB.overallProfile}</Paragraph></article>
      </div>
    </section>

    <section id="conflict" className={styles.section}>
      <SectionHeading number="06" eyebrow="CONFLICT LOOP" title="갈등 루프" description="갈등이 생기는 순간보다, 같은 장면이 어떤 순서로 반복되는지에 집중합니다." />
      <div className={styles.scenarioStack}>
        {conflictScenarios.map((scenario, index) => <article key={`${index}-${scenario.situation}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div><h3>{scenario.situation}</h3><p><strong>반복 패턴</strong>{scenario.likelyPattern}</p><p><strong>끊는 방법</strong>{scenario.response}</p></div>
        </article>)}
      </div>
      <ListCard title="특히 반복되기 쉬운 마찰" items={frictions} tone="caution" />
    </section>

    <section id="deep-dive" className={styles.section}>
      <SectionHeading number="07" eyebrow={`${relationshipLabel.toUpperCase()} DEEP DIVE`} title={`${relationshipLabel} 관계 심층 분석`} description="같은 사주 조합이라도 현재 관계 단계에 따라 중요하게 보는 지점을 달리합니다." />
      <article className={styles.leadCard}><small>{relationshipLabel} 전용 해석</small><strong>{content.relationshipSpecific.overview}</strong></article>
      <div className={styles.numberedCards}>
        {content.relationshipSpecific.points.map((point, index) => <article key={`${index}-${point.title}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{point.title}</h3><p>{point.detail}</p></div></article>)}
      </div>
    </section>

    <section id="future" className={styles.section}>
      <SectionHeading number="08" eyebrow="LONG-TERM OUTLOOK" title="장기 전망" description="좋아지는 조건과 소모되는 조건을 함께 봅니다." />
      <div className={styles.twoCol}>
        <ListCard title="더 좋아지는 조건" items={strengths} tone="good" />
        <ListCard title="소모되기 쉬운 조건" items={frictions} tone="caution" />
      </div>
    </section>

    <section id="manual" className={styles.section}>
      <SectionHeading number="09" eyebrow="RELATIONSHIP MANUAL" title="관계 사용설명서" description="좋은 해석보다 실제로 반복해서 쓸 수 있는 행동 규칙을 남깁니다." />
      <div className={styles.twoCol}>
        <ListCard title="이렇게 해보기" items={take(content.practicalManual.do, 4)} tone="good" />
        <ListCard title="이건 피하기" items={take(content.practicalManual.dont, 4)} tone="caution" />
      </div>
      <div className={styles.protocol}>
        <h3>갈등이 생겼을 때 순서</h3>
        {content.practicalManual.conflictProtocol.map((item, index) => <div key={`${index}-${item}`}><span>{index + 1}</span><p>{item}</p></div>)}
      </div>
    </section>

    <section className={styles.ending}>
      <div><small>JOOTOPI NOTE</small><h2>두 사람의 관계는 점수 하나보다, 반복되는 장면을 어떻게 다루는지가 더 중요해요.</h2><p>{content.strengthsAndRisks.warning}</p></div>
      <ZootopiCaption expression={score >= 80 ? "idea" : score >= 55 ? "smile" : "thinking"}>이 리포트에서 딱 한 가지만 기억한다면, 잘 맞는 부분은 반복하고 부딪히는 패턴은 빨리 끊어보세요.</ZootopiCaption>
    </section>

    <section id="share" className={styles.utilitySection}>{shareNode}</section>
    <section className={styles.utilitySection}>{accountNode}</section>
    {debugNode}
  </div>;
}
