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
        <p className={inputStyles.visuallyHidden}>
          실명 대신 별칭을 입력해도 돼. 결과에서는 입력한 이름이나 별칭을 “OOO님”처럼 표시하고, 이름·별칭 원문은 AI 서술 생성 요청에 전달하지 않아.
        </p>
        <Suspense fallback={<p className="checkout-state">입력 화면을 준비하고 있어.</p>}>
          <OneToOneFormV3 />
        </Suspense>
        <p className={inputStyles.trustLine}>♢ 안전한 분석 · 빠른 결과 · 정확한 궁합</p>
      </div>
    </main>
  );
}
