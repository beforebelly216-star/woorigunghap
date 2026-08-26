import Link from "next/link";
import { Suspense } from "react";
import { OneToOneFormV3 } from "@/components/one-to-one-form-v3";
import "../input-reference-v4.css";
import inputStyles from "./one-to-one-input-v3.module.css";

export default function OneToOnePage() {
  return (
    <main className={`${inputStyles.inputV3} reference-input-screen one-to-one-reference-page`}>
      <div className={inputStyles.shell}>
        <header className={inputStyles.appHeader}>
          <Link href="/" aria-label="홈으로 돌아가기">‹</Link>
          <strong>1:1 궁합 입력</strong>
          <span>?</span>
        </header>
        <Suspense fallback={<p className="checkout-state">입력 화면을 준비하는 중이에요.</p>}>
          <OneToOneFormV3 />
        </Suspense>
        <p className={inputStyles.trustLine}>♢ 안전한 분석 · 빠른 결과 · 정확한 궁합</p>
      </div>
    </main>
  );
}
