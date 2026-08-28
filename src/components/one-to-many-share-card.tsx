"use client";

import { useEffect, useState } from "react";
import type { OneToManyResultView, SummaryMetricId } from "@/lib/compatibility/one-to-many-view";
import { publicShareTokenFromUrl, trackGrowthEvent } from "@/lib/growth-analytics-client";
import type { GrowthSharePurpose } from "@/lib/growth-analytics-contract";
import { RELATIONSHIP_LABELS, type RelationshipType } from "@/lib/report-input";
import { createPublicShareUrl } from "@/lib/share/public-share-client";
import { buildOneToManyPublicShare } from "@/lib/share/public-share-contract";
import {
  assignP6ShareCardExperiment,
  copyPurposeForShareCard,
  initialP6SharePurpose,
  isP6SharePurpose,
  orderedShareCardPurposes,
} from "@/lib/share/share-card-experiment";
import {
  maskCuriosityAnswer,
  selectRelationshipShareCopy,
  type ShareRelationshipPattern,
} from "@/lib/share/relationship-share-copy";
import styles from "./one-to-many-share-card.module.css";

type OneToManyShareCardProps = { view: OneToManyResultView };
type RoleHighlight = { label: string; displayName: string; score: number };
type SideHighlight = { strength: string; tuning: string };
type CardOption = { purpose: GrowthSharePurpose; label: string; eyebrow: string };

const CARD_OPTIONS: Record<GrowthSharePurpose, CardOption> = {
  receipt: { purpose: "receipt", label: "관계 영수증", eyebrow: "COMPARISON RECEIPT" },
  recap: { purpose: "recap", label: "한 장 요약", eyebrow: "COMPARISON RECAP" },
  relationship_label: { purpose: "relationship_label", label: "관계 한 줄", eyebrow: "RELATIONSHIP LABEL" },
  two_sides: { purpose: "two_sides", label: "강한 축 · 조율", eyebrow: "TWO SIDES" },
  send_this: { purpose: "send_this", label: "이거 보내기", eyebrow: "SEND THIS" },
};

const ROLE_METRICS: Array<{ id: SummaryMetricId; label: string }> = [
  { id: "emotionalStability", label: "가장 편한 사람" },
  { id: "communication", label: "말이 잘 통하는 사람" },
  { id: "longTerm", label: "장기관계 리듬이 좋은 사람" },
];
const SIDE_METRICS: SummaryMetricId[] = ["communication", "emotionalStability", "conflictManagement", "longTerm", "relationshipPurpose"];

function relationshipTypeForLabel(label: string): RelationshipType {
  const match = Object.entries(RELATIONSHIP_LABELS).find(([, value]) => value === label);
  return (match?.[0] as RelationshipType | undefined) ?? "lover";
}
function metric(view: OneToManyResultView, id: SummaryMetricId) { return view.summaryMetrics.find((row) => row.id === id) ?? null; }
function roleHighlights(view: OneToManyResultView): RoleHighlight[] {
  const rankOrder = new Map(view.rankings.map((candidate, index) => [candidate.candidateId, index]));
  return ROLE_METRICS.flatMap(({ id, label }) => {
    const row = metric(view, id); if (!row) return [];
    const leader = [...row.values].sort((a, b) => b.score - a.score || (rankOrder.get(a.candidateId) ?? 999) - (rankOrder.get(b.candidateId) ?? 999))[0];
    return leader ? [{ label, displayName: leader.displayName, score: leader.score }] : [];
  });
}
function sideHighlights(view: OneToManyResultView): SideHighlight {
  const representative = view.rankings[0]?.candidateId;
  if (!representative) return { strength: "전체 관계 궁합", tuning: "관계 기준 맞추기" };
  const values = SIDE_METRICS.flatMap((id) => {
    const row = metric(view, id); const value = row?.values.find((candidate) => candidate.candidateId === representative);
    return row && value ? [{ label: row.label, score: value.score }] : [];
  }).sort((a, b) => b.score - a.score);
  return { strength: values[0]?.label ?? "전체 관계 궁합", tuning: values.at(-1)?.label ?? "관계 기준 맞추기" };
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill(); }
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []; let line = "";
  for (const char of [...text]) { const next = line + char; if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = char; } else line = next; }
  if (line) lines.push(line); return lines;
}
function drawTextLines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const lines = wrapLines(ctx, text, maxWidth).slice(0, maxLines); lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight)); return lines.length;
}

async function createShareImageBlob(input: { relationshipLabel: string; candidateCount: number; includeNames: boolean; purpose: GrowthSharePurpose; eyebrow: string; shareCopy: string; roles: RoleHighlight[]; sides: SideHighlight }) {
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
  ctx.fillStyle = "#FBFAF7"; ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#FFFFFF"; roundedRect(ctx, 90, 110, 900, 1700, 52);
  ctx.fillStyle = "#7652D8"; roundedRect(ctx, 90, 110, 900, 16, 8);
  ctx.fillStyle = "#222026"; ctx.font = "800 42px Pretendard, sans-serif"; ctx.fillText("우리사주", 160, 220);
  ctx.textAlign = "right"; ctx.fillText(`1:다 ${input.relationshipLabel}`, 920, 220); ctx.textAlign = "left";
  ctx.fillStyle = "#918991"; ctx.font = "900 28px Pretendard, sans-serif"; ctx.fillText(input.eyebrow, 160, 350);
  ctx.fillStyle = "#222026"; ctx.font = "900 62px Pretendard, sans-serif";
  const copyLines = drawTextLines(ctx, input.shareCopy, 160, 455, 760, 78, 5); const detailTop = 455 + copyLines * 78 + 55;

  if (input.purpose === "receipt") {
    input.roles.slice(0, 3).forEach((role, index) => {
      const y = detailTop + index * 170; ctx.fillStyle = index % 2 === 0 ? "#F8F4FF" : "#FFF3FA"; roundedRect(ctx, 150, y, 780, 140, 24);
      ctx.fillStyle = "#6F6870"; ctx.font = "800 27px Pretendard, sans-serif"; ctx.fillText(role.label, 200, y + 48);
      ctx.fillStyle = "#222026"; ctx.font = "900 36px Pretendard, sans-serif"; ctx.fillText(input.includeNames ? `${role.displayName} · ${role.score}점` : `${role.score}점`, 200, y + 102);
    });
  } else if (input.purpose === "recap") {
    input.roles.slice(0, 3).forEach((role, index) => {
      const y = detailTop + index * 150; ctx.fillStyle = index === 0 ? "#FFF3FA" : "#F8F4FF"; roundedRect(ctx, 150, y, 780, 122, 22);
      ctx.fillStyle = "#6F6870"; ctx.font = "800 25px Pretendard, sans-serif"; ctx.fillText(role.label, 200, y + 44);
      ctx.fillStyle = "#222026"; ctx.font = "900 34px Pretendard, sans-serif"; ctx.fillText(input.includeNames ? role.displayName : "이름은 공유하지 않음", 200, y + 92);
    });
    const recapBottom = detailTop + 470; ctx.fillStyle = "#FFF3FA"; roundedRect(ctx, 150, recapBottom, 780, 150, 22);
    ctx.fillStyle = "#6F6870"; ctx.font = "800 25px Pretendard, sans-serif"; ctx.fillText("강한 축 / 조율 축", 200, recapBottom + 50);
    ctx.fillStyle = "#222026"; ctx.font = "900 32px Pretendard, sans-serif"; drawTextLines(ctx, `${input.sides.strength} · ${input.sides.tuning}`, 200, recapBottom + 104, 660, 42, 2);
  } else if (input.purpose === "two_sides") {
    ctx.fillStyle = "#FFF3FA"; roundedRect(ctx, 150, detailTop, 780, 205, 24); ctx.fillStyle = "#6F6870"; ctx.font = "900 28px Pretendard, sans-serif"; ctx.fillText("상대적으로 강한 축", 200, detailTop + 64);
    ctx.fillStyle = "#222026"; ctx.font = "800 39px Pretendard, sans-serif"; drawTextLines(ctx, input.sides.strength, 200, detailTop + 130, 660, 50, 2);
    ctx.fillStyle = "#F8F4FF"; roundedRect(ctx, 150, detailTop + 240, 780, 205, 24); ctx.fillStyle = "#6F6870"; ctx.font = "900 28px Pretendard, sans-serif"; ctx.fillText("맞추면 더 좋아지는 축", 200, detailTop + 304);
    ctx.fillStyle = "#222026"; ctx.font = "800 39px Pretendard, sans-serif"; drawTextLines(ctx, input.sides.tuning, 200, detailTop + 370, 660, 50, 2);
  } else {
    input.roles.slice(0, 3).forEach((role, index) => {
      const y = detailTop + index * 180; ctx.fillStyle = index === 0 ? "#FFF3FA" : "#F8F4FF"; roundedRect(ctx, 150, y, 780, 150, 22);
      ctx.fillStyle = "#6F6870"; ctx.font = "800 27px Pretendard, sans-serif"; ctx.fillText(role.label, 200, y + 52);
      ctx.fillStyle = "#222026"; ctx.font = "900 37px Pretendard, sans-serif"; ctx.fillText(input.includeNames ? role.displayName : "이름은 공유하지 않음", 200, y + 108);
    });
  }

  ctx.fillStyle = "#7652D8"; roundedRect(ctx, 285, 1450, 510, 150, 75); ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.font = "900 34px Pretendard, sans-serif"; ctx.fillText(`후보 ${input.candidateCount}명 비교`, 540, 1542); ctx.textAlign = "left";
  ctx.fillStyle = "#6F6870"; ctx.font = "600 28px Pretendard, sans-serif"; ctx.fillText("생년월일시와 유료 본문은 포함되지 않아요", 160, 1730);
  return await new Promise<Blob>((resolve, reject) => { canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("IMAGE_EXPORT_FAILED")), "image/png"); });
}

export function OneToManyShareCard({ view }: OneToManyShareCardProps) {
  const relationshipType = relationshipTypeForLabel(view.relationshipLabel); const pattern = deriveOneToManySharePattern(view); const roles = roleHighlights(view); const sides = sideHighlights(view); const topScore = view.rankings[0]?.score ?? 0;
  const experimentArm = assignP6ShareCardExperiment(`oneToMany:${relationshipType}:${topScore}:${view.rankings.length}:${pattern}`); const initialPurpose = initialP6SharePurpose(experimentArm);
  const [purpose, setPurpose] = useState<GrowthSharePurpose>(() => initialPurpose); const [includeNames, setIncludeNames] = useState(false); const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "saved" | "failed">("idle");
  const cardOptions = orderedShareCardPurposes(experimentArm).map((cardPurpose) => CARD_OPTIONS[cardPurpose]); const selectedOption = CARD_OPTIONS[purpose]; const copyPurpose = copyPurposeForShareCard(purpose);
  const selectedCopy = selectRelationshipShareCopy({ relationshipType, pattern, purpose: copyPurpose, variantSeed: topScore * 101 + view.rankings.length * 17, tone: isP6SharePurpose(purpose) ? "clean" : undefined });
  const shareCopy = selectedCopy.tone === "curiosity" ? maskCuriosityAnswer(selectedCopy.copy, `${view.relationshipLabel} 비교의 핵심 포인트`) : selectedCopy.copy;
  const publicCandidates = roles.length > 0 ? roles.map((role) => ({ displayName: role.displayName, roleLabel: role.label, score: role.score })) : view.rankings.slice(0, 3).map((candidate, index) => ({ displayName: candidate.displayName, roleLabel: `비교 후보 ${index + 1}`, score: candidate.score }));

  useEffect(() => { trackGrowthEvent({ eventName: "share_card_open", product: "oneToMany", relationshipType, surface: "one_to_many_share_card", sharePurpose: initialPurpose, experimentArm }); }, [experimentArm, initialPurpose, relationshipType]);

  async function share() {
    const shareText = `우리사주 1:다 ${view.relationshipLabel} 비교 · ${shareCopy}`;
    try {
      const blob = await createShareImageBlob({ relationshipLabel: view.relationshipLabel, candidateCount: view.rankings.length, includeNames, purpose, eyebrow: selectedOption.eyebrow, shareCopy, roles, sides });
      const file = new File([blob], `woorisaju-comparison-${purpose}.png`, { type: "image/png" });
      const sharedViewUrl = await createPublicShareUrl(buildOneToManyPublicShare({ relationshipType, relationshipLabel: view.relationshipLabel, headline: shareCopy, summary: view.summary, includeDisplayNames: includeNames, candidates: publicCandidates }));
      const shareToken = publicShareTokenFromUrl(sharedViewUrl);
      if (navigator.share && navigator.canShare?.({ files: [file] })) { if (shareToken) trackGrowthEvent({ eventName: "share_native_open", product: "oneToMany", relationshipType, surface: "one_to_many_share_card", sharePurpose: purpose, experimentArm, shareToken }); await navigator.share({ title: `우리사주 1:다 ${view.relationshipLabel} 비교`, text: shareText, url: sharedViewUrl, files: [file] }); setShareState("shared"); return; }
      if (navigator.share) { if (shareToken) trackGrowthEvent({ eventName: "share_native_open", product: "oneToMany", relationshipType, surface: "one_to_many_share_card", sharePurpose: purpose, experimentArm, shareToken }); await navigator.share({ title: `우리사주 1:다 ${view.relationshipLabel} 비교`, text: shareText, url: sharedViewUrl }); setShareState("shared"); return; }
      await navigator.clipboard.writeText(`${shareText}\n${sharedViewUrl}`); if (shareToken) trackGrowthEvent({ eventName: "share_link_copy", product: "oneToMany", relationshipType, surface: "one_to_many_share_card", sharePurpose: purpose, experimentArm, shareToken }); setShareState("copied");
    } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; setShareState("failed"); }
  }
  async function saveImage() {
    try { const blob = await createShareImageBlob({ relationshipLabel: view.relationshipLabel, candidateCount: view.rankings.length, includeNames, purpose, eyebrow: selectedOption.eyebrow, shareCopy, roles, sides }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `woorisaju-comparison-${purpose}.png`; link.click(); trackGrowthEvent({ eventName: "share_image_download", product: "oneToMany", relationshipType, surface: "one_to_many_share_card", sharePurpose: purpose, experimentArm }); window.setTimeout(() => URL.revokeObjectURL(url), 1_000); setShareState("saved"); } catch { setShareState("failed"); }
  }

  return <section className={styles.section} aria-labelledby="one-to-many-share-title">
    <div className={styles.heading}><small>SHARE THE COMPARISON</small><h2 id="one-to-many-share-title">순위보다, 관계 역할로 공유하기</h2><p>관계 영수증·한 장 요약과 기존 역할형 카드를 골라 공유할 수 있어요. 후보 이름은 직접 켜기 전에는 공유 이미지나 Shared View에 넣지 않습니다.</p></div>
    <div className={styles.typeTabs} role="group" aria-label="1:다 공유 카드 종류">{cardOptions.map((option) => <button key={option.purpose} type="button" data-purpose={option.purpose} aria-pressed={purpose === option.purpose} className={purpose === option.purpose ? styles.typeButtonActive : styles.typeButton} onClick={() => { if (purpose !== option.purpose) trackGrowthEvent({ eventName: "share_style_selected", product: "oneToMany", relationshipType, surface: "one_to_many_share_card", sharePurpose: option.purpose, experimentArm }); setPurpose(option.purpose); setShareState("idle"); }}>{option.label}</button>)}</div>
    <div className={styles.card} data-purpose={purpose} data-pattern={pattern} data-experiment-arm={experimentArm}>
      <div className={styles.topline}><span>우리사주</span><span>1:다 {view.relationshipLabel}</span></div><div className={styles.mystery}>{selectedOption.eyebrow}</div><span className={styles.tone}>{selectedCopy.tone}</span><strong className={styles.shareCopy}>{shareCopy}</strong>
      {purpose === "receipt" ? <div className={styles.roleGrid}>{roles.map((role) => <div className={styles.roleBox} key={role.label}><small>{role.label}</small><strong>{includeNames ? `${role.displayName} · ${role.score}점` : `${role.score}점`}</strong></div>)}</div> : purpose === "recap" ? <><div className={styles.roleGrid}>{roles.map((role) => <div className={styles.roleBox} key={role.label}><small>{role.label}</small><strong>{includeNames ? role.displayName : "이름은 공유하지 않음"}</strong></div>)}</div><div className={styles.sideGrid}><div className={styles.sideBox}><small>상대적으로 강한 축</small><strong>{sides.strength}</strong></div><div className={`${styles.sideBox} ${styles.sideBoxWarm}`}><small>맞추면 더 좋아지는 축</small><strong>{sides.tuning}</strong></div></div></> : purpose === "two_sides" ? <div className={styles.sideGrid}><div className={styles.sideBox}><small>상대적으로 강한 축</small><strong>{sides.strength}</strong></div><div className={`${styles.sideBox} ${styles.sideBoxWarm}`}><small>맞추면 더 좋아지는 축</small><strong>{sides.tuning}</strong></div></div> : <div className={styles.roleGrid}>{roles.map((role) => <div className={styles.roleBox} key={role.label}><small>{role.label}</small><strong>{includeNames ? role.displayName : "이름은 공유하지 않음"}</strong></div>)}</div>}
      <div className={styles.candidateCount}>후보 {view.rankings.length}명 비교</div><div className={styles.footer}>순번보다 관계 역할을 보여주는 9:16 공유 카드</div>
    </div>
    <label className={styles.nameToggle}><input type="checkbox" checked={includeNames} onChange={(event) => setIncludeNames(event.target.checked)} />공유 이미지와 Shared View에 후보 이름 넣기</label>
    <div className={styles.actions}><button type="button" className={styles.shareButton} onClick={share}>{shareState === "shared" ? "공유했어요" : shareState === "copied" ? "공유 링크를 복사했어요" : "이 카드 공유하기"}</button><button type="button" className={styles.saveButton} onClick={saveImage}>{shareState === "saved" ? "이미지를 저장했어요" : "9:16 이미지 저장"}</button></div>
    {shareState === "failed" && <p className={styles.shareError}>공유 링크나 이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.</p>}<p className={styles.privacyNote}>공유 버튼은 결제 결과 주소나 접근 토큰 대신 별도의 Shared View 주소를 만듭니다. 후보 이름은 사용자가 직접 켠 경우에만 공개 DTO에 포함됩니다.</p>
  </section>;
}
