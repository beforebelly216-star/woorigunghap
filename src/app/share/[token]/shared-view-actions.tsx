"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trackGrowthEvent } from "@/lib/growth-analytics-client";
import type {
  GrowthCtaTarget,
  GrowthEventProduct,
  GrowthRelationshipType,
  SharedViewReaction,
} from "@/lib/growth-analytics-contract";
import styles from "./shared-view.module.css";

type SharedViewActionsProps = {
  token: string;
  product: GrowthEventProduct;
  relationshipType: GrowthRelationshipType;
  disclosureCopy: string;
};

const REACTIONS: Array<{ value: SharedViewReaction; label: string }> = [
  { value: "pretty_match", label: "꽤 맞음" },
  { value: "half", label: "반반" },
  { value: "not_really", label: "아닌데" },
];

export function SharedViewActions({ token, product, relationshipType, disclosureCopy }: SharedViewActionsProps) {
  const [reaction, setReaction] = useState<SharedViewReaction | null>(null);
  const trackedOpen = useRef(false);

  useEffect(() => {
    if (trackedOpen.current) return;
    trackedOpen.current = true;
    trackGrowthEvent({
      eventName: "shared_view_open",
      product,
      relationshipType,
      surface: "shared_view",
      shareToken: token,
    });
  }, [product, relationshipType, token]);

  function chooseReaction(nextReaction: SharedViewReaction) {
    if (reaction) return;
    setReaction(nextReaction);
    trackGrowthEvent({
      eventName: "shared_view_reaction",
      product,
      relationshipType,
      surface: "shared_view",
      reaction: nextReaction,
      shareToken: token,
    });
  }

  function trackCta(target: GrowthCtaTarget) {
    const common = {
      product,
      relationshipType,
      surface: "shared_view" as const,
      ctaTarget: target,
      shareToken: token,
    };
    trackGrowthEvent({ eventName: "shared_view_cta_click", ...common });
    trackGrowthEvent({ eventName: "shared_view_new_report_start", ...common });
  }

  const primaryTarget: GrowthCtaTarget = product === "oneToOne" ? "oneToOne" : "oneToMany";
  const secondaryTarget: GrowthCtaTarget = product === "oneToOne" ? "oneToMany" : "oneToOne";
  const primaryHref = primaryTarget === "oneToOne" ? "/one-to-one" : "/one-to-many";
  const secondaryHref = secondaryTarget === "oneToOne" ? "/one-to-one" : "/one-to-many";
  const primaryLabel = primaryTarget === "oneToOne" ? "나도 1:1 궁합 보기" : "나도 인연 네트워크 만들기";
  const secondaryLabel = secondaryTarget === "oneToOne" ? "1:1 궁합 보기" : "무료 인연 네트워크 만들기";

  return <>
    <section className={styles.reactionCard} aria-labelledby="shared-view-reaction-title">
      <small>YOUR REACTION</small>
      <h2 id="shared-view-reaction-title">이 결과, 얼마나 맞아 보여요?</h2>
      <div className={styles.reactionButtons} role="group" aria-label="공유 결과 반응">
        {REACTIONS.map((option) => <button
          type="button"
          key={option.value}
          className={reaction === option.value ? styles.reactionButtonActive : styles.reactionButton}
          aria-pressed={reaction === option.value}
          disabled={reaction !== null}
          onClick={() => chooseReaction(option.value)}
        >{option.label}</button>)}
      </div>
      <p className={styles.reactionNote} aria-live="polite">
        {reaction ? "반응 고마워요. 이제 내 관계도 같은 방식으로 확인해볼 수 있어요." : "한 번 골라보면 내 관계를 확인하는 다음 단계가 열려요."}
      </p>
    </section>

    {reaction && <section className={styles.cta}>
      <p>{disclosureCopy}</p>
      <Link href={primaryHref} className={styles.primary} onClick={() => trackCta(primaryTarget)}>{primaryLabel}</Link>
      <Link href={secondaryHref} className={styles.secondary} onClick={() => trackCta(secondaryTarget)}>{secondaryLabel}</Link>
    </section>}
  </>;
}
