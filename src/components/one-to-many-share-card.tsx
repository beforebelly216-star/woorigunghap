"use client";

import { useState } from "react";
import type { OneToManyResultView, SummaryMetricId } from "@/lib/compatibility/one-to-many-view";
import { RELATIONSHIP_LABELS, type RelationshipType } from "@/lib/report-input";
import {
  maskCuriosityAnswer,
  selectRelationshipShareCopy,
  type ShareCopyPurpose,
  type ShareRelationshipPattern,
} from "@/lib/share/relationship-share-copy";
import styles from "./one-to-many-share-card.module.css";

type OneToManyShareCardProps = {
  view: OneToManyResultView;
};

type RoleHighlight = {
  label: string;
  displayName: string;
};

type SideHighlight = {
  strength: string;
  tuning: string;
};

const CARD_OPTIONS: Array<{ purpose: ShareCopyPurpose; label: string; eyebrow: string }> = [
  { purpose: "relationship_label", label: "관계 한 줄", eyebrow: "RELATIONSHIP LABEL" },
  { purpose: "two_sides", label: "강한 축 · 조율", eyebrow: "TWO SIDES" },
  { purpose: "send_this", label: "이거 보내기", eyebrow: "SEND THIS" },
];

const ROLE_METRICS: Array<{ id: SummaryMetricId; label: string }> = [
  { id: "emotionalStability", label: "가장 편한 사람" },
  { id: "communication", label: "말이 잘 통하는 사람" },
  { id: "longTerm", label: "장기관계 리듬이 좋은 사람" },
];

const SIDE_METRICS: SummaryMetricId[] = [
  "communication",
  "emotionalStability",
  "conflictManagement",
  "longTerm",
  "relationshipPurpose",
];

function relationshipTypeForLabel(label: string): RelationshipType {
  const match = Object.entries(RELATIONSHIP_LABELS).find(([, value]) => value === label);
  return (match?.[0] as RelationshipType | undefined) ?? "lover";
}

function metric(view: OneToManyResultView, id: SummaryMetricId) {
  return view.summaryMetrics.find((row) => row.id === id) ?? null;
}

function roleHighlights(view: OneToManyResultView): RoleHighlight[] {
  const rankOrder = new Map(view.rankings.map((candidate, index) => [candidate.candidateId, index]));
  return ROLE_METRICS.flatMap(({ id, label }) => {
    const row = metric(view, id);
    if (!row) return [];
    const leader = [...row.values].sort((a, b) => (
      b.score - a.score
      || (rankOrder.get(a.candidateId) ?? 999) - (rankOrder.get(b.candidateId) ?? 999)
    ))[0];
    return leader ? [{ label, displayName: leader.displayName }] : [];
  });
}

function sideHighlights(view: OneToManyResultView): SideHighlight {
  const representative = view.rankings[0]?.candidateId;
  if (!representative) return { strength: "전체 관계 궁합", tuning: "관계 기준 맞추기" };

  const values = SIDE_METRICS.flatMap((id) => {
    const row = metric(view, id);
    const value = row?.values.find((candidate) => candidate.candidateId === representative);
    return row && value ? [{ label: row.label, score: value.score }] : [];
  }).sort((a, b) => b.score - a.score);

  return {
    strength: values[0]?.label ?? "전체 관계 궁합",
    tuning: values.at(-1)?.label ?? "관계 기준 맞추기",
  };
}

export function deriveOneToManySharePattern(view: OneToManyResultView): ShareRelationshipPattern {
  const topScore = view.rankings[0]?.score ?? 0;
  const bottomScore = view.rankings.at(-1)?.score ?? topScore;
  const gap = topScore - bottomScore;
  const roles = roleHighlights(view);
  const uniqueRoleNames = new Set(roles.map((role) => role.displayName)).size;
  const communication = metric(view, "communication");
  const conflict = metric(view, "conflictManagement");
  const communicationLeader = communication ? [...communication.values].sort((a, b) => b.score - a.score)[0] : null;
  const conflictLeader = conflict ? [...conflict.values].sort((a, b) => b.score - a.score)[0] : null;

  if (gap <= 2) return "stable";
  if (topScore < 68) return "effort";
  if ((communicationLeader?.score ?? 0) >= 82) return "banter";
  if (uniqueRoleNames >= 3) return "twist";
  if (communicationLeader && conflictLeader && communicationLeader.candidateId !== conflictLeader.candidateId) return "opposites";
  if ((conflictLeader?.score ?? 100) < 72) return "distance";
  return "stable";
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

async function createShareImageBlob(input: {
  relationshipLabel: string;
  candidateCount: number;
  includeNames: boolean;
  purpose: ShareCopyPurpose;
  eyebrow: string;
  shareCopy: string;
  roles: RoleHighlight[];
  sides: SideHighlight;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#FFF9F0");
  gradient.addColorStop(.48, "#F4EEFF");
  gradient.addColorStop(1, "#EAF6FF");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = "rgba(184,169,232,.28)";
  ctx.beginPath(); ctx.arc(910, 245, 270, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(126,196,218,.20)";
  ctx.beginPath(); ctx.arc(105, 1650, 300, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.93)";
  roundedRect(ctx, 90, 110, 900, 1700, 64);

  ctx.fillStyle = "#8B7BC7";
  ctx.font = "800 42px Pretendard, sans-serif";
  ctx.fillText("우리사주", 160, 220);
  ctx.textAlign = "right";
  ctx.fillText(`1:다 ${input.relationshipLabel}`, 920, 220);
  ctx.textAlign = "left";

  ctx.fillStyle = "#8B7BC7";
  ctx.font = "900 28px Pretendard, sans-serif";
  ctx.fillText(input.eyebrow, 160, 350);
  ctx.fillStyle = "#3A3550";
  ctx.font = "900 62px Pretendard, sans-serif";
  const copyLines = drawTextLines(ctx, input.shareCopy, 160, 455, 760, 78, 5);
  const detailTop = 455 + copyLines * 78 + 55;

  if (input.purpose === "two_sides") {
    ctx.fillStyle = "#F5F0FF";
    roundedRect(ctx, 150, detailTop, 780, 205, 36);
    ctx.fillStyle = "#8B7BC7";
    ctx.font = "900 28px Pretendard, sans-serif";
    ctx.fillText("상대적으로 강한 축", 200, detailTop + 64);
    ctx.fillStyle = "#3A3550";
    ctx.font = "800 39px Pretendard, sans-serif";
    drawTextLines(ctx, input.sides.strength, 200, detailTop + 130, 660, 50, 2);

    ctx.fillStyle = "#FFF3ED";
    roundedRect(ctx, 150, detailTop + 240, 780, 205, 36);
    ctx.fillStyle = "#C47B5E";
    ctx.font = "900 28px Pretendard, sans-serif";
    ctx.fillText("맞추면 더 좋아지는 축", 200, detailTop + 304);
    ctx.fillStyle = "#3A3550";
    ctx.font = "800 39px Pretendard, sans-serif";
    drawTextLines(ctx, input.sides.tuning, 200, detailTop + 370, 660, 50, 2);
  } else {
    input.roles.slice(0, 3).forEach((role, index) => {
      const y = detailTop + index * 180;
      ctx.fillStyle = index === 0 ? "#F5F0FF" : "#F8F7FB";
      roundedRect(ctx, 150, y, 780, 150, 32);
      ctx.fillStyle = "#7B7396";
      ctx.font = "800 27px Pretendard, sans-serif";
      ctx.fillText(role.label, 200, y + 52);
      ctx.fillStyle = "#3A3550";
      ctx.font = "900 37px Pretendard, sans-serif";
      ctx.fillText(input.includeNames ? role.displayName : "이름은 공유하지 않음", 200, y + 108);
    });
  }

  ctx.fillStyle = "#B8A9E8";
  roundedRect(ctx, 285, 1450, 510, 150, 75);
  ctx.fillStyle = "#3A3550";
  ctx.textAlign = "center";
  ctx.font = "900 34px Pretendard, sans-serif";
  ctx.fillText(`후보 ${input.candidateCount}명 비교`, 540, 1542);
  ctx.textAlign = "left";

  ctx.fillStyle = "#7B7396";
  ctx.font = "600 28px Pretendard, sans-serif";
  ctx.fillText("생년월일시와 유료 본문은 포함되지 않아요", 160, 1730);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("IMAGE_EXPORT_FAILED")), "image/png");
  });
}

export function OneToManyShareCard({ view }: OneToManyShareCardProps) {
  const [purpose, setPurpose] = useState<ShareCopyPurpose>("relationship_label");
  const [includeNames, setIncludeNames] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "saved" | "failed">("idle");
  const relationshipType = relationshipTypeForLabel(view.relationshipLabel);
  const pattern = deriveOneToManySharePattern(view);
  const roles = roleHighlights(view);
  const sides = sideHighlights(view);
  const topScore = view.rankings[0]?.score ?? 0;
  const selectedOption = CARD_OPTIONS.find((option) => option.purpose === purpose) ?? CARD_OPTIONS[0];
  const selectedCopy = selectRelationshipShareCopy({
    relationshipType,
    pattern,
    purpose,
    variantSeed: topScore * 101 + view.rankings.length * 17,
  });
  const shareCopy = selectedCopy.tone === "curiosity"
    ? maskCuriosityAnswer(selectedCopy.copy, `${view.relationshipLabel} 비교의 핵심 포인트`)
    : selectedCopy.copy;

  async function share() {
    const shareText = `우리사주 1:다 ${view.relationshipLabel} 비교 · ${shareCopy}`;
    const safeUrl = `${window.location.origin}/`;
    try {
      const blob = await createShareImageBlob({
        relationshipLabel: view.relationshipLabel,
        candidateCount: view.rankings.length,
        includeNames,
        purpose,
        eyebrow: selectedOption.eyebrow,
        shareCopy,
        roles,
        sides,
      });
      const file = new File([blob], `woorisaju-comparison-${purpose}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `우리사주 1:다 ${view.relationshipLabel} 비교`, text: shareText, url: safeUrl, files: [file] });
        setShareState("shared");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `우리사주 1:다 ${view.relationshipLabel} 비교`, text: shareText, url: safeUrl });
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
      const blob = await createShareImageBlob({
        relationshipLabel: view.relationshipLabel,
        candidateCount: view.rankings.length,
        includeNames,
        purpose,
        eyebrow: selectedOption.eyebrow,
        shareCopy,
        roles,
        sides,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `woorisaju-comparison-${purpose}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setShareState("saved");
    } catch {
      setShareState("failed");
    }
  }

  return <section className={styles.section} aria-labelledby="one-to-many-share-title">
    <div className={styles.heading}>
      <small>SHARE THE COMPARISON</small>
      <h2 id="one-to-many-share-title">순위보다, 관계 역할로 공유하기</h2>
      <p>누구와 어떤 장면이 편한지 역할형 결과로 보여줘요. 후보 이름은 직접 켜기 전에는 공유 이미지에 넣지 않습니다.</p>
    </div>

    <div className={styles.typeTabs} role="group" aria-label="1:다 공유 카드 종류">
      {CARD_OPTIONS.map((option) => <button
        key={option.purpose}
        type="button"
        data-purpose={option.purpose}
        aria-pressed={purpose === option.purpose}
        className={purpose === option.purpose ? styles.typeButtonActive : styles.typeButton}
        onClick={() => { setPurpose(option.purpose); setShareState("idle"); }}
      >{option.label}</button>)}
    </div>

    <div className={styles.card} data-purpose={purpose} data-pattern={pattern}>
      <div className={styles.topline}><span>우리사주</span><span>1:다 {view.relationshipLabel}</span></div>
      <div className={styles.mystery}>{selectedOption.eyebrow}</div>
      <span className={styles.tone}>{selectedCopy.tone}</span>
      <strong className={styles.shareCopy}>{shareCopy}</strong>
      {purpose === "two_sides" ? <div className={styles.sideGrid}>
        <div className={styles.sideBox}><small>상대적으로 강한 축</small><strong>{sides.strength}</strong></div>
        <div className={`${styles.sideBox} ${styles.sideBoxWarm}`}><small>맞추면 더 좋아지는 축</small><strong>{sides.tuning}</strong></div>
      </div> : <div className={styles.roleGrid}>
        {roles.map((role) => <div className={styles.roleBox} key={role.label}><small>{role.label}</small><strong>{includeNames ? role.displayName : "이름은 공유하지 않음"}</strong></div>)}
      </div>}
      <div className={styles.candidateCount}>후보 {view.rankings.length}명 비교</div>
      <div className={styles.footer}>순번보다 관계 역할을 보여주는 9:16 공유 카드</div>
    </div>

    <label className={styles.nameToggle}><input type="checkbox" checked={includeNames} onChange={(event) => setIncludeNames(event.target.checked)} />공유 이미지에 후보 이름 넣기</label>
    <div className={styles.actions}>
      <button type="button" className={styles.shareButton} onClick={share}>{shareState === "shared" ? "공유했어요" : shareState === "copied" ? "공유 문구를 복사했어요" : "이 카드 공유하기"}</button>
      <button type="button" className={styles.saveButton} onClick={saveImage}>{shareState === "saved" ? "이미지를 저장했어요" : "9:16 이미지 저장"}</button>
    </div>
    {shareState === "failed" && <p className={styles.shareError}>공유 이미지를 만들지 못했어요. 브라우저 권한을 확인해 주세요.</p>}
    <p className={styles.privacyNote}>현재 공유 주소는 결제 결과나 접근 토큰이 아닌 우리사주 홈만 사용합니다. P4에서 안전한 Shared View URL로 교체합니다.</p>
  </section>;
}
