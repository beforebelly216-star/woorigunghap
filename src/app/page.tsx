import Link from "next/link";
import "./report-theme.css";
import "../components/zootopi-mark.css";
import styles from "./home-p5.module.css";
import { ZootopiCaption } from "@/components/zootopi-mark";

function SajuBoyMark() {
  return <div className={styles.mascot} aria-hidden="true">
    <svg viewBox="0 0 92 92">
      <circle cx="46" cy="46" r="40" className={styles.face} />
      <path d="M24 38c5-17 39-20 46 0-11-4-15-10-23-9-8 0-14 6-23 9Z" className={styles.hair} />
      <circle cx="35" cy="48" r="10" className={styles.glass} />
      <circle cx="57" cy="48" r="10" className={styles.glass} />
      <path d="M45 48h2M39 64c5 4 10 4 15 0" className={styles.line} />
      <path d="M22 80c7-11 41-11 48 0" className={styles.robe} />
    </svg>
  </div>;
}

export default function Home() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>사주소년이 찾는 우리 사이의 단서</p>
        <h1>사주는 어렵게 말고,<br /><span>우리 관계 이야기로.</span></h1>
        <p className={styles.lead}>먼저 내 사주에서 관계에 드러나는 패턴을 무료로 확인하고, 잘 맞는다고 느껴질 때 궁금한 사람과의 관계를 더 깊게 볼 수 있어요.</p>
        <div className={styles.heroActions}>
          <Link href="/free" className={styles.primaryAction}>무료로 내 관계 성향 보기</Link>
          <Link href="#paid-reports" className={styles.secondaryAction}>유료 궁합은 그다음에</Link>
        </div>
      </div>
      <aside className={styles.boyCard}>
        <SajuBoyMark />
        <div><small>사주소년 용한</small><strong>“상대 보기 전에, 내가 관계에서 어떤 사람인지부터.”</strong><p>내 관계 강점, 사람을 읽는 장면, 자주 꼬이는 지점과 잘 맞는 관계 리듬을 짧게 먼저 보여드릴게요.</p></div>
      </aside>
    </section>

    <section className={styles.productSection} id="paid-reports" aria-labelledby="home-products-title">
      <div className={styles.sectionHeading}><small>AFTER YOUR FREE RESULT</small><h2 id="home-products-title">무료 결과 다음, 정말 궁금한 관계만 더 깊게.</h2></div>
      <div className={styles.productGrid}>
        <article className={`${styles.productCard} ${styles.featured}`}>
          <div className={styles.cardTop}><span>한 사람이 궁금할 때</span><b>1:1</b></div>
          <h3>한 사람과의 관계를 깊게</h3>
          <p>짝사랑 · 썸 · 연인 · 친구 · 직장동료. 두 사람의 사주팔자, 9개 궁합 지표, 속마음 번역, 갈등·회복과 실전 관계 매뉴얼까지 확인합니다.</p>
          <ul><li>CH0~CH9 상세 리포트</li><li>60일주 캐릭터 + 9축 궁합</li><li>완성 결과 저장·재열람</li></ul>
          <ZootopiCaption expression="idea">이 관계, 인연 주가 지수로 한 번 볼래?</ZootopiCaption>
          <div className={styles.price}><strong>1,000원</strong><span>1회 결제</span></div>
          <Link href="/one-to-one" className={styles.cardAction}>1:1 궁합 시작하기</Link>
        </article>
        <article className={styles.productCard}>
          <div className={styles.cardTop}><span>비교가 필요할 때</span><b>1:N</b></div>
          <h3>여러 관계를 한눈에 비교</h3>
          <p>기준자 1명과 후보 2~5명을 같은 계산 기준으로 비교해 연락·대화, 신뢰, 갈등 회복, 생활·장기관계를 순위와 함께 봅니다.</p>
          <ul><li>후보별 강점·조율 포인트</li><li>관계 기준 직접 비교</li><li>2~5명 후보 지원</li></ul>
          <div className={styles.price}><strong>3,000원</strong><span>1회 결제</span></div>
          <Link href="/one-to-many" className={styles.cardAction}>여러 명 비교하기</Link>
        </article>
      </div>
    </section>
  </main>;
}
