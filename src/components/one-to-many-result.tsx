import type { OneToManyResultView } from "@/lib/compatibility/one-to-many-view";
import { getCompatibilityScoreBand } from "@/lib/compatibility/score-scale";
import { CandlestickScore } from "@/components/candlestick-score";

export function OneToManyResult({ view }: { view: OneToManyResultView }) {
  return (
    <main className="comparison-report-page one-to-many-result-page">
      <div className="comparison-report-shell">
        <section className="comparison-section" aria-labelledby="ranking-title">
          <div className="comparison-section-heading">
            <p className="card-label">종합 결과</p>
            <h2 id="ranking-title">한눈에 보는 순위</h2>
            <p>종합점수는 관계의 차이를 더 직관적으로 느낄 수 있도록 45~100점 구간으로 보정해 보여드려요. 0~2점 차이는 공동 수준으로 보고, 점수 범위가 겹치면 확정적인 우열 표현을 피했어요.</p>
          </div>
          <ol className="ranking-grid">
            {view.rankings.map((candidate) => (
              <li className={`ranking-card ${candidate.rank === 1 ? "ranking-card-top" : ""}`} key={candidate.candidateId}>
                <div className="ranking-card-head">
                  <span className="rank-chip">{candidate.rank}위</span>
                  <span className="rank-gap">{candidate.gapLabel}</span>
                </div>
                <strong className="ranking-name">{candidate.displayName}</strong>
                <div className="ranking-score">
                  <span>{candidate.score}</span>
                  <small>점</small>
                  <CandlestickScore score={candidate.score} compact />
                </div>
                <small className="ranking-score-level">{getCompatibilityScoreBand(candidate.score).label}</small>
                <p>{candidate.confidenceLabel}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
