import { ZootopiMark } from "@/components/zootopi-mark";
import { ZootopiBrand } from "@/components/zootopi-brand";
import { SoulmateInputForm } from "@/components/soulmate-input-form";
import "../../components/zootopi-mark.css";
import "../input-reference-v4.css";
import styles from "./free-page.module.css";

export default function FreeSoulmatePage() {
  return (
    <main className={`${styles.page} reference-input-screen free-soulmate-page`}>
      <div className={styles.shell}>
        <header className={styles.brandRow}>
          <ZootopiBrand className={styles.brand} />
          <span className={styles.badge}>🎁 무료 · 1분이면 끝나요</span>
        </header>

        <section className={styles.hero}>
          <div className={styles.copy}>
            <h1>네 천생연분을<br/><span>무료로</span> 알아봐</h1>
            <p>정확하게 보려면 네 정보를 알려줘</p>
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
