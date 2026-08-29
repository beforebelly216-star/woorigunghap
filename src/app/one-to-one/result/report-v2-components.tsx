import type { FiveElement } from "@/lib/compatibility/types";
import type { BasicPersonFacts } from "@/lib/narrative/report-engine-v5";
import {
  PARTNER_INFORMATION_LEVEL_COPY,
  partnerInformationLevelFromFacts,
} from "@/lib/partner-information-level";
import { getHeatToken } from "@/lib/compatibility/stock-theme";
import { ZootopiMark, type ZootopiExpression } from "@/components/zootopi-mark";
import { CandlestickScore } from "@/components/candlestick-score";
import { HeatLegendRamp } from "@/components/heat-legend-ramp";

const ELEMENT_LABELS: Record<FiveElement, string> = {
  wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)",
};
const ELEMENT_ORDER: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

const STEM_ELEMENT: Record<string, FiveElement> = {
  갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth", 기: "earth", 경: "metal", 신: "metal", 임: "water", 계: "water",
};
const BRANCH_ELEMENT: Record<string, FiveElement> = {
  인: "wood", 묘: "wood", 사: "fire", 오: "fire", 진: "earth", 술: "earth", 축: "earth", 미: "earth", 신: "metal", 유: "metal", 해: "water", 자: "water",
};

function SajuCharacterTile({ label, korean, hanja, element, emphasis = false }: {
  label: string;
  korean: string;
  hanja: string;
  element?: FiveElement;
  emphasis?: boolean;
}) {
  return <div className={`v2-saju-char ${element ? `is-${element}` : "is-unknown"} ${emphasis ? "is-day" : ""}`}>
    <small>{label}</small>
    <strong>{korean}</strong>
    <span className="v2-hanja">{hanja}</span>
  </div>;
}

export function PillarGrid({ facts }: { facts: BasicPersonFacts }) {
  const entries = [
    ["년", facts.pillars.year], ["월", facts.pillars.month], ["일", facts.pillars.day], ["시", facts.pillars.hour],
  ] as const;
  return <div className="v2-saju-board">
    <div className="v2-pillar-grid">{entries.map(([label, pillar]) => {
      const hanjaChars = pillar ? [...pillar.hanja] : [];
      const emphasis = label === "일";
      return <div className={`v2-pillar-pair ${emphasis ? "is-day-pair" : ""}`} key={label}>
        <span className="v2-pillar-pair-label">{label}주</span>
        {pillar ? <>
          <SajuCharacterTile label="천간" korean={pillar.stem} hanja={hanjaChars[0] ?? ""} element={STEM_ELEMENT[pillar.stem]} emphasis={emphasis} />
          <SajuCharacterTile label="지지" korean={pillar.branch} hanja={hanjaChars[1] ?? ""} element={BRANCH_ELEMENT[pillar.branch]} emphasis={emphasis} />
        </> : <>
          <SajuCharacterTile label="천간" korean="?" hanja="미상" />
          <SajuCharacterTile label="지지" korean="?" hanja="미상" />
        </>}
      </div>;
    })}</div>
  </div>;
}

/**
 * 궁합 히트맵 — 레이더 차트 대체(docs/zootopi-stock-theme-work-order-v1.md §12.1).
 * 데이터는 기존과 동일한 9개 지표 점수를 그대로 재사용하고 새 계산은 하지 않는다.
 * 색은 보조 채널이며 숫자·라벨을 항상 함께 표기한다. 낮음=빨강, 높음=녹색의 주가형 램프를 쓴다.
 */
export function CompatibilityHeatmap({ dimensions }: { dimensions: Array<{ label: string; shortLabel?: string; score: number }> }) {
  return <div className="v2-heatmap-layout">
    <div className="v2-heatmap-grid" role="img" aria-label="9개 핵심 궁합 지표 히트맵">
      {dimensions.map((dimension) => {
        const score = Math.round(dimension.score);
        return <div
          className="v2-heatmap-tile"
          key={dimension.label}
          style={{ "--tile-heat": getHeatToken(score) } as React.CSSProperties}
        >
          <small>{dimension.shortLabel ?? dimension.label}</small>
          <strong>{score}</strong>
        </div>;
      })}
    </div>
    <HeatLegendRamp />
    <div className="v2-heatmap-list">{dimensions.map((dimension) => <div key={dimension.label}><span>{dimension.label}</span><strong>{Math.round(dimension.score)}</strong></div>)}</div>
  </div>;
}

export { CandlestickScore };

const CHAPTER_ZOOTOPI_EXPRESSION: Record<number, ZootopiExpression> = {
  0: "idea", 2: "surprised", 8: "idea", 9: "analyzing",
};

/** 챕터 전환부 소형 표정 아이콘(§16) — 시각적 쉼표용, 반말 캡션 없이 아이콘만. */
function ChapterZootopiMark({ chapter }: { chapter: number }) {
  const expression = CHAPTER_ZOOTOPI_EXPRESSION[chapter] ?? "smile";
  return <div className="v2-chapter-zootopi" aria-hidden="true"><ZootopiMark expression={expression} /></div>;
}

export function ElementFacts({ facts }: { facts: BasicPersonFacts }) {
  const informationLevel = partnerInformationLevelFromFacts(facts);
  const informationCopy = PARTNER_INFORMATION_LEVEL_COPY[informationLevel];

  return <div className="v2-elements">
    <p className="v2-note"><strong>정보 수준 {informationLevel}</strong> · {informationCopy.short}. {informationCopy.detail}</p>
    <div className="v2-element-counts">{ELEMENT_ORDER.map((element) => (
      <div key={element}><span>{ELEMENT_LABELS[element]}</span><strong>{facts.visibleElementCounts[element]}</strong><small>개</small></div>
    ))}</div>
    <div className="v2-share-list">{ELEMENT_ORDER.map((element) => (
      <div key={element}><span>{ELEMENT_LABELS[element]}</span><div><i style={{ width: `${Math.min(100, facts.weightedElementShares[element])}%` }} /></div><strong>{facts.weightedElementShares[element]}%</strong></div>
    ))}</div>
    <p className="v2-note">{facts.countBasisNote}</p>
  </div>;
}

export function BulletList({ items }: { items: string[] }) {
  return <ul className="v2-bullets">{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>;
}

const SAJU_BOY_CHAPTER_LINES: Record<number, string> = {
  0: "첫 장부터 단서가 보여요. 둘 사이의 전체 그림부터 잡아볼게요.",
  1: "각자 어떤 방식으로 움직이는지 알면, 관계의 절반은 이미 읽은 셈이에요.",
  2: "여긴 좀 중요해요. 상대가 관계에서 보이는 반응을 가까이 들여다볼게요.",
  3: "둘이 붙었을 때 생기는 케미는 혼자 있을 때와 전혀 다를 수 있어요.",
  4: "좋을 때보다 어긋날 때 패턴을 보면 이 관계의 진짜 사용법이 보여요.",
  5: "누가 먼저 움직이고 누가 기다리는지, 관계의 리듬을 확인해볼 차례예요.",
  6: "오래 가는 관계는 우연보다 반복되는 습관에서 갈려요.",
  7: "갈등은 피하는 것보다 회복하는 방식이 더 중요해요.",
  8: "이제 실제 행동으로 옮길 차례예요. 써먹을 수 있는 것만 남겨볼게요.",
  9: "마지막 장이에요. 앞의 단서를 한 번에 쓸 수 있게 정리해둘게요.",
};

function SajuBoyBubble({ chapter }: { chapter: number }) {
  const line = SAJU_BOY_CHAPTER_LINES[chapter] ?? "관계의 다음 단서를 같이 읽어볼게요.";
  return <aside className="v2-saju-boy-bubble" aria-label="사주소년 용한의 코멘트">
    <div className="v2-saju-boy-avatar" aria-hidden="true">
      <svg viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="31" className="boy-face" />
        <path d="M18 29c4-13 31-16 38 0-9-3-12-8-18-7-7 0-11 5-20 7Z" className="boy-hair" />
        <circle cx="27" cy="37" r="8" className="boy-glass" />
        <circle cx="45" cy="37" r="8" className="boy-glass" />
        <path d="M35 37h2" className="boy-bridge" />
        <path d="M30 50c4 3 8 3 12 0" className="boy-smile" />
        <path d="M18 61c5-8 31-8 36 0" className="boy-robe" />
      </svg>
    </div>
    <div><small>사주소년 용한</small><p>{line}</p></div>
  </aside>;
}

export function Chapter({
  index,
  eyebrow,
  title,
  intro,
  summary,
  children,
}: {
  index: number;
  eyebrow: string;
  title: string;
  intro?: string;
  summary?: string[];
  children: React.ReactNode;
}) {
  const summaryItems = (summary ?? []).filter(Boolean).slice(0, 3);
  return <section className="v2-chapter day19-chapter" id={`chapter-${index}`}>
    <div className="v2-chapter-heading">
      <span>CH{index}</span>
      <div><small>{eyebrow}</small><h2>{title}</h2>{intro ? <p>{intro}</p> : null}</div>
      <ChapterZootopiMark chapter={index} />
    </div>
    <SajuBoyBubble chapter={index} />
    <div className="day19-chapter-body">{children}</div>
    {summaryItems.length > 0 ? <div className="day19-summary" aria-label={`${title} 핵심 요약`}>
      <strong>이 장의 핵심</strong>
      <ol>{summaryItems.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{item}</li>)}</ol>
    </div> : null}
  </section>;
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="v2-long-text">{children}</p>;
}

export function EvidenceBoundary({ children }: { children: React.ReactNode }) {
  return <aside className="day19-evidence-boundary"><strong>해석 범위</strong><p>{children}</p></aside>;
}
