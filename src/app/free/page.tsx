import Link from "next/link";
import { FreeSelfAnalysis } from "@/components/free-self-analysis";

export default function FreeSelfAnalysisPage() {
  return (
    <main className="input-page">
      <div className="input-shell">
        <Link href="/" className="back-link compact">← 홈으로</Link>
        <header className="input-header">
          <p className="eyebrow">0원 · 결제 없음</p>
          <h1>먼저, 내가 관계에서 어떤 사람인지.</h1>
          <p>
            상대와의 궁합을 보기 전에 내 관계 패턴부터 확인해 보세요. 한 사람의 사주에서 관계에 드러나는 강점, 사람을 읽는 장면, 꼬이기 쉬운 지점과 잘 맞는 관계 리듬을 짧게 보여드립니다.
          </p>
          <p>
            무료 결과가 잘 맞는다고 느껴졌을 때만, 그다음에 궁금한 사람과의 1:1 또는 여러 사람 비교 궁합으로 이어가면 됩니다.
          </p>
        </header>
        <FreeSelfAnalysis />
      </div>
    </main>
  );
}
