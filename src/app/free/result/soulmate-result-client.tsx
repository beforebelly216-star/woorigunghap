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
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "◈", water: "💧",
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
      <h1>천생연분 결과를 다시 만들어 주세요</h1>
      <p>이 결과는 방금 입력한 사주 정보를 기준으로 계산해 보여드려요. 입력 화면에서 다시 분석하면 바로 확인할 수 있습니다.</p>
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
    {result.pillars.some((pillar) => pillar.stem === null || pillar.branch === null) ? <p className={styles.uncertainNote}>출생시간이 없거나 절입 경계에 걸린 기둥은 임의로 확정하지 않고 ‘미상’으로 표시합니다.</p> : null}
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
      <strong>실제 관계에서는</strong>
      <p>{item.relationshipPattern}</p>
    </div>
    <div className={styles.detailBlock}>
      <strong>특히 이런 사주라면 더 좋아요</strong>
      <ul>{item.betterWhen.map((condition) => <li key={condition}>{condition}</li>)}</ul>
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
        <h1>{result.displayName}님과<br/>가장 잘 맞는 사주를<br/>찾았어요</h1>
        <p>내 사주팔자 전체를 먼저 보고, 일간과 오행의 보완 관계를 차례로 풀어드릴게요.</p>
      </div>
      <div className={styles.heroMascot}><span>♥</span><ZootopiMark expression="idea" withBody /></div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionNumber}>01</div>
      <h2>내 사주 한눈에 보기</h2>
      <p className={styles.sectionIntro}>천생연분을 찾기 전에 내 사주의 기준점을 먼저 확인합니다. 축약 프로필보다 실제 사주팔자 원국을 먼저 보여드려요.</p>
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
      <h2>가장 잘 맞는 일간 TOP {result.recommendations.length}</h2>
      <p className={styles.sectionIntro}>10개 일간을 모두 비교한 뒤, 내 원국과의 생극 관계·오행 분포·음양 보완을 함께 보고 의미 있게 앞서는 일간만 골랐습니다. 숫자 퍼센트 대신 왜 맞는지를 구체적으로 보여드립니다.</p>
      <div className={styles.recommendationList}>
        {result.recommendations.map((_, index) => <RecommendationCard result={result} index={index} key={result.recommendations[index].stem} />)}
      </div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionNumber}>03</div>
      <h2>잘 맞는 사주의 구체적인 모습</h2>
      <p className={styles.sectionIntro}>추천 일간 하나만으로 끝내지 않고, 같은 일간 중에서도 어떤 오행·음양·지지 구성이 더 편안하게 맞는지 좁혀봅니다.</p>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>①</span><div><strong>오행 구성</strong><p>내 원국에서 상대적으로 적거나 많은 기운을 함께 봅니다.</p></div></div>
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
        <div className={styles.cardHeading}><span>③</span><div><strong>천간에서 있으면 좋은 기운</strong><p>상대의 중심 기운으로 우선 살펴볼 일간입니다.</p></div></div>
        <div className={styles.chips}>{result.detailed.preferredStems.map((item) => <span key={item}>{item}</span>)}</div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>④</span><div><strong>지지에서 있으면 좋은 기운</strong><p>내 일지와 합 또는 중립 관계를 우선하면서 오행 보완도 함께 봤습니다.</p></div></div>
        <div className={styles.chips}>{result.detailed.preferredBranches.map((item) => <span key={item}>{item}</span>)}</div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.cardHeading}><span>⑤</span><div><strong>특히 잘 맞는 조건</strong><p>추천 일간이어도 원국 전체가 어떻게 구성되는지가 중요합니다.</p></div></div>
        <ul className={styles.checkList}>{result.detailed.idealConditions.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>

      <article className={`${styles.analysisCard} ${styles.cautionCard}`}>
        <div className={styles.cardHeading}><span>⑥</span><div><strong>조심해야 할 구성</strong><p>‘상극’으로 단정하지 않고 피로가 커질 수 있는 구조를 따로 봅니다.</p></div></div>
        <ul className={styles.cautionList}>{result.detailed.cautions.map((item) => <li key={item}>{item}</li>)}</ul>
      </article>

      <CharacterComment text={result.zootopi.middle} expression="idea" />
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
      <div><small>다음 단계</small><strong>실제로 궁금한 사람이 있나요?</strong><p>이제 두 사람의 사주를 함께 놓고 실제 1:1 궁합을 확인해 보세요.</p></div>
      <Link href="/one-to-one" className={styles.primaryAction}>1:1 궁합 분석하기 →</Link>
      <Link href="/free" className={styles.secondaryAction}>다시 분석하기</Link>
    </section>
  </div>;
}
