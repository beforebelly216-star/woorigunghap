"use client";

import { useEffect, useState } from "react";
import { publicShareTokenFromUrl, trackGrowthEvent } from "@/lib/growth-analytics-client";
import type { CompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";
import { RELATIONSHIP_LABELS, type RelationshipType } from "@/lib/report-input";
import { createPublicShareUrl } from "@/lib/share/public-share-client";
import { buildOneToOnePublicShare } from "@/lib/share/public-share-contract";
import { selectRelationshipShareCopyForArchetype } from "@/lib/share/relationship-share-copy";
import styles from "./compatibility-share-card.module.css";

type CompatibilityShareCardProps = {
  selfName: string;
  partnerName: string;
  relationshipLabel: string;
  score: number;
  archetype: CompatibilityShareArchetype;
};

type ShareSide = { strength: string; tuning: string };
const SHARE_OPTION = { purpose: "recap", eyebrow: "우리 둘의 궁합 한 장 요약" } as const;

const ARCHETYPE_SIDES: Record<CompatibilityShareArchetype["id"], ShareSide> = {
  spark: { strength: "대화·반응 템포", tuning: "말의 속도와 결정 기준" },
  complement: { strength: "서로 다른 역할 보완", tuning: "다른 방식 설명하기" },
  interlock: { strength: "긴장감 속 상호작용", tuning: "부딪힌 뒤 회복 방식" },
  journey: { strength: "관계 속도·타이밍", tuning: "장기 계획의 속도" },
  growth: { strength: "시간이 쌓일수록 보이는 장점", tuning: "꾸준한 표현과 약속" },
  tuning: { strength: "맞춰갈수록 좋아지는 여지", tuning: "연락·거리·역할 기준" },
};

function relationshipTypeForLabel(label: string): RelationshipType {
  const match = Object.entries(RELATIONSHIP_LABELS).find(([, value]) => value === label);
  return (match?.[0] as RelationshipType | undefined) ?? "lover";
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const chars = [...text];
  const lines: string[] = [];
  let line = "";
  for (const char of chars) {
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines = wrapLines(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length;
}

async function createShareImageBlob({
  selfName,
  partnerName,
  relationshipLabel,
  score,
  archetype,
  eyebrow,
  shareCopy,
  sides,
}: CompatibilityShareCardProps & {
  eyebrow: string;
  shareCopy: string;
  sides: ShareSide;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#FFFFFF";
  roundedRect(ctx, 90, 110, 900, 1700, 52);
  ctx.fillStyle = "#7652D8";
  roundedRect(ctx, 90, 110, 900, 16, 8);

  ctx.fillStyle = "#222026";
  ctx.font = "800 42px Pretendard, sans-serif";
  ctx.fillText("우리사주", 160, 220);
  ctx.textAlign = "right";
  ctx.fillText(`${relationshipLabel} 궁합`, 920, 220);
  ctx.textAlign = "left";

  ctx.fillStyle = "#6F6870";
  ctx.font = "700 42px Pretendard, sans-serif";
  ctx.fillText(`${selfName}  ×  ${partnerName}`, 160, 330);

  const contentTop = 430;
  ctx.fillStyle = "#918991";
  ctx.font = "900 28px Pretendard, sans-serif";
  ctx.fillText(eyebrow, 160, contentTop);

  ctx.fillStyle = "#222026";
  ctx.font = "900 62px Pretendard, sans-serif";
  const copyLines = drawTextLines(ctx, shareCopy, 160, contentTop + 105, 760, 78, 5);

  const archetypeY = contentTop + 105 + copyLines * 78 + 48;
  ctx.fillStyle = "#6F6870";
  ctx.font = "700 31px Pretendard, sans-serif";
  ctx.fillText(`궁합 유형 · ${archetype.label}`, 160, archetypeY);

  const recapTop = archetypeY + 62;
  ctx.fillStyle = "#F8F4FF";
  roundedRect(ctx, 150, recapTop, 780, 210, 24);
  ctx.fillStyle = "#222026";
  ctx.font = "700 32px Pretendard, sans-serif";
  drawTextLines(ctx, archetype.subtitle, 195, recapTop + 72, 690, 48, 3);

  ctx.fillStyle = "#FFF3FA";
  roundedRect(ctx, 150, recapTop + 238, 780, 160, 22);
  ctx.fillStyle = "#6F6870";
  ctx.font = "800 25px Pretendard, sans-serif";
  ctx.fillText("잘 맞는 지점", 195, recapTop + 294);
  ctx.fillStyle = "#222026";
  ctx.font = "900 34px Pretendard, sans-serif";
  ctx.fillText(sides.strength, 195, recapTop + 350);

  ctx.fillStyle = "#F8F4FF";
  roundedRect(ctx, 150, recapTop + 426, 780, 160, 22);
  ctx.fillStyle = "#6F6870";
  ctx.font = "800 25px Pretendard, sans-serif";
  ctx.fillText("맞추면 더 좋은 지점", 195, recapTop + 482);
  ctx.fillStyle = "#222026";
  ctx.font = "900 34px Pretendard, sans-serif";
  ctx.fillText(sides.tuning, 195, recapTop + 538);

  ctx.fillStyle = "#7652D8";
  roundedRect(ctx, 260, 1430, 560, 210, 105);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.font = "800 30px Pretendard, sans-serif";
  ctx.fillText("궁합 점수", 540, 1500);
  ctx.font = "900 86px Pretendard, sans-serif";
  ctx.fillText(String(score), 510, 1588);
  ctx.font = "700 28px Pretendard, sans-serif";
  ctx.fillText("/ 100", 625, 1588);
  ctx.textAlign = "left";

  ctx.fillStyle = "#6F6870";
  ctx.font = "600 28px Pretendard, sans-serif";
  ctx.fillText("생년월일시와 유료 본문은 포함되지 않아요", 160, 1730);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("IMAGE_EXPORT_FAILED")), "image/png");
  });
}

export function CompatibilityShareCard({
  selfName,
  partnerName,
  relationshipLabel,
  score,
  archetype,
}: CompatibilityShareCardProps) {
  const relationshipType = relationshipTypeForLabel(relationshipLabel);
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "saved" | "failed">("idle");
  const selectedCopy = selectRelationshipShareCopyForArchetype({
    relationshipType,
    archetypeId: archetype.id,
    purpose: "relationship_label",
    variantSeed: score * 97 + archetype.id.length * 13,
    tone: "clean",
  });
  const shareCopy = selectedCopy.copy;
  const sides = ARCHETYPE_SIDES[archetype.id];

  useEffect(() => {
    trackGrowthEvent({
      eventName: "share_card_open",
      product: "oneToOne",
      relationshipType,
      surface: "one_to_one_share_card",
      sharePurpose: SHARE_OPTION.purpose,
    });
  }, [relationshipType]);

  async function share() {
    const shareText = `우리사주 ${relationshipLabel} 궁합 · ${selfName} × ${partnerName} · ${shareCopy} · ${score}점`;

    try {
      const blob = await createShareImageBlob({ selfName, partnerName, relationshipLabel, score, archetype, eyebrow: SHARE_OPTION.eyebrow, shareCopy, sides });
      const file = new File([blob], "woorisaju-compatibility-recap.png", { type: "image/png" });
      const sharedViewUrl = await createPublicShareUrl(buildOneToOnePublicShare({ relationshipType, relationshipLabel, headline: shareCopy, summary: archetype.subtitle, score, selfName, partnerName, includeDisplayNames: true, archetype, strength: { label: "잘 맞는 지점", copy: sides.strength }, tuning: { label: "맞추면 더 좋은 지점", copy: sides.tuning } }));
      const shareToken = publicShareTokenFromUrl(sharedViewUrl);
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        if (shareToken) trackGrowthEvent({ eventName: "share_native_open", product: "oneToOne", relationshipType, surface: "one_to_one_share_card", sharePurpose: SHARE_OPTION.purpose, shareToken });
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: sharedViewUrl, files: [file] });
        setShareState("shared"); return;
      }
      if (navigator.share) {
        if (shareToken) trackGrowthEvent({ eventName: "share_native_open", product: "oneToOne", relationshipType, surface: "one_to_one_share_card", sharePurpose: SHARE_OPTION.purpose, shareToken });
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: sharedViewUrl });
        setShareState("shared"); return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${sharedViewUrl}`);
      if (shareToken) trackGrowthEvent({ eventName: "share_link_copy", product: "oneToOne", relationshipType, surface: "one_to_one_share_card", sharePurpose: SHARE_OPTION.purpose, shareToken });
      setShareState("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareState("failed");
    }
  }

  async function saveImage() {
    try {
      const blob = await createShareImageBlob({ selfName, partnerName, relationshipLabel, score, archetype, eyebrow: SHARE_OPTION.eyebrow, shareCopy, sides });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "woorisaju-compatibility-recap.png"; link.click();
      trackGrowthEvent({ eventName: "share_image_download", product: "oneToOne", relationshipType, surface: "one_to_one_share_card", sharePurpose: SHARE_OPTION.purpose });
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000); setShareState("saved");
    } catch { setShareState("failed"); }
  }

  return <section className={styles.section} aria-labelledby="compatibility-share-card-title">
    <div className={styles.heading}><small>결과 공유</small><h2 id="compatibility-share-card-title">둘만 보기 아까운 궁합, 한 장으로 보내기</h2><p>두 사람의 이름과 점수, 궁합 유형, 궁금증을 부르는 핵심 단서를 한 장에 담았어.</p></div>
    <div className={styles.card} data-archetype={archetype.id} data-purpose={SHARE_OPTION.purpose}>
      <div className={styles.topline}><span>우리사주</span><span>{relationshipLabel} 궁합</span></div>
      <div className={styles.names}>{selfName} <span>×</span> {partnerName}</div>
      <div className={styles.mystery}>{SHARE_OPTION.eyebrow}</div><strong className={styles.shareCopy}>{shareCopy}</strong><p className={styles.pairType}>궁합 유형 · <b>{archetype.label}</b></p>
      <p className={styles.clue}>{archetype.subtitle}</p><div className={styles.sideGrid}><div className={styles.sideBox}><small>잘 맞는 지점</small><strong>{sides.strength}</strong></div><div className={`${styles.sideBox} ${styles.sideBoxWarm}`}><small>맞추면 더 좋은 지점</small><strong>{sides.tuning}</strong></div></div>
      <div className={styles.score}><span>궁합 점수</span><strong>{score}</strong><small>/ 100</small></div><div className={styles.footer}>결과의 일부만 보여주는 9:16 공유 카드</div>
    </div>
    <div className={styles.actions}><button type="button" className={styles.shareButton} onClick={share}>{shareState === "shared" ? "친구에게 보냈어요" : shareState === "copied" ? "공유 링크를 복사했어요" : "친구에게 궁합 카드 보내기"}</button><button type="button" className={styles.saveButton} onClick={saveImage}>{shareState === "saved" ? "이미지를 저장했어요" : "이미지로 간직하기"}</button></div>
    {shareState === "failed" && <p className={styles.shareError}>공유 링크나 이미지를 만들지 못했어. 잠시 후 다시 시도해 줘.</p>}
  </section>;
}
