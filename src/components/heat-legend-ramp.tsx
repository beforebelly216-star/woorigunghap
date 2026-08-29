/**
 * 주가형 히트맵 범례 — 1:1(§12.1)·1:N(§12.2)이 함께 쓰는 공용 조각.
 * 실제 타일 색상이 5개 이산 구간(getHeatToken)으로 스냅되므로 범례도 매끄러운 그라디언트가 아니라
 * 5개 스와치로 표시해 낮은 점수의 빨강부터 높은 점수의 녹색까지 실제 인코딩과 정확히 대응한다.
 */
const HEAT_STEPS = [
  "var(--zootopi-heat-1)",
  "var(--zootopi-heat-2)",
  "var(--zootopi-heat-3)",
  "var(--zootopi-heat-4)",
  "var(--zootopi-heat-5)",
];

export function HeatLegendRamp() {
  return <div className="v2-heatmap-legend" aria-hidden="true">
    <span>낮음</span>
    <div className="v2-heatmap-legend-ramp">{HEAT_STEPS.map((color) => <i key={color} style={{ background: color }} />)}</div>
    <span>높음</span>
  </div>;
}
