import type { FiveElement } from "@/lib/compatibility/types";
import type { BasicPersonFacts } from "@/lib/narrative/report-engine-v5";
import { getHeatToken } from "@/lib/compatibility/stock-theme";
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
    <strong>{korean}{hanja ? `(${hanja})` : ""}</strong>
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
 * 데이터는 기존 결정론 지표 점수를 그대로 재사용하고 새 계산은 하지 않는다.
 * 색은 보조 채널이며 숫자·라벨을 항상 함께 표기한다. 낮음=빨강, 높음=녹색의 주가형 램프를 쓴다.
 */
function dimensionMeaning(label: string) {
  if (label.includes("일간")) return "일간은 각 사람의 중심 성향을 뜻해. 서로의 기본 반응이 얼마나 자연스럽게 이어지는지 보는 항목이야.";
  if (label.includes("일지")) return "일지는 가까운 관계에서 드러나는 생활 리듬과 친밀감의 자리를 뜻해.";
  if (label.includes("오행")) return "오행 상보성은 두 사람이 함께 있을 때 부족하거나 치우친 기운이 얼마나 보완되는지 보는 기준이야.";
  if (label.includes("천간")) return "천간의 합과 충은 겉으로 드러나는 의지와 표현 방식이 결속되거나 부딪히는 흐름을 뜻해.";
  if (label.includes("지지")) return "지지의 형·충·파·해는 생활 속 반응과 습관이 맞물리거나 긴장하는 방식을 뜻해.";
  if (label.includes("귀인")) return "귀인 신호는 서로가 막힌 순간에 도움이나 전환점을 건네기 쉬운 단서를 뜻해.";
  if (label.includes("역할")) return "관계 역할은 두 사람이 책임과 돌봄을 주고받는 방향이 얼마나 맞물리는지 보는 항목이야.";
  return "두 사람의 원국에서 관계에 영향을 주는 기운이 얼마나 자연스럽게 이어지는지 보는 항목이야.";
}

export function CompatibilityHeatmap({ dimensions }: { dimensions: Array<{ label: string; shortLabel?: string; score: number; evidence: string }> }) {
  return <div className="v2-heatmap-layout">
    <div className="v2-heatmap-grid" role="img" aria-label="핵심 궁합 지표 히트맵">
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
    <div className="v2-heatmap-list">{dimensions.map((dimension) => <details key={dimension.label}>
      <summary><span>{dimension.label}</span><strong>{Math.round(dimension.score)}</strong><em>근거 보기</em></summary>
      <p><b>무슨 뜻일까?</b>{dimensionMeaning(dimension.label)}</p>
      <p><b>두 사람에게는?</b>{dimension.evidence}</p>
    </details>)}</div>
  </div>;
}

export function ElementFacts({ facts }: { facts: BasicPersonFacts }) {
  return <div className="v2-elements">
    <div className="v2-element-counts">{ELEMENT_ORDER.map((element) => (
      <div key={element}><span>{ELEMENT_LABELS[element]}</span><strong>{facts.visibleElementCounts[element]}</strong><small>개</small></div>
    ))}</div>
    <div className="v2-share-list">{ELEMENT_ORDER.map((element) => (
      <div key={element}><span>{ELEMENT_LABELS[element]}</span><div><i style={{ width: `${Math.min(100, facts.weightedElementShares[element])}%` }} /></div><strong>{facts.weightedElementShares[element]}%</strong></div>
    ))}</div>
  </div>;
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="v2-long-text">{children}</p>;
}
