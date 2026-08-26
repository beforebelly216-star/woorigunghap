import Link from "next/link";
import "./report-theme.css";
import "../components/zootopi-mark.css";
import styles from "./home-p5.module.css";
import { ZootopiCaption, ZootopiMark } from "@/components/zootopi-mark";

const freeInsights = [
  { index: "01", title: "관계 강점", copy: "사람 사이에서 자연스럽게 잘하는 방식" },
  { index: "02", title: "사람을 읽는 장면", copy: "상대의 반응을 빠르게 알아채는 순간" },
  { index: "03", title: "꼬이기 쉬운 지점", copy: "관계에서 반복해서 힘이 빠지는 패턴" },
  { index: "04", title: "잘 맞는 관계 리듬", copy: "편안함을 느끼기 쉬운 소통과 거리감" },
];

const paidProducts = [
  {
    label: "1:1",
    kicker: "한 사람이 궁금할 때",
    title: "한 사람과의 관계를 깊게",
    price: "1,000원",
    items: ["9개 궁합 지표", "관계별 강점·주의점", "CH0~CH9 상세 리포트"],
  },
  {
    label: "1:N",
    kicker: "여러 관계를 비교할 때",
    title: "2~5명을 같은 기준으로 비교",
    price: "3,000원",
    items: ["후보별 순위·역할", "공통 지표 비교", "후보별 상세 해석"],
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>무료로 먼저 확인</p>
          <h1 id="home-hero-title">
            내 사주가 관계에서
            <br />
            <span>어떻게 드러나는지부터.</span>
          </h1>
          <p className={styles.lead}>
            어려운 사주 용어보다, 실제 사람 사이에서 반복되는 내 관계 패턴을 먼저 짧고 명확하게 보여드립니다.
          </p>
          <Link href="/free" className={styles.primaryAction}>
            무료로 내 관계 성향 보기
            <span aria-hidden="true">→</span>
          </Link>
          <p className={styles.heroNote}>결제 없이 바로 확인 · 유료 궁합은 무료 결과 다음 단계에서 선택</p>
        </div>

        <aside className={styles.heroGuide} aria-label="주토피 안내">
          <div className={styles.heroGuideTop}>
            <span className={styles.guideLabel}>JOOTOPI GUIDE</span>
            <ZootopiMark expression="idea" withBody className={styles.heroMascot} />
          </div>
          <strong>상대를 보기 전에, 내 관계 습관부터 보면 훨씬 쉬워.</strong>
          <p>무료 결과에서는 네 사주에서 관계에 드러나는 핵심 패턴 네 가지만 먼저 보여줄게.</p>
        </aside>
      </section>

      <section className={styles.insightSection} aria-labelledby="free-insight-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>FREE ANALYSIS</p>
            <h2 id="free-insight-title">3분 안에, 이 네 가지를 먼저 봅니다.</h2>
          </div>
          <span className={styles.sectionMeta}>결과는 결정론적 사주 계산 기반</span>
        </div>

        <div className={styles.insightGrid}>
          {freeInsights.map((insight) => (
            <article className={styles.insightCard} key={insight.index}>
              <span className={styles.insightIndex}>{insight.index}</span>
              <div>
                <h3>{insight.title}</h3>
                <p>{insight.copy}</p>
              </div>
            </article>
          ))}
        </div>

        <ZootopiCaption expression="smile">복잡한 명식표보다 먼저, 네가 사람 사이에서 어떻게 움직이는지부터 볼 거야.</ZootopiCaption>
      </section>

      <section className={styles.productSection} aria-labelledby="paid-reports-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>AFTER FREE RESULT</p>
            <h2 id="paid-reports-title">더 궁금해졌다면, 그때 관계를 깊게 봅니다.</h2>
          </div>
          <span className={styles.sectionMeta}>1회 결제 · 완성 결과 저장·재열람</span>
        </div>

        <div className={styles.productGrid}>
          {paidProducts.map((product) => (
            <article className={styles.productCard} key={product.label}>
              <div className={styles.productTop}>
                <div>
                  <span className={styles.productKicker}>{product.kicker}</span>
                  <h3>{product.title}</h3>
                </div>
                <span className={styles.productBadge}>{product.label}</span>
              </div>
              <ul>
                {product.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className={styles.priceRow}>
                <strong>{product.price}</strong>
                <span>1회 결제</span>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.bottomCta}>
          <div>
            <strong>아직 누구와 볼지 정하지 않아도 됩니다.</strong>
            <p>무료로 내 관계 성향을 먼저 확인한 뒤 1:1 또는 1:N을 선택하세요.</p>
          </div>
          <Link href="/free" className={styles.secondaryAction}>
            무료 분석부터 시작하기
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
