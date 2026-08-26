import Link from "next/link";
import { Suspense } from "react";
import { OneToOneFormV3 } from "@/components/one-to-one-form-v3";
import styles from "./one-to-one-flow.module.css";
import inputStyles from "./one-to-one-input-v3.module.css";

export default function OneToOnePage() {
  return (
    <main className={`${styles.page} ${inputStyles.inputV3}`}>
      <div className={styles.shell}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <header className={styles.header}>
          <p className={styles.eyebrow}>1:1 관계 궁합 · 3단계</p>
          <h1>두 사람을 차례로 입력해 주세요.</h1>
          <p>
            내 정보와 관계 → 상대방 정보 → 확인 순서로 진행합니다. 출생시간은 24시간제 HHMM으로 입력하고, 모르면 시간 없이도 분석할 수 있습니다.
          </p>
        </header>
        <Suspense fallback={<p className="checkout-state">입력 화면을 준비하는 중이에요.</p>}>
          <OneToOneFormV3 />
        </Suspense>
      </div>
    </main>
  );
}
