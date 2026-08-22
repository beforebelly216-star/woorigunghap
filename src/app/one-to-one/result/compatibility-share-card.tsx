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

async function createShareImageBlob({
  selfName,
  partnerName,
  relationshipLabel,
  score,
  archetype,
  includeNames,
}: CompatibilityShareCardProps & { includeNames: boolean }) {
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

  ctx.fillStyle = "rgba(255,255,255,.90)";
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

  ctx.fillStyle = "#8B7BC7";
  ctx.font = "800 32px Pretendard, sans-serif";
  ctx.fillText("사주소년이 찾은 관계의 단서", 160, includeNames ? 430 : 350);

  ctx.fillStyle = "#3A3550";
  ctx.font = "900 76px Pretendard, sans-serif";
  const labelY = includeNames ? 550 : 470;
  const labelLines = wrapLines(ctx, archetype.label, 760);
  labelLines.slice(0, 3).forEach((line, index) => ctx.fillText(line, 160, labelY + index * 92));

  const subtitleY = labelY + labelLines.slice(0, 3).length * 92 + 32;
  ctx.fillStyle = "#7B7396";
  ctx.font = "700 40px Pretendard, sans-serif";
  wrapLines(ctx, archetype.subtitle, 760).slice(0, 3).forEach((line, index) => ctx.fillText(line, 160, subtitleY + index * 58));

  const clueY = subtitleY + 230;
  ctx.fillStyle = "#F7F2FB";
  roundedRect(ctx, 150, clueY - 70, 780, 330, 38);
  ctx.fillStyle = "#3A3550";
  ctx.font = "700 35px Pretendard, sans-serif";
  wrapLines(ctx, archetype.clue, 680).slice(0, 5).forEach((line, index) => ctx.fillText(line, 200, clueY + index * 52));

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

  async function share() {
    const shareText = `우리사주 ${relationshipLabel} 궁합 · ${archetype.label} · ${score}점`;
    const safeUrl = `${window.location.origin}/`;

    try {
      const blob = await createShareImageBlob({ selfName, partnerName, relationshipLabel, score, archetype, includeNames });
      const file = new File([blob], "woorisaju-compatibility.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: safeUrl, files: [file] });
        setShareState("shared");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: safeUrl });
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

  async function saveImage() {
    try {
      const blob = await createShareImageBlob({ selfName, partnerName, relationshipLabel, score, archetype, includeNames });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "woorisaju-compatibility.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setShareState("saved");
    } catch {
      setShareState("failed");
    }
  }

  return <section className={styles.section} aria-labelledby="compatibility-share-card-title">
    <div className={styles.heading}>
      <small>RELATIONSHIP TYPE</small>
      <h2 id="compatibility-share-card-title">우리 둘은 어떤 궁합일까?</h2>
      <p>긴 리포트의 핵심만 뽑은 9:16 공유 카드예요. 생년월일시와 유료 본문은 카드에 담지 않습니다.</p>
    </div>

    <div className={styles.card} data-archetype={archetype.id}>
      <div className={styles.topline}><span>우리사주</span><span>{relationshipLabel} 궁합</span></div>
      {includeNames ? <div className={styles.names}>{selfName} <span>×</span> {partnerName}</div> : <div className={styles.names}>우리 둘의 관계 카드</div>}
      <div className={styles.mystery}>사주소년이 찾은 관계의 단서</div>
      <strong className={styles.label}>{archetype.label}</strong>
      <p className={styles.subtitle}>{archetype.subtitle}</p>
      <p className={styles.clue}>{archetype.clue}</p>
      <div className={styles.score}><span>궁합 점수</span><strong>{score}</strong><small>/ 100</small></div>
      <div className={styles.footer}>결과의 일부만 보여주는 공유 카드</div>
    </div>

    <label className={styles.nameToggle}><input type="checkbox" checked={includeNames} onChange={(event) => setIncludeNames(event.target.checked)} />공유 이미지에 이름 넣기</label>
    <div className={styles.actions}>
      <button type="button" className={styles.shareButton} onClick={share}>{shareState === "shared" ? "공유했어요" : shareState === "copied" ? "공유 문구를 복사했어요" : "궁합 카드 공유하기"}</button>
      <button type="button" className={styles.saveButton} onClick={saveImage}>{shareState === "saved" ? "이미지를 저장했어요" : "9:16 이미지 저장"}</button>
    </div>
    {shareState === "failed" && <p className={styles.shareError}>공유 이미지를 만들지 못했어요. 브라우저 권한을 확인해 주세요.</p>}
    <p className={styles.privacyNote}>공유 버튼은 결제 결과 주소나 접근 토큰을 보내지 않고 우리사주 홈 주소만 공유합니다. 이름은 사용자가 직접 켠 경우에만 이미지에 들어갑니다.</p>
  </section>;
}
