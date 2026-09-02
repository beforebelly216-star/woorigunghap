"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ZootopiMark } from "@/components/zootopi-mark";
import {
  parseSoulmateResult,
  SOULMATE_RESULT_STORAGE_KEY,
  type SoulmateResult,
} from "@/lib/soulmate-result-contract";
import styles from "./soulmate-result.module.css";
import "../../../components/zootopi-mark.css";

const ELEMENT_ICON: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "🪙", water: "💧",
};

function displayStem(stem: string | null, hanja: string | null) {
  if (!stem) return "미상";
  return `${stem}${hanja ? `(${hanja})` : ""}`;
}

function displayBranch(branch: string | null, hanja: string | null) {
  if (!branch) return "미상";
  return `${branch}${hanja ? `(${hanja})` : ""}`;
}

function ResultHeader() {
  return <header className={styles.topbar}>
    <Link href="/free" className={styles.iconButton} aria-label="천생연분 입력으로 돌아가기">‹</Link>
    <strong>내 천생연분 결과</strong>
    <button className={styles.iconButton} type="button" aria-label="공유하기" onClick={() => { if (navigator.share) void navigator.share({ title: "내 천생연분 결과", url: window.location.href }).catch(() => undefined); }}>↗</button>
  </header>;
}

function CharacterComment({ text, expression = "smile" }: { text: string; expression?: "smile" | "idea" | "thinking" }) {
  return <aside className={styles.characterComment}>
    <div className={styles.characterMini}><ZootopiMark expression={expression} /></div>
    <p>{text}</p>
  </aside>;
}

function MissingResult() {
  return <div className={styles.shell}>
    <ResultHeader />
    <section className={styles.missing}>
      <ZootopiMark expression="thinking" withBody />
      <h1>천생연분 결과를 다시 만들어 줘</h1>
      <p>이 결과는 방금 입력한 사주 정보를 기준으로 계산해 보여줄게. 입력 화면에서 다시 분석하면 바로 확인할 수 있어.</p>
      <Link href="/free" className={styles.primaryAction}>무료로 다시 분석하기</Link>
    </section>
  </div>;
}

function FourPillars({ result }: { result: SoulmateResult }) {
  return <div className={styles.pillarsCard}>
    <div className={styles.pillarTitleRow}>
      <strong>사주팔자 · 원국</strong>
      <span>년주 · 월주 · 일주 · 시주</span>
    </div>
    <div className={styles.pillarsTable} role="table" aria-label="사주팔자 원국">
      <div className={styles.pillarLabel} role="rowheader">구분</div>
      {result.pillars.map((pillar) => <div className={styles.pillarHead} role="columnheader" key={`head-${pillar.key}`}>{pillar.label}</div>)}
      <div className={styles.pillarLabel} role="rowheader">천간</div>
      {result.pillars.map((pillar) => <div className={`${styles.pillarCell} ${pillar.key === "day" ? styles.dayCell : ""}`} role="cell" key={`stem-${pillar.key}`}>{displayStem(pillar.stem, pillar.stemHanja)}</div>)}
      <div className={styles.pillarLabel} role="rowheader">지지</div>
      {result.pillars.map((pillar) => <div className={`${styles.pillarCell} ${pillar.key === "day" ? styles.dayCell : ""}`} role="cell" key={`branch-${pillar.key}`}>{displayBranch(pillar.branch, pillar.branchHanja)}</div>)}
    </div>
  </div>;
}

function RecommendationCard({ result, index }: { result: SoulmateResult; index: number }) {
  const item = result.recommendations[index];
  if (!item) return null;
  return <article className={`${styles.recommendationCard} ${index === 0 ? styles.recommendationTop : ""}`}>
    <div className={styles.recommendationHead}>
      <span className={styles.rank}>{item.rank}위</span>
      <div>
        <strong>{item.stem}({item.stemHanja})</strong>
        <small>{ELEMENT_ICON[item.element]} {item.elementLabel} · {item.yinYangLabel}</small>
      </div>
    </div>
    <p className={styles.relationChip}>{item.relationLabel}</p>
    <h3>{item.headline}</h3>
    <div className={styles.detailBlock}>
      <strong>왜 잘 맞나요?</strong>
      <ul>{item.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    </div>
    <div className={styles.detailBlock}>
      <strong>어떤 사람일까?</strong>
      <ul>{(item.personalitySummary ?? [item.relationshipPattern]).map((sentence) => <li key={sentence}>{sentence}</li>)}</ul>
    </div>
  </article>;
}

export default function SoulmateResultClient() {
  const [result, setResult] = useState<SoulmateResult | null | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = window.sessionStorage.getItem(SOULMATE_RESULT_STORAGE_KEY);
        setResult(raw ? parseSoulmateResult(JSON.parse(raw)) : null);
      } catch {
        setResult(null);
      }
    });
  }, []);

  const maxElementWeight = useMemo(() => result ? Math.max(...result.elementBalance.map((item) => item.weight), 1) : 1, [result]);

  if (result === undefined) return <div className={styles.shell}><ResultHeader /><div className={styles.loading} role="status">결과를 불러오고 있어요…</div></div>;
  if (!result) return <MissingResult />;

  return <div className={styles.shell}>
    <ResultHeader />

    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span>무료 천생연분 결과</span>
        <h1>{result.displayName}님과<br/>가장 잘 맞는 사주를<br/>찾았어</h1>
        <p>네 사주팔자 전체를 먼저 보고, 일간과 오행의 보완 관계를 차례로 풀어줄게.</p>
      </div>
      <div className={styles.heroMascot}><span>♥</span><ZootopiMark expression="idea" withBody /></div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionNumber}>01</div>
      <h2>내 사주 한눈에 보기</h2>
      <p className={styles.sectionIntro}>먼저 네 사주의 중심과 전체 원국을 차근차근 볼게.</p>
      <FourPillars result={result} />

      <div className={styles.selfGrid}>
        <article><span className={styles.miniIcon}>▣</span><small>일간</small><strong>{result.self.dayMaster}({result.self.dayMasterHanja})</strong><p>{result.self.yinYangLabel} · {result.self.elementLabel}</p></article>
        <article><span className={styles.miniIcon}>♟</span><small>성향 키워드</small><div className={styles.keywordWrap}>{result.self.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></article>
        <article><span className={styles.miniIcon}>✓</span><small>강점</small><p>{result.self.strength}</p></article>
        <article><span className={styles.miniIcon}>◇</span><small>보완점</small><p>{result.self.complement}</p></article>
      </div>
      <CharacterComment text={result.zootopi.opening} expression="smile" />
    </section>

    <section className={styles.section}>
      <div className={styles.sectionNumber}>02</div>
      <h2>잘 맞는 사주의 구체적인 모습</h2>
      <p className={styles.sectionIntro}>오행·음양·지지 구성을 함께 보고 편안하게 맞는 모습을 좁혀볼게.</p>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>①</span><div><strong>오행 구성</strong><p>네 원국에서 상대적으로 적거나 많은 기운을 함께 봤어.</p></div></div>
        <div className={styles.elementBars}>
          {result.elementBalance.map((item) => <div className={styles.elementRow} key={item.element}>
            <span>{ELEMENT_ICON[item.element]} {item.label}</span>
            <div className={styles.bar}><i style={{ width: `${Math.max(10, Math.round((item.weight / maxElementWeight) * 100))}%` }} /></div>
            <b>{item.level}</b>
          </div>)}
        </div>
        <div className={styles.chips}>{result.detailed.preferredElements.map((item) => <span key={item}>보완 우선 · {item}</span>)}</div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>②</span><div><strong>음양 균형</strong><p>{result.yinYangBalance.label}</p></div></div>
        <div className={styles.yinYangBox}>
          <div><b>양(+)</b><strong>{result.yinYangBalance.yang}</strong></div>
          <div><b>음(-)</b><strong>{result.yinYangBalance.yin}</strong></div>
        </div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>③</span><div><strong>천간에서 있으면 좋은 기운</strong><p>상대의 중심 기운으로 먼저 볼 일간이야.</p></div></div>
        <div className={styles.preferenceList}>{result.detailed.preferredStems.map((item, index) => <div key={item}><strong>{item} 일간</strong><p>{result.recommendations[index]?.reasons[0] ?? "네 사주의 균형을 편안하게 보완해 주는 기운이야."}</p></div>)}</div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>④</span><div><strong>지지에서 있으면 좋은 기운</strong><p>네 일지와의 관계와 오행 보완을 함께 봤어.</p></div></div>
        <div className={styles.preferenceList}>{result.detailed.preferredBranches.map((item) => <div key={item}><strong>{item} 지지</strong><p>네 일지와 합 또는 중립 관계를 우선해 편안한 생활 리듬을 만들기 좋은 기운이야.</p></div>)}</div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>⑤</span><div><strong>특히 잘 맞는 조건</strong><p>추천 일간이어도 원국 전체가 어떻게 구성되는지가 중요해.</p></div></div>
        <ul className={styles.checkList}>{result.detailed.idealConditions.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>

      <article className={`${styles.analysisCard} ${styles.cautionCard}`}>
        <div className={styles.cardHeading}><span>⑥</span><div><strong>조심해야 할 구성</strong><p>‘상극’으로 단정하지 않고 피로가 커질 수 있는 구조를 따로 봤어.</p></div></div>
        <ul className={styles.cautionList}>{result.detailed.cautions.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>

      <CharacterComment text={result.zootopi.middle} expression="idea" />
    </section>

    <section className={styles.section}>
      <div className={styles.sectionNumber}>03</div>
      <h2>가장 잘 맞는 일간 TOP 3</h2>
      <p className={styles.sectionIntro}>열 가지 일간을 모두 비교하고, 네 원국과의 생극 관계·오행 분포·음양 보완을 함께 살폈어.</p>
      <div className={styles.recommendationList}>
        {result.recommendations.slice(0, 3).map((_, index) => <RecommendationCard result={result} index={index} key={result.recommendations[index].stem} />)}
      </div>
    </section>

    <section className={styles.finalComment}>
      <div>
        <span>04 · 주토피 마지막 한마디</span>
        <p>{result.zootopi.closing}</p>
      </div>
      <ZootopiMark expression="smile" withBody />
    </section>

    <section className={styles.methodNote}>
      <strong>어떻게 계산했나요?</strong>
      <p>{result.detailed.methodNote}</p>
    </section>

    <section className={styles.nextStep}>
      <div className={styles.nextCharacter}><ZootopiMark expression="idea" /></div>
      <div><strong>실제로 궁금한 사람이 있어?</strong><p>두 사람의 사주를 함께 놓고 실제 1:1 궁합을 확인해 봐.</p></div>
      <Link href="/one-to-one?from=free" className={styles.primaryAction}>1:1 궁합 분석하기 →</Link>
      <Link href="/free" className={styles.secondaryAction}>다시 분석하기</Link>
    </section>
  </div>;
}
