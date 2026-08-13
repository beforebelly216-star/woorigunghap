import type { FiveElement } from "@/lib/compatibility/types";
import type { BasicPersonFacts } from "@/lib/narrative/report-engine-v5";

const ELEMENT_LABELS: Record<FiveElement, string> = {
  wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)",
};
const ELEMENT_ORDER: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

export function PillarGrid({ facts }: { facts: BasicPersonFacts }) {
  const entries = [
    ["년주", facts.pillars.year], ["월주", facts.pillars.month], ["일주", facts.pillars.day], ["시주", facts.pillars.hour],
  ] as const;
  return <div className="v2-pillar-grid">{entries.map(([label, pillar]) => (
    <div className="v2-pillar" key={label}>
      <span>{label}</span>
      {pillar ? <><strong>{pillar.korean}</strong><small>{pillar.hanja}</small></> : <><strong>미상</strong><small>출생시간 미입력</small></>}
    </div>
  ))}</div>;
}

export function ElementFacts({ facts }: { facts: BasicPersonFacts }) {
  return <div className="v2-elements">
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

export function Chapter({ index, eyebrow, title, children }: { index: number; eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="v2-chapter">
    <div className="v2-chapter-heading"><span>{String(index).padStart(2, "0")}</span><div><small>{eyebrow}</small><h2>{title}</h2></div></div>
    {children}
  </section>;
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="v2-long-text">{children}</p>;
}
