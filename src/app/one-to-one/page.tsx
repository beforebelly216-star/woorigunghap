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
            입력한 정보는 궁합 계산에 사용돼요. 출생시간을 모르면 ‘시간 모름’을 선택할 수 있습니다.
          </p>
        </header>
        <Suspense fallback={<p className="checkout-state">입력 화면을 준비하는 중이에요.</p>}>
          <OneToOneForm />
        </Suspense>
      </div>
    </main>
  );
}
