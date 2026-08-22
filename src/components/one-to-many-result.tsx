import Link from "next/link";
import type { OneToManyResultView } from "@/lib/compatibility/one-to-many-view";

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function OneToManyResult({ view, demo = false }: { view: OneToManyResultView; demo?: boolean }) {
  return (
    <main className="comparison-report-page">
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
        </header>

        <section className="comparison-section" aria-labelledby="ranking-title">
          <div className="comparison-section-heading">
            <p className="card-label">종합 결과</p>
            <h2 id="ranking-title">한눈에 보는 순위</h2>
            <p>0~2점 차이는 공동 수준으로 보고, 점수 범위가 겹치면 확정적인 우열 표현을 피했어요.</p>
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
                </div>
                <p>{candidate.confidenceLabel}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="comparison-section" aria-labelledby="summary-metrics-title">
          <div className="comparison-section-heading">
            <p className="card-label">쉬운 비교</p>
            <h2 id="summary-metrics-title">연락부터 장기관계까지 한눈에</h2>
            <p>연락·대화, 편안함·신뢰, 갈등 회복, 생활·장기관계를 같은 기준으로 비교했어요.</p>
          </div>
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
            <p className="card-label">후보별 해석</p>
            <h2 id="candidate-insights-title">실제 관계에서 잘 맞는 장면과 부딪힐 장면</h2>
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
                    <h3>잘 맞는 지점</h3>
                    {candidate.strengths.map((strength) => (
                      <div key={`${strength.label}-${strength.copy}`}>
                        <strong>{strength.label}</strong>
                        <p>{strength.copy}</p>
                      </div>
                    ))}
                  </div>
                  <div className="candidate-insight-column caution-tone">
                    <h3>조율할 지점</h3>
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
                <small className="card-label">분석 근거</small>
                <strong id="detail-score-title">관계 9개 기준 상세 점수</strong>
              </span>
              <b>펼쳐보기</b>
            </summary>
            <div className="detail-table-scroll" tabIndex={0} aria-label="명리 9개 항목 비교표, 좌우로 스크롤 가능">
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
