import Link from "next/link";
import "./report-theme.css";
import styles from "./home-p5.module.css";

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
        <p className={styles.lead}>두 사람의 생년월일시와 관계 유형을 계산해 연락, 갈등, 신뢰, 생활 리듬과 장기관계까지 실제로 읽히는 궁합 리포트로 풀어드려요.</p>
        <div className={styles.heroActions}>
          <Link href="/one-to-one" className={styles.primaryAction}>1:1 궁합 보기 · 1,000원</Link>
          <Link href="/one-to-many" className={styles.secondaryAction}>여러 명 비교하기</Link>
        </div>
      </div>
      <aside className={styles.boyCard}>
        <SajuBoyMark />
        <div><small>사주소년 용한</small><strong>“점수만 보고 끝내면 아쉽잖아요.”</strong><p>둘이 잘 통하는 장면과 자꾸 꼬이는 장면을 찾아서, 실제 관계에서 써먹을 단서까지 정리해 드릴게요.</p></div>
      </aside>
    </section>

    <section className={styles.productSection} aria-labelledby="home-products-title">
      <div className={styles.sectionHeading}><small>CHOOSE YOUR REPORT</small><h2 id="home-products-title">지금 궁금한 관계부터 골라보세요.</h2></div>
      <div className={styles.productGrid}>
        <article className={`${styles.productCard} ${styles.featured}`}>
          <div className={styles.cardTop}><span>가장 먼저 추천</span><b>1:1</b></div>
          <h3>한 사람과의 관계를 깊게</h3>
          <p>짝사랑 · 썸 · 연인 · 친구 · 직장동료. 두 사람의 사주팔자, 9개 궁합 지표, 속마음 번역, 갈등·회복과 실전 관계 매뉴얼까지 확인합니다.</p>
          <ul><li>CH0~CH9 상세 리포트</li><li>60일주 캐릭터 + 9축 궁합</li><li>완성 결과 저장·재열람</li></ul>
          <div className={styles.price}><strong>1,000원</strong><span>1회 결제</span></div>
          <Link href="/one-to-one" className={styles.cardAction}>두 사람 정보 입력하기</Link>
        </article>
        <article className={styles.productCard}>
          <div className={styles.cardTop}><span>비교가 필요할 때</span><b>1:N</b></div>
          <h3>여러 관계를 한눈에 비교</h3>
          <p>기준자 1명과 후보 2~5명을 같은 계산 기준으로 비교해 연락·대화, 신뢰, 갈등 회복, 생활·장기관계를 순위와 함께 봅니다.</p>
          <ul><li>후보별 강점·조율 포인트</li><li>관계 기준 직접 비교</li><li>2~5명 후보 지원</li></ul>
          <div className={styles.price}><strong>3,000원</strong><span>1회 결제</span></div>
          <Link href="/one-to-many" className={styles.cardAction}>비교 정보 입력하기</Link>
        </article>
      </div>
    </section>

    <section className={styles.trustStrip} aria-label="우리사주 리포트 원칙">
      <div><strong>계산은 서버가</strong><span>사주와 궁합 점수는 결정론적으로 계산합니다.</span></div>
      <div><strong>AI는 서술만</strong><span>계산값을 바꾸지 않고 읽기 쉬운 관계 이야기로 풀어냅니다.</span></div>
      <div><strong>결제 후 생성</strong><span>결제가 확인된 뒤에만 유료 상세 리포트를 생성합니다.</span></div>
    </section>
    <p className={styles.notice}>전통 명리 해석을 바탕으로 관계의 패턴을 살펴보는 콘텐츠이며, 실제 관계 판단은 두 사람의 대화와 행동을 함께 확인해 주세요.</p>
  </main>;
}
