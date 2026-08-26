import Link from "next/link";
import type { OneToManyResultView } from "@/lib/compatibility/one-to-many-view";
import { getCompatibilityScoreBand } from "@/lib/compatibility/score-scale";
import { getHeatToken } from "@/lib/compatibility/stock-theme";
import { OneToManyShareCard } from "@/components/one-to-many-share-card";
import { CandlestickScore } from "@/components/candlestick-score";
import { ZootopiCaption } from "@/components/zootopi-mark";
import { HeatLegendRamp } from "@/components/heat-legend-ramp";

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/** §10 항목 1 — 비교 총평은 Hero급 대우, 은유 적극 사용(§3). 1위 후보 기준 반말 코멘트. */
function comparisonHeroCaption(view: OneToManyResultView) {
  const top = view.rankings.find((candidate) => candidate.rank === 1);
  if (!top) return "관심종목들 비교, 지금부터 같이 볼래?";
  if (top.score >= 85) return `${top.displayName} 쪽이 지금 제일 잘나가는데?`;
  if (top.score >= 70) return `${top.displayName} 쪽이 전체적으로 우상향이야.`;
  return "차이가 크지 않은 구간이야, 하나씩 같이 비교해볼래?";
}

/** §10 항목 4 — N×4 히트맵 매트릭스(§12.2). 연락·대화/편안함·신뢰/갈등회복/생활·장기관계 4개만 쓴다. */
const COMMON_METRIC_MATRIX_IDS = ["communication", "emotionalStability", "conflictManagement", "longTerm"] as const;

function CommonMetricsHeatmapMatrix({ view }: { view: OneToManyResultView }) {
  const columns = view.summaryMetrics.filter((metric) => (COMMON_METRIC_MATRIX_IDS as readonly string[]).includes(metric.id));
  if (columns.length === 0) return null;
  return <div className="metrics-heatmap-matrix" role="img" aria-label="후보별 공통 지표 히트맵 매트릭스">
    <div className="metrics-heatmap-scroll" tabIndex={0} aria-label="후보 × 지표 히트맵, 좌우로 스크롤 가능">
      <table className="metrics-heatmap-table">
        <caption>후보별 연락·대화, 편안함·신뢰, 갈등 회복, 생활·장기관계 비교</caption>
        <thead>
          <tr>
            <th scope="col">후보</th>
            {columns.map((metric) => <th scope="col" key={metric.id}>{metric.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {view.rankings.map((candidate) => (
            <tr key={candidate.candidateId}>
              <th scope="row">{candidate.displayName}</th>
              {columns.map((metric) => {
                const value = metric.values.find((item) => item.candidateId === candidate.candidateId);
                const score = value ? Math.round(value.score) : null;
                return <td key={metric.id} style={score !== null ? { "--tile-heat": getHeatToken(score) } as React.CSSProperties : undefined}>
                  {score !== null ? score : "–"}
                </td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <HeatLegendRamp />
  </div>;
}

export function OneToManyResult({ view, demo = false }: { view: OneToManyResultView; demo?: boolean }) {
  return (
    <main className="comparison-report-page one-to-many-result-page">
      <div className="comparison-report-shell">
        <Link href="/one-to-many" className="back-link compact">← 비교 정보 다시 입력</Link>

        <header className="comparison-hero">
          <div className="demo-badge">{demo ? "결과 UI · 고정 데모" : "결제 완료 · 저장된 1:다 리포트"}</div>
          <p className="eyebrow">1:다 {view.relationshipLabel} 비교</p>
          <h1>{view.headline}</h1>
          <p className="comparison-summary">{view.summary}</p>
          <div className="comparison-notice" role="note">
            <strong>점수 차이를 읽는 방법</strong>
            <span>{view.closenessNotice}</span>
          </div>
          <ZootopiCaption expression="idea">{comparisonHeroCaption(view)}</ZootopiCaption>
        </header>

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

        <section className="comparison-section" aria-labelledby="candidate-role-title">
          <div className="comparison-section-heading">
            <p className="card-label">후보 역할</p>
            <h2 id="candidate-role-title">누가 더 높은가보다, 누구와 어떤 관계가 되는가</h2>
            <p>각 후보가 이 관계에서 보여주는 대표적인 역할과 바로 체감하기 쉬운 차이를 먼저 정리했어요.</p>
          </div>
          <div className="candidate-role-grid">
            {view.candidateInsights.map((candidate) => {
              const ranking = view.rankings.find((item) => item.candidateId === candidate.candidateId);
              return <article className="candidate-role-card" key={candidate.candidateId}>
                <small>{ranking ? `${ranking.rank}위 · ${ranking.score}점` : `${candidate.score}점`}</small>
                <h3>{candidate.displayName} · {candidate.insightTitle}</h3>
                <p>{candidate.oneLine}</p>
                <strong>{candidate.practicalTip}</strong>
              </article>;
            })}
          </div>
        </section>

        <section className="comparison-section" aria-labelledby="summary-metrics-title">
          <div className="comparison-section-heading">
            <p className="card-label">공통 지표 비교</p>
            <h2 id="summary-metrics-title">연락부터 장기관계까지 같은 기준으로 비교</h2>
            <p>연락·대화, 편안함·신뢰, 갈등 회복, 생활·장기관계를 같은 기준으로 비교했어요.</p>
          </div>
          <CommonMetricsHeatmapMatrix view={view} />
          <div className="summary-metric-list">
            {view.summaryMetrics.map((metric) => (
              <article className="summary-metric-card" key={metric.id}>
                <div className="summary-metric-copy">
                  <h3>{metric.label}</h3>
                  <p>{metric.description}</p>
                </div>
                <div className="summary-candidate-list">
                  {[...metric.values].sort((a, b) => b.score - a.score).map((candidate) => (
                    <div className="summary-candidate" key={candidate.candidateId}>
                      <div>
                        <span>{candidate.displayName}</span>
                        <strong>{formatScore(candidate.score)}</strong>
                      </div>
                      <div className="comparison-track" aria-label={`${candidate.displayName} ${metric.label} ${formatScore(candidate.score)}점`}>
                        <span style={{ width: `${Math.max(0, Math.min(100, candidate.score))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="comparison-section" aria-labelledby="situations-title">
          <div className="comparison-section-heading">
            <p className="card-label">상황별 추천</p>
            <h2 id="situations-title">연락·갈등·장기관계, 누구와 더 편한가</h2>
            <p>차이가 2점 이내이거나 출생시간 변수의 범위가 겹치면 공동 추천으로 표시해요.</p>
          </div>
          <div className="situation-grid">
            {view.recommendations.map((recommendation) => (
              <article className="situation-card" key={recommendation.id}>
                <div className="situation-card-head">
                  <span>{recommendation.label}</span>
                  {recommendation.shared ? <small>공동 추천</small> : <small>추천</small>}
                </div>
                <strong>{recommendation.displayNames.join(" · ")}</strong>
                <p>{recommendation.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="comparison-section" aria-labelledby="candidate-insights-title">
          <div className="comparison-section-heading">
            <p className="card-label">후보별 강점과 주의</p>
            <h2 id="candidate-insights-title">각 후보와 실제로 잘 맞는 장면과 부딪힐 장면</h2>
            <p>연락, 약속, 생활 습관, 갈등 뒤 대화처럼 실제로 겪을 장면으로 풀었어요.</p>
          </div>
          <div className="candidate-insight-list">
            {view.candidateInsights.map((candidate, index) => (
              <details className="candidate-insight" key={candidate.candidateId} open={index === 0}>
                <summary>
                  <span><b>{candidate.displayName}</b> · {candidate.insightTitle}</span>
                  <strong>{candidate.score}점</strong>
                </summary>
                <div className="candidate-insight-body">
                  <p className="comparison-summary">{candidate.oneLine}</p>
                  <div className="candidate-insight-column strength-tone">
                    <h3>잘 맞는 지점 <span className="stock-badge-tag is-up">호재</span></h3>
                    {candidate.strengths.map((strength) => (
                      <div key={`${strength.label}-${strength.copy}`}>
                        <strong>{strength.label}</strong>
                        <p>{strength.copy}</p>
                      </div>
                    ))}
                  </div>
                  <div className="candidate-insight-column caution-tone">
                    <h3>조율할 지점 <span className="stock-badge-tag is-flat">리스크</span></h3>
                    {candidate.cautions.map((caution) => (
                      <div key={`${caution.label}-${caution.copy}`}>
                        <strong>{caution.label}</strong>
                        <p>{caution.copy}</p>
                      </div>
                    ))}
                  </div>
                  <div className="candidate-tip">
                    <span>바로 해볼 것</span>
                    <p>{candidate.practicalTip}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="comparison-section" aria-labelledby="detail-score-title">
          <details className="detail-score-panel">
            <summary>
              <span>
                <small className="card-label">상세 후보 리포트</small>
                <strong id="detail-score-title">관계 9개 기준 상세 점수</strong>
              </span>
              <b>펼쳐보기</b>
            </summary>
            <div className="detail-table-scroll" tabIndex={0} aria-label="관계 9개 기준 비교표, 좌우로 스크롤 가능">
              <table className="detail-score-table">
                <caption>후보별 연락·생활·갈등·신뢰·장기관계 관련 9개 기준 점수</caption>
                <thead>
                  <tr>
                    <th scope="col">항목</th>
                    {view.rankings.map((candidate) => <th scope="col" key={candidate.candidateId}>{candidate.displayName}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {view.detailedDimensions.map((row) => (
                    <tr key={row.dimension}>
                      <th scope="row">{row.label}</th>
                      {row.values.map((value) => <td key={value.candidateId}>{formatScore(value.score)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section className="comparison-section" aria-labelledby="final-summary-title">
          <div className="comparison-section-heading">
            <p className="card-label">마무리 안내</p>
            <h2 id="final-summary-title">비교 결과를 관계에 쓰는 방법</h2>
            <p>{view.finalSummary}</p>
          </div>
        </section>

        {!demo ? <div className="one-to-many-share-slot"><OneToManyShareCard view={view} /></div> : null}

        <aside className="comparison-method-note">
          <strong>{demo ? "이 화면은 결과 구조 검증용 고정 데모예요." : "점수와 순위는 서버 계산 결과예요."}</strong>
          <p>{demo ? "실제 결과는 3,000원 결제 검증 이후에만 생성합니다." : "AI는 익명화된 계산 근거의 설명만 작성하며 점수·순위·공동 추천 대상을 바꿀 수 없습니다. 이 결과는 복구키로 다시 열 수 있어요."}</p>
        </aside>

        <div className="comparison-actions">
          <Link href="/one-to-many" className="primary-link">새 비교 시작하기</Link>
          <Link href="/" className="secondary-link">홈으로</Link>
        </div>
      </div>
    </main>
  );
}
