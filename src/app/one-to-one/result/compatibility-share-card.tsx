"use client";

import { useState } from "react";
import type { CompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";
import { RELATIONSHIP_LABELS, type RelationshipType } from "@/lib/report-input";
import { createPublicShareUrl } from "@/lib/share/public-share-client";
import { buildOneToOnePublicShare } from "@/lib/share/public-share-contract";
import {
  maskCuriosityAnswer,
  selectRelationshipShareCopyForArchetype,
  type ShareCopyPurpose,
} from "@/lib/share/relationship-share-copy";
import styles from "./compatibility-share-card.module.css";

type CompatibilityShareCardProps = {
  selfName: string;
  partnerName: string;
  relationshipLabel: string;
  score: number;
  archetype: CompatibilityShareArchetype;
};

type ShareSide = { strength: string; tuning: string };

const CARD_OPTIONS: Array<{ purpose: ShareCopyPurpose; label: string; eyebrow: string }> = [
  { purpose: "relationship_label", label: "관계 한 줄", eyebrow: "RELATIONSHIP LABEL" },
  { purpose: "two_sides", label: "잘 맞는 점 · 조율", eyebrow: "TWO SIDES" },
  { purpose: "send_this", label: "이거 보내기", eyebrow: "SEND THIS" },
];

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
  includeNames,
  purpose,
  eyebrow,
  shareCopy,
  sides,
}: CompatibilityShareCardProps & {
  includeNames: boolean;
  purpose: ShareCopyPurpose;
  eyebrow: string;
  shareCopy: string;
  sides: ShareSide;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#FFFBF5");
  gradient.addColorStop(.52, "#F3EEFF");
  gradient.addColorStop(1, "#FFEAF1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = "rgba(184,169,232,.30)";
  ctx.beginPath(); ctx.arc(900, 230, 260, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,176,136,.22)";
  ctx.beginPath(); ctx.arc(120, 1660, 300, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.92)";
  roundedRect(ctx, 90, 110, 900, 1700, 64);

  ctx.fillStyle = "#8B7BC7";
  ctx.font = "800 42px Pretendard, sans-serif";
  ctx.fillText("우리사주", 160, 220);
  ctx.textAlign = "right";
  ctx.fillText(`${relationshipLabel} 궁합`, 920, 220);
  ctx.textAlign = "left";

  if (includeNames) {
    ctx.fillStyle = "#7B7396";
    ctx.font = "700 42px Pretendard, sans-serif";
    ctx.fillText(`${selfName}  ×  ${partnerName}`, 160, 330);
  }

  const contentTop = includeNames ? 430 : 350;
  ctx.fillStyle = "#8B7BC7";
  ctx.font = "900 28px Pretendard, sans-serif";
  ctx.fillText(eyebrow, 160, contentTop);

  ctx.fillStyle = "#3A3550";
  ctx.font = "900 62px Pretendard, sans-serif";
  const copyLines = drawTextLines(ctx, shareCopy, 160, contentTop + 105, 760, 78, 5);

  const archetypeY = contentTop + 105 + copyLines * 78 + 48;
  ctx.fillStyle = "#7B7396";
  ctx.font = "700 31px Pretendard, sans-serif";
  ctx.fillText(`궁합 유형 · ${archetype.label}`, 160, archetypeY);

  if (purpose === "two_sides") {
    const boxTop = archetypeY + 70;
    ctx.fillStyle = "#F7F2FB";
    roundedRect(ctx, 150, boxTop, 780, 190, 34);
    ctx.fillStyle = "#8B7BC7";
    ctx.font = "900 27px Pretendard, sans-serif";
    ctx.fillText("잘 맞는 지점", 200, boxTop + 58);
    ctx.fillStyle = "#3A3550";
    ctx.font = "800 37px Pretendard, sans-serif";
    drawTextLines(ctx, sides.strength, 200, boxTop + 118, 660, 48, 2);

    ctx.fillStyle = "#FFF3ED";
    roundedRect(ctx, 150, boxTop + 220, 780, 190, 34);
    ctx.fillStyle = "#C47B5E";
    ctx.font = "900 27px Pretendard, sans-serif";
    ctx.fillText("맞추면 더 좋은 지점", 200, boxTop + 278);
    ctx.fillStyle = "#3A3550";
    ctx.font = "800 37px Pretendard, sans-serif";
    drawTextLines(ctx, sides.tuning, 200, boxTop + 338, 660, 48, 2);
  } else {
    const clueTop = archetypeY + 72;
    ctx.fillStyle = "#F7F2FB";
    roundedRect(ctx, 150, clueTop, 780, 250, 38);
    ctx.fillStyle = "#3A3550";
    ctx.font = "700 34px Pretendard, sans-serif";
    drawTextLines(ctx, archetype.subtitle, 200, clueTop + 78, 680, 50, 3);
  }

  ctx.fillStyle = "#B8A9E8";
  roundedRect(ctx, 260, 1430, 560, 210, 105);
  ctx.fillStyle = "#3A3550";
  ctx.textAlign = "center";
  ctx.font = "800 30px Pretendard, sans-serif";
  ctx.fillText("궁합 점수", 540, 1500);
  ctx.font = "900 86px Pretendard, sans-serif";
  ctx.fillText(String(score), 510, 1588);
  ctx.font = "700 28px Pretendard, sans-serif";
  ctx.fillText("/ 100", 625, 1588);
  ctx.textAlign = "left";

  ctx.fillStyle = "#7B7396";
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
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "saved" | "failed">("idle");
  const [includeNames, setIncludeNames] = useState(false);
  const [purpose, setPurpose] = useState<ShareCopyPurpose>("relationship_label");
  const relationshipType = relationshipTypeForLabel(relationshipLabel);
  const selectedOption = CARD_OPTIONS.find((option) => option.purpose === purpose) ?? CARD_OPTIONS[0];
  const selectedCopy = selectRelationshipShareCopyForArchetype({
    relationshipType,
    archetypeId: archetype.id,
    purpose,
    variantSeed: score * 97 + archetype.id.length * 13,
  });
  const shareCopy = selectedCopy.tone === "curiosity"
    ? maskCuriosityAnswer(selectedCopy.copy, `${archetype.label} ${archetype.subtitle}`)
    : selectedCopy.copy;
  const sides = ARCHETYPE_SIDES[archetype.id];

  async function share() {
    const shareText = `우리사주 ${relationshipLabel} 궁합 · ${shareCopy} · ${score}점`;

    try {
      const blob = await createShareImageBlob({
        selfName,
        partnerName,
        relationshipLabel,
        score,
        archetype,
        includeNames,
        purpose,
        eyebrow: selectedOption.eyebrow,
        shareCopy,
        sides,
      });
      const file = new File([blob], `woorisaju-${purpose}.png`, { type: "image/png" });
      const sharedViewUrl = await createPublicShareUrl(buildOneToOnePublicShare({
        relationshipType,
        relationshipLabel,
        headline: shareCopy,
        summary: archetype.subtitle,
        score,
        selfName,
        partnerName,
        includeDisplayNames: includeNames,
        archetype,
        strength: { label: "잘 맞는 지점", copy: sides.strength },
        tuning: { label: "맞추면 더 좋은 지점", copy: sides.tuning },
      }));
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: sharedViewUrl, files: [file] });
        setShareState("shared");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: sharedViewUrl });
        setShareState("shared");
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${sharedViewUrl}`);
      setShareState("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareState("failed");
    }
  }

  async function saveImage() {
    try {
      const blob = await createShareImageBlob({
        selfName,
        partnerName,
        relationshipLabel,
        score,
        archetype,
        includeNames,
        purpose,
        eyebrow: selectedOption.eyebrow,
        shareCopy,
        sides,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `woorisaju-${purpose}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setShareState("saved");
    } catch {
      setShareState("failed");
    }
  }

  return <section className={styles.section} aria-labelledby="compatibility-share-card-title">
    <div className={styles.heading}>
      <small>SHARE YOUR RESULT</small>
      <h2 id="compatibility-share-card-title">이 관계, 한 장으로 보내기</h2>
      <p>관계 한 줄·두 얼굴·바로 보내기 중 골라 9:16 이미지로 공유할 수 있어요. 생년월일시와 유료 본문은 카드에 담지 않습니다.</p>
    </div>

    <div className={styles.typeTabs} role="group" aria-label="공유 카드 종류">
      {CARD_OPTIONS.map((option) => <button
        type="button"
        key={option.purpose}
        data-purpose={option.purpose}
        aria-pressed={purpose === option.purpose}
        className={purpose === option.purpose ? styles.typeButtonActive : styles.typeButton}
        onClick={() => { setPurpose(option.purpose); setShareState("idle"); }}
      >{option.label}</button>)}
    </div>

    <div className={styles.card} data-archetype={archetype.id} data-purpose={purpose}>
      <div className={styles.topline}><span>우리사주</span><span>{relationshipLabel} 궁합</span></div>
      {includeNames ? <div className={styles.names}>{selfName} <span>×</span> {partnerName}</div> : <div className={styles.names}>우리 둘의 관계 카드</div>}
      <div className={styles.mystery}>{selectedOption.eyebrow}</div>
      <span className={styles.tone}>{selectedCopy.tone}</span>
      <strong className={styles.shareCopy}>{shareCopy}</strong>
      <p className={styles.pairType}>궁합 유형 · <b>{archetype.label}</b></p>
      {purpose === "two_sides" ? <div className={styles.sideGrid}>
        <div className={styles.sideBox}><small>잘 맞는 지점</small><strong>{sides.strength}</strong></div>
        <div className={`${styles.sideBox} ${styles.sideBoxWarm}`}><small>맞추면 더 좋은 지점</small><strong>{sides.tuning}</strong></div>
      </div> : <p className={styles.clue}>{archetype.subtitle}</p>}
      <div className={styles.score}><span>궁합 점수</span><strong>{score}</strong><small>/ 100</small></div>
      <div className={styles.footer}>결과의 일부만 보여주는 9:16 공유 카드</div>
    </div>

    <label className={styles.nameToggle}><input type="checkbox" checked={includeNames} onChange={(event) => setIncludeNames(event.target.checked)} />공유 이미지와 Shared View에 이름 넣기</label>
    <div className={styles.actions}>
      <button type="button" className={styles.shareButton} onClick={share}>{shareState === "shared" ? "공유했어요" : shareState === "copied" ? "공유 링크를 복사했어요" : "이 카드 공유하기"}</button>
      <button type="button" className={styles.saveButton} onClick={saveImage}>{shareState === "saved" ? "이미지를 저장했어요" : "9:16 이미지 저장"}</button>
    </div>
    {shareState === "failed" && <p className={styles.shareError}>공유 링크나 이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
    <p className={styles.privacyNote}>공유 버튼은 결제 결과 주소나 접근 토큰 대신 별도의 Shared View 주소를 만듭니다. 이름은 사용자가 직접 켠 경우에만 공개 DTO에 포함됩니다.</p>
  </section>;
}
