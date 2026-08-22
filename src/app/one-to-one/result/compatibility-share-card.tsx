"use client";

import { useState } from "react";
import type { CompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";
import styles from "./compatibility-share-card.module.css";

type CompatibilityShareCardProps = {
  selfName: string;
  partnerName: string;
  relationshipLabel: string;
  score: number;
  archetype: CompatibilityShareArchetype;
};

export function CompatibilityShareCard({
  selfName,
  partnerName,
  relationshipLabel,
  score,
  archetype,
}: CompatibilityShareCardProps) {
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "failed">("idle");

  async function share() {
    const shareText = `우리사주 ${relationshipLabel} 궁합 · ${archetype.label} · ${score}점`;
    const safeUrl = `${window.location.origin}/`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `우리사주 ${relationshipLabel} 궁합`,
          text: shareText,
          url: safeUrl,
        });
        setShareState("shared");
        return;
      }

      await navigator.clipboard.writeText(`${shareText}\n${safeUrl}`);
      setShareState("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareState("failed");
    }
  }

  return <section className={styles.section} aria-labelledby="compatibility-share-card-title">
    <div className={styles.heading}>
      <small>RELATIONSHIP TYPE</small>
      <h2 id="compatibility-share-card-title">우리 둘은 어떤 궁합일까?</h2>
      <p>긴 리포트의 핵심만 뽑은 공유용 카드예요. 생년월일시와 유료 본문은 카드에 담지 않습니다.</p>
    </div>

    <div className={styles.card} data-archetype={archetype.id}>
      <div className={styles.topline}>
        <span>우리사주</span>
        <span>{relationshipLabel} 궁합</span>
      </div>
      <div className={styles.names}>{selfName} <span>×</span> {partnerName}</div>
      <div className={styles.mystery}>사주소년이 찾은 관계의 단서</div>
      <strong className={styles.label}>{archetype.label}</strong>
      <p className={styles.subtitle}>{archetype.subtitle}</p>
      <p className={styles.clue}>{archetype.clue}</p>
      <div className={styles.score}><span>궁합 점수</span><strong>{score}</strong><small>/ 100</small></div>
      <div className={styles.footer}>결과의 일부만 보여주는 공유 카드</div>
    </div>

    <button type="button" className={styles.shareButton} onClick={share}>
      {shareState === "shared" ? "공유했어요" : shareState === "copied" ? "공유 문구를 복사했어요" : "궁합 유형 공유하기"}
    </button>
    {shareState === "failed" && <p className={styles.shareError}>공유 기능을 열지 못했어요. 브라우저 권한을 확인해 주세요.</p>}
    <p className={styles.privacyNote}>공유 버튼은 결제 결과 주소나 접근 토큰을 보내지 않고 우리사주 홈 주소만 공유합니다.</p>
  </section>;
}
