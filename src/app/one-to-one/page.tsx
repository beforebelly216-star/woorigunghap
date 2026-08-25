import Link from "next/link";
import { Suspense } from "react";
import { OneToOneForm } from "@/components/one-to-one-form";
import styles from "./one-to-one-flow.module.css";

export default function OneToOnePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.backLink}>← 홈으로</Link>
        <header className={styles.header}>
          <p className={styles.eyebrow}>1:1 관계 궁합</p>
          <h1>두 사람의 정보를 알려주세요.</h1>
          <p>
            두 사람의 생년월일은 모두 필요합니다. 상대의 출생시간까지 알면 정보 수준 A, 생년월일만 알고 시간을 모르면 정보 수준 B로 분석합니다. B는 가능한 시주를 함께 비교해 점수 범위와 해석 불확실성을 표시합니다.
          </p>
          <p>
            이름 칸에는 실명 대신 별칭을 써도 됩니다. 결과에서는 입력한 이름 또는 별칭을 “OOO님”처럼 직접 불러 더 읽기 쉽게 보여드리며, 이름·별칭 원문은 AI 서술 생성 요청에 전달하지 않습니다.
          </p>
        </header>
        <Suspense fallback={<p className="checkout-state">입력 화면을 준비하는 중이에요.</p>}>
          <OneToOneForm />
        </Suspense>
      </div>
    </main>
  );
}
