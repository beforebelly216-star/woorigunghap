import Link from "next/link";
import styles from "./home-p5.module.css";
import { HomeRecentReports } from "./home-recent-reports";

function LineIcon({ kind }: { kind: "heart" | "people" | "spark" | "home" | "library" | "person" }) {
  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    people: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" /></>,
    spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />,
    home: <><path d="m3 10 9-7 9 7v10H3V10Z" /><path d="M9 20v-7h6v7" /></>,
    library: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 5V3h8v2M8 10h8M8 15h5" /></>,
    person: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

export default function Home() {
  return <main className={`${styles.page} home-mobile-page`}>
    <section className={styles.intro} aria-labelledby="home-title">
      <p className={styles.eyebrow}>우리 사이를 이해하는 시간</p>
      <h1 id="home-title">잘 맞는 순간도,<br />다른 이유도 알아보세요.</h1>
      <p className={styles.introCopy}>두 사람의 성향부터 친구들과의 관계까지.<br />우리 사이를 조금 더 선명하게 살펴보세요.</p>
    </section>
    <section className={styles.services} aria-labelledby="services-title">
      <div className={styles.sectionTitle}><h2 id="services-title">어떤 관계가 궁금하세요?</h2></div>
      <Link href="/one-to-one" className={styles.featureCard}>
        <div className={styles.featureTop}><span className={styles.serviceIcon}><LineIcon kind="heart" /></span><span className={styles.price}>1,000원 · 1회 결제</span></div>
        <h3>두 사람 궁합</h3>
        <p>서로의 강점과 반복되는 갈등,<br />관계에서 조율할 부분을 알아보세요.</p>
        <span className={styles.featureAction}>두 사람 궁합 보기 <span aria-hidden="true">→</span></span>
      </Link>
      <div className={styles.serviceList}>
        <Link href="/one-to-many" className={styles.serviceRow}>
          <span className={styles.serviceIcon}><LineIcon kind="people" /></span>
          <div><h3>친구들과 관계 보기 <span>무료</span></h3><p>초대 링크로 함께 만드는 인연 네트워크</p></div>
          <span className={styles.chevron} aria-hidden="true">›</span>
        </Link>
        <Link href="/free" className={styles.serviceRow}>
          <span className={styles.serviceIcon}><LineIcon kind="spark" /></span>
          <div><h3>나와 잘 맞는 사람 <span>무료</span></h3><p>내 성향을 바탕으로 살펴보는 이상형</p></div>
          <span className={styles.chevron} aria-hidden="true">›</span>
        </Link>
      </div>
    </section>
    <HomeRecentReports />
    <nav className={styles.bottomNav} aria-label="주요 메뉴">
      <Link href="/" className={styles.active} aria-current="page"><LineIcon kind="home" /><span>홈</span></Link>
      <Link href="/account/reports"><LineIcon kind="library" /><span>보관함</span></Link>
      <Link href="/login"><LineIcon kind="person" /><span>내 계정</span></Link>
    </nav>
  </main>;
}
