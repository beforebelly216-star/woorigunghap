import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isOpaqueToken } from "@/lib/auth-policy";
import { loadPublicShare } from "@/lib/share/public-share-store";
import styles from "./shared-view.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "공유된 관계 결과 | 우리사주",
  description: "친구가 공유한 우리사주 관계 결과의 일부를 확인해 보세요.",
  robots: { index: false, follow: false },
};

export default async function SharedViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token)) notFound();

  const share = await loadPublicShare(token).catch(() => null);
  if (!share) notFound();

  if (share.product === "oneToOne") {
    const names = [share.participants.self, share.participants.partner].filter(Boolean).join(" × ");
    return <main className={styles.page}>
      <article className={styles.shell}>
        <header className={styles.hero}>
          <Link href="/" className={styles.brand}>우리사주</Link>
          <p className={styles.eyebrow}>{share.relationshipLabel} · SHARED VIEW</p>
          <h1>{names || "두 사람"}은 이런 조합이래요.</h1>
          <p className={styles.headline}>{share.headline}</p>
          <p className={styles.summary}>{share.summary}</p>
        </header>

        <section className={styles.scoreCard} aria-label={`공유된 궁합 점수 ${share.score}점`}>
          <span>궁합 점수</span>
          <strong>{share.score}</strong>
          <small>/ 100</small>
        </section>

        <section className={styles.resultCard}>
          <small>관계 유형</small>
          <h2>{share.archetype.label}</h2>
          <p>{share.archetype.subtitle}</p>
          <div className={styles.clue}>{share.archetype.clue}</div>
        </section>

        {(share.strength || share.tuning) && <section className={styles.twoSides} aria-label="공유된 관계 포인트">
          {share.strength && <div><small>{share.strength.label}</small><strong>{share.strength.copy}</strong></div>}
          {share.tuning && <div><small>{share.tuning.label}</small><strong>{share.tuning.copy}</strong></div>}
        </section>}

        <section className={styles.cta}>
          <p>이 결과는 전체 유료 리포트가 아니라 공유용 핵심 내용만 보여줘요.</p>
          <Link href="/one-to-one" className={styles.primary}>나도 1:1 궁합 보기</Link>
          <Link href="/one-to-many" className={styles.secondary}>여러 사람 비교해보기</Link>
        </section>
      </article>
    </main>;
  }

  return <main className={styles.page}>
    <article className={styles.shell}>
      <header className={styles.hero}>
        <Link href="/" className={styles.brand}>우리사주</Link>
        <p className={styles.eyebrow}>1:다 {share.relationshipLabel} · SHARED VIEW</p>
        <h1>{share.referenceName ? `${share.referenceName}의 관계 비교` : "이 관계 비교"}는 이렇게 나왔어요.</h1>
        <p className={styles.headline}>{share.headline}</p>
        <p className={styles.summary}>{share.summary}</p>
      </header>

      <section className={styles.candidateList} aria-label="공유된 관계 비교 핵심 결과">
        {share.candidates.map((candidate, index) => <div className={styles.candidate} key={`${candidate.roleLabel}-${index}`}>
          <small>{candidate.roleLabel}</small>
          <strong>{candidate.displayName || `공유 후보 ${index + 1}`}</strong>
          <span>{candidate.score}점</span>
        </div>)}
      </section>

      <section className={styles.cta}>
        <p>순위 전체나 유료 해설은 공개하지 않고, 공유자가 선택한 핵심 결과만 보여줘요.</p>
        <Link href="/one-to-many" className={styles.primary}>나도 1:다 비교해보기</Link>
        <Link href="/one-to-one" className={styles.secondary}>1:1 궁합 보기</Link>
      </section>
    </article>
  </main>;
}
