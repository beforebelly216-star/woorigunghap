export default function OneToManyDemoLoading() {
  return (
    <main className="comparison-report-page" aria-busy="true" aria-label="1:다 비교 결과를 준비하는 중">
      <div className="comparison-report-shell comparison-loading">
        <div className="loading-line loading-short" />
        <div className="loading-line loading-title" />
        <div className="loading-line" />
        <div className="loading-card-grid">
          <div className="loading-card" />
          <div className="loading-card" />
          <div className="loading-card" />
        </div>
        <span className="sr-only">비교 결과를 준비하고 있어요.</span>
      </div>
    </main>
  );
}
