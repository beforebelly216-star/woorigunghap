import type { FiveElement } from "@/lib/compatibility/types";
import type { BasicPersonFacts } from "@/lib/narrative/report-engine-v5";
import { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";
import {
  PARTNER_INFORMATION_LEVEL_COPY,
  partnerInformationLevelFromFacts,
} from "@/lib/partner-information-level";

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
  const character = getDayPillarCharacter(facts.pillars.day.korean);

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
    {character ? <div className="v2-day-character-note"><span>✦ 오늘의 핵심 타일 · {facts.pillars.day.korean}</span><strong>{character.title}</strong><p>{character.tagline}</p></div> : null}
  </div>;
}

export function CompatibilityRadar({ dimensions }: { dimensions: Array<{ label: string; score: number }> }) {
  const size = 280;
  const center = size / 2;
  const radius = 96;
  const count = Math.max(3, dimensions.length);
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    return [center + Math.cos(angle) * radius * ratio, center + Math.sin(angle) * radius * ratio] as const;
  };
  const polygon = (ratio: number) => Array.from({ length: count }, (_, index) => point(index, ratio).join(",")).join(" ");
  const scorePolygon = dimensions.map((dimension, index) => point(index, Math.min(1, Math.max(0, dimension.score / 100))).join(",")).join(" ");

  return <div className="v2-radar-layout">
    <div className="v2-radar-chart" aria-label="9개 핵심 궁합 지표 레이더 차트">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
        {[.25, .5, .75, 1].map((ratio) => <polygon className="v2-radar-grid" key={ratio} points={polygon(ratio)} />)}
        {dimensions.map((_, index) => {
          const [x, y] = point(index, 1);
          return <line className="v2-radar-axis" key={index} x1={center} y1={center} x2={x} y2={y} />;
        })}
        <polygon className="v2-radar-score" points={scorePolygon} />
        {dimensions.map((dimension, index) => {
          const [x, y] = point(index, Math.min(1, Math.max(0, dimension.score / 100)));
          return <circle className="v2-radar-point" key={dimension.label} cx={x} cy={y} r="3.5" />;
        })}
      </svg>
    </div>
    <div className="v2-radar-legend">{dimensions.map((dimension) => <div key={dimension.label}><span>{dimension.label}</span><strong>{Math.round(dimension.score)}</strong></div>)}</div>
  </div>;
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
    </div>
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
