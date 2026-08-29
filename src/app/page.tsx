import Link from "next/link";
import "./report-theme.css";
import "../components/zootopi-mark.css";
import styles from "./home-p5.module.css";
import { ZootopiMark } from "@/components/zootopi-mark";
import { HomeRecentReports } from "./home-recent-reports";

function HeartIcon() {
  return <svg viewBox="0 0 64 54" aria-hidden="true"><path d="M32 49C23 40 6 31 6 17 6 8 12 3 20 3c6 0 10 3 12 8 2-5 6-8 12-8 8 0 14 5 14 14 0 14-17 23-26 32Z" fill="#ff6f89" stroke="#202024" strokeWidth="2.2"/><path d="M43 39c4-2 8 1 8 5 0 5-6 8-9 11-3-3-9-6-9-11 0-4 4-7 8-5l1 2 1-2Z" fill="#ff8aa0" stroke="#202024" strokeWidth="1.7"/></svg>;
}
function PeopleIcon() {
  return <svg viewBox="0 0 72 56" aria-hidden="true"><circle cx="20" cy="18" r="9" fill="#f3eaff" stroke="#202024" strokeWidth="2"/><circle cx="36" cy="13" r="10" fill="#eadcff" stroke="#202024" strokeWidth="2"/><circle cx="52" cy="18" r="9" fill="#f8eafa" stroke="#202024" strokeWidth="2"/><path d="M7 48c1-11 7-17 13-17s12 6 13 17M23 48c1-14 7-21 13-21s12 7 13 21M39 48c1-11 7-17 13-17s12 6 13 17" fill="#fff" stroke="#202024" strokeWidth="2" strokeLinecap="round"/></svg>;
}
function TrendChart() {
  return <svg className={styles.chartSvg} viewBox="0 0 300 95" role="img" aria-label="관계 흐름 예시 차트">
    <path d="M8 72 C30 60,42 48,62 52 S96 47,112 42 S145 36,166 40 S202 50,220 35 S254 30,292 12" fill="none" stroke="#7652d8" strokeWidth="3" strokeLinecap="round"/>
    {[8,62,112,166,220,292].map((x, i) => <circle key={x} cx={x} cy={[72,52,42,40,35,12][i]} r="4.5" fill="#b792ef" />)}
    <circle cx="292" cy="12" r="8" fill="#fff" stroke="#ff6f89" strokeWidth="3"/><path d="M287 10c2-4 7-3 7 1 0 4-5 6-7 8-2-2-7-4-7-8 0-4 5-5 7-1Z" fill="#ff6f89"/>
  </svg>;
}
export default function Home() {
  return (
    <main className={`${styles.page} home-mobile-page`}>
      <section className={styles.heroCard}>
        <div className={styles.heroText}><h1>당신의 궁합,<br/>지금 확인해보세요</h1><p>우리의 인연을 명확하게</p><span>1:1 1,000원 <b>|</b> 1:N 3,000원</span></div>
        <div className={styles.heroArt}><span className={styles.sparkleOne}>✦</span><span className={styles.sparkleTwo}>✦</span><ZootopiMark expression="idea" withBody /></div>
      </section>

      <section className={styles.quickGrid} aria-label="궁합 상품 선택">
        <Link href="/free" className={`${styles.quickCard} ${styles.soulmate}`}>
          <strong>무료 천생연분</strong><span>내 짝의 사주 보기</span><div className={styles.soulmateIcon}><ZootopiMark expression="smile" /></div>
        </Link>
        <Link href="/one-to-one" className={`${styles.quickCard} ${styles.oneToOne}`}><strong>1:1 궁합</strong><span>둘의 궁합 보기</span><HeartIcon /></Link>
        <Link href="/one-to-many" className={`${styles.quickCard} ${styles.oneToMany}`}><strong>1:N 궁합</strong><span>여러 사람 비교</span><PeopleIcon /></Link>
      </section>

      <HomeRecentReports />

      <section className={styles.flowCard}><div className={styles.flowHeader}><h2>관계 흐름 한눈에 보기</h2><button type="button">주간⌄</button></div><TrendChart /><div className={styles.chartLabels}><span>7/10</span><span>7/11</span><span>7/12</span><span>7/13</span><span>오늘</span></div></section>
      <aside className={styles.tipCard}><div><strong>주토피의 오늘의 한마디 💛</strong><p>인연은 기다리는 사람이 아니라,<br/>준비된 사람이 알아보는 거예요!</p></div><ZootopiMark expression="smile" withBody /></aside>
      <nav className={styles.bottomNav} aria-label="주요 메뉴"><Link href="/" className={styles.active}><span>⌂</span><b>홈</b></Link><Link href="/account/reports"><span>▣</span><b>보관함</b></Link><Link href="/"><span>☆</span><b>이벤트</b></Link><Link href="/login"><span>♙</span><b>마이페이지</b></Link></nav>
    </main>
  );
}
