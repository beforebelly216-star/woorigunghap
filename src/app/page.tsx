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
        <p className={styles.eyebrow}>상대를 보기 전에, 나부터</p>
        <h1>내 관계 패턴부터 알면,<br /><span>궁합이 더 재밌어져요.</span></h1>
        <p className={styles.lead}>한 사람의 생년월일시로 내가 관계에서 어떻게 다가가고, 무엇에 예민하고, 어떤 리듬에서 편해지는지 먼저 무료로 확인해 보세요. 잘 맞는다고 느껴지면 그때 궁금한 사람과의 상세 궁합으로 이어가면 됩니다.</p>
        <div className={styles.heroActions}>
          <Link href="/free" className={styles.primaryAction}>무료로 내 관계 성향 보기</Link>
          <Link href="#paid-reports" className={styles.secondaryAction}>유료 궁합은 어떤 내용인지 보기</Link>
        </div>
      </div>
      <aside className={styles.boyCard}>
        <SajuBoyMark />
        <div><small>사주소년 용한</small><strong>“상대 보기 전에, 나는 어떤 타입인지부터 볼까요?”</strong><p>내 관계 패턴을 먼저 알면 왜 어떤 사람에게는 편하고, 어떤 장면에서는 자꾸 꼬이는지 궁합 결과도 훨씬 쉽게 읽혀요.</p></div>
      </aside>
    </section>

    <section className={styles.productSection} aria-labelledby="home-free-title">
      <div className={styles.sectionHeading}><small>START FREE</small><h2 id="home-free-title">먼저 ‘나’를 보고, 맞으면 상대를 보세요.</h2></div>
      <div className={styles.productGrid}>
        <article className={`${styles.productCard} ${styles.featured}`}>
          <div className={styles.cardTop}><span>첫 방문 추천</span><b>FREE</b></div>
          <h3>내 관계 캐릭터 무료 분석</h3>
          <p>유료 궁합을 사기 전에 한 사람의 기존 만세력 계산으로 관계에서 드러나는 내 패턴을 짧게 확인합니다.</p>
          <ul><li>관계에서 먼저 보이는 강점</li><li>사람을 읽는 장면</li><li>관계가 꼬이기 쉬운 지점</li><li>잘 맞는 관계 리듬</li></ul>
          <div className={styles.price}><strong>0원</strong><span>결제 없음</span></div>
          <Link href="/free" className={styles.cardAction}>무료 결과 바로 보기</Link>
        </article>
        <article className={styles.productCard}>
          <div className={styles.cardTop}><span>무료 결과 다음</span><b>→</b></div>
          <h3>궁합 결제는 궁금한 사람이 생긴 뒤에</h3>
          <p>무료 결과에서 내 패턴이 맞는지 먼저 확인한 뒤, 실제로 궁금한 상대가 있을 때만 상세 궁합을 선택하세요.</p>
          <ul><li>무료 분석에서는 유료 AI 리포트 생성 안 함</li><li>1:1과 여러 명 비교 상품 모두 그대로 유지</li><li>가격은 결제 선택 시점에 명확하게 안내</li></ul>
        </article>
      </div>
    </section>

    <section id="paid-reports" className={styles.productSection} aria-labelledby="home-products-title">
      <div className={styles.sectionHeading}><small>WHEN YOU WANT MORE</small><h2 id="home-products-title">무료 분석 후, 궁금한 사람이 생기면.</h2></div>
      <div className={styles.productGrid}>
        <article className={`${styles.productCard} ${styles.featured}`}>
          <div className={styles.cardTop}><span>한 사람과 깊게</span><b>1:1</b></div>
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
      <div><strong>무료는 계산만</strong><span>무료 자기 분석은 기존 만세력과 편집 카피만 사용하며 유료 AI를 호출하지 않습니다.</span></div>
      <div><strong>AI는 서술만</strong><span>유료 리포트에서도 계산값을 바꾸지 않고 읽기 쉬운 관계 이야기로 풀어냅니다.</span></div>
      <div><strong>결제 후 생성</strong><span>결제가 확인된 뒤에만 유료 상세 리포트를 생성합니다.</span></div>
    </section>
    <p className={styles.notice}>전통 명리 해석을 바탕으로 관계의 패턴을 살펴보는 콘텐츠이며, 실제 관계 판단은 두 사람의 대화와 행동을 함께 확인해 주세요.</p>
  </main>;
}
