import Link from "next/link";
import { Suspense } from "react";
import { OneToOneForm } from "@/components/one-to-one-form";

export default function OneToOnePage() {
  return (
    <main className="input-page">
      <div className="input-shell">
        <Link href="/" className="back-link compact">← 홈으로</Link>
        <header className="input-header">
          <p className="eyebrow">1:1 관계 궁합</p>
          <h1>두 사람의 정보를 알려주세요.</h1>
          <p>
            두 사람의 생년월일은 모두 필요합니다. 상대의 출생시간까지 알면 정보 수준 A, 생년월일만 알고 시간을 모르면 정보 수준 B로 분석합니다. B는 가능한 시주를 함께 비교해 점수 범위와 해석 불확실성을 표시합니다.
          </p>
        </header>
        <Suspense fallback={<p className="checkout-state">입력 화면을 준비하는 중이에요.</p>}>
          <OneToOneForm />
        </Suspense>
      </div>
    </main>
  );
}
