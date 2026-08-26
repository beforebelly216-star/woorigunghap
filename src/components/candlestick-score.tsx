/**
 * 인연 주가 지수 캔들스틱 — 원형 게이지 대체(docs/zootopi-stock-theme-work-order-v1.md §13).
 * 1:1 결과 헤더(§13.1)와 1:N 순위 카드(§13.2, compact)가 함께 쓰는 공용 컴포넌트.
 *
 * 항상 양봉만 나오지 않도록 점수별 몸통 크기를 실제로 차등화하되, 이 제품 점수 밴드(45~100)는
 * "나쁜 관계" 판정을 하지 않으므로 음봉(파랑/하락)은 절대 쓰지 않는다 — 저점수는 보합형(도지)으로 표현한다.
 *
 * 스타일: `candlestick-score.css`는 이 컴포넌트를 쓰는 각 route의 page.tsx에서 직접 import한다
 * (이 저장소의 기존 관례 — report-theme.css/zootopi-mark.css와 동일 패턴).
 */
import { getCandleTier, getStockBadge } from "@/lib/compatibility/stock-theme";

export function CandlestickScore({ score, compact = false }: { score: number; compact?: boolean }) {
  const tier = getCandleTier(score);
  const maxBody = 62;
  const bodyHeight = Math.max(3, tier.bodyRatio * maxBody);
  const wickExtra = Math.max(6, tier.wickRatio * maxBody);
  const bodyTop = 60 - bodyHeight / 2;
  const bodyBottom = 60 + bodyHeight / 2;
  const toneClass = tier.tone === "up" ? "is-up" : "is-flat";

  const svg = <svg viewBox="0 0 64 120" role="img" aria-label={`인연 주가 지수 캔들스틱, ${tier.shapeLabel}`}>
    {tier.isDoji ? <>
      <line x1="32" y1="30" x2="32" y2="90" className="v2-candle-wick" />
      <line x1="14" y1="60" x2="50" y2="60" className="v2-candle-body-flat" />
    </> : <>
      <line x1="32" y1={bodyTop - wickExtra} x2="32" y2={bodyTop} className="v2-candle-wick" />
      <line x1="32" y1={bodyBottom} x2="32" y2={bodyBottom + wickExtra * .6} className="v2-candle-wick" />
      <rect x="14" y={bodyTop} width="36" height={bodyHeight} rx="4" className="v2-candle-body" />
    </>}
  </svg>;

  if (compact) {
    return <span className={`v2-candle v2-candle-compact ${toneClass}`} aria-hidden="true">{svg}</span>;
  }

  const badge = getStockBadge(score);
  return <div className={`v2-candle ${toneClass}`}>
    {svg}
    <div className="v2-candle-readout">
      <strong>{Math.round(score)}</strong>
      <small>/ 100</small>
    </div>
    <span className="v2-candle-badge">{badge}</span>
  </div>;
}
