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
          <p>
            이름은 실명 대신 별칭을 써도 됩니다. 결과에서는 입력한 이름이나 별칭을 “OOO님”처럼 직접 불러 읽기 쉽게 보여드리며, 이름·별칭 원문은 AI 서술 생성 요청에 전달하지 않습니다.
          </p>
        </header>
        <Suspense fallback={<p className="checkout-state">입력 화면을 준비하는 중이에요.</p>}>
          <OneToOneFormV3 />
        </Suspense>
      </div>
    </main>
  );
}
