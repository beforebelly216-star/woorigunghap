import Link from "next/link";

export default function OneToManyResultEmptyPage() {
  return (
    <main className="comparison-report-page">
      <div className="comparison-empty-state">
        <p className="eyebrow">1:다 비교 결과</p>
        <h1>아직 표시할 결과가 없어요.</h1>
        <p>비교 정보를 입력한 뒤 결제를 완료하면 이곳에서 결과를 볼 수 있어요. 현재는 Day 15 화면 구성을 확인할 수 있는 고정 데모를 제공합니다.</p>
        <div className="comparison-actions">
          <Link href="/one-to-many" className="primary-link">비교 정보 입력하기</Link>
          <Link href="/one-to-many/result/demo" className="secondary-link">고정 데모 보기</Link>
        </div>
      </div>
    </main>
  );
}
