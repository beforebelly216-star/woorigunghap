import Link from "next/link";
import { ZootopiMark } from "@/components/zootopi-mark";
import { SoulmateInputForm } from "@/components/soulmate-input-form";
import "../../components/zootopi-mark.css";
import "../input-reference-v4.css";
import styles from "./free-page.module.css";

export default function FreeSoulmatePage() {
  return (
    <main className={`${styles.page} reference-input-screen free-soulmate-page`}>
      <div className={styles.shell}>
        <header className={styles.brandRow}>
          <Link href="/" className={styles.brand}><ZootopiMark expression="smile" /><strong>우리사주</strong></Link>
          <span className={styles.badge}>🎁 무료 · 1분이면 끝나요</span>
        </header>

        <section className={styles.hero}>
          <div className={styles.copy}>
            <h1>당신의 천생연분을<br/><span>무료로</span> 알아보세요</h1>
            <p>정확한 분석을 위해 정보를 입력해주세요</p>
          </div>
          <div className={styles.heroMascot} aria-hidden="true">
            <span className={styles.heartOne}>♥</span><span className={styles.heartTwo}>♥</span>
            <ZootopiMark expression="idea" withBody />
          </div>
        </section>

        <SoulmateInputForm />
      </div>
    </main>
  );
}
