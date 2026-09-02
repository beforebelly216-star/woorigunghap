"use client";

import Link from "next/link";

export default function OneToManyDemoError({ reset }: { reset: () => void }) {
  return (
    <main className="comparison-report-page one-to-many-result-page">
      <div className="comparison-empty-state" role="alert">
        <p className="eyebrow">결과 불러오기 실패</p>
        <h1>비교 결과를 준비하지 못했어요.</h1>
        <p>잠시 후 다시 시도해 줘. 입력 화면으로 돌아가도 저장된 임시 입력은 유지돼.</p>
        <div className="comparison-actions">
          <button type="button" className="primary-link button-link" onClick={reset}>다시 시도</button>
          <Link href="/one-to-many" className="secondary-link">입력으로 돌아가기</Link>
        </div>
      </div>
    </main>
  );
}
