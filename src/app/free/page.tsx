import Link from "next/link";
import { ZootopiMark } from "@/components/zootopi-mark";
import { FreeSelfAnalysis } from "@/components/free-self-analysis";
import "../../components/zootopi-mark.css";
import styles from "./free-page.module.css";

export default function FreeSelfAnalysisPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar} aria-label="무료 분석 이동">
          <Link href="/" className={styles.back}>← 홈</Link>
          <span className={styles.freeBadge}>무료 · 결제 없음</span>
        </nav>

        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>FREE ANALYSIS</p>
            <h1>
              내 관계 성향을
              <br />
              <span>무료로 알아보세요.</span>
            </h1>
            <p className={styles.lead}>생년월일시를 입력하면 관계에서 반복되는 내 패턴 네 가지를 먼저 보여드립니다.</p>
          </div>
          <div className={styles.mascotWrap} aria-hidden="true">
            <ZootopiMark expression="idea" withBody className={styles.mascot} />
          </div>
        </header>

        <div className={styles.content}>
          <FreeSelfAnalysis />
        </div>
      </div>
    </main>
  );
}
