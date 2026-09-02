"use client";

import { useState } from "react";
import {
  RELATIONSHIP_NETWORK_GRADES,
  type RelationshipNetworkGrade,
  type RelationshipNetworkPublic,
} from "@/lib/relationship-network-contract";
import styles from "@/app/one-to-many/relationship-network.module.css";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STORY_FILE_NAME = "woorisaju-relationship-network.png";

const GRADE_COLORS: Record<RelationshipNetworkGrade, string> = {
  S: "#49c58c",
  A: "#79c97d",
  B: "#b2c85b",
  C: "#e2ad4d",
  D: "#e6876b",
  E: "#d85f70",
};

export type RelationshipNetworkShareSummary = {
  memberCount: number;
  relationshipCount: number;
  strongestGrade: RelationshipNetworkGrade | null;
  strongestGradeCount: number;
  sGradeCount: number;
};

type ShareState = "idle" | "working" | "shared" | "copied" | "saved" | "failed";

export function summarizeRelationshipNetwork(
  network: RelationshipNetworkPublic,
): RelationshipNetworkShareSummary {
  const gradeCounts = new Map<RelationshipNetworkGrade, number>();
  for (const grade of RELATIONSHIP_NETWORK_GRADES) gradeCounts.set(grade, 0);
  for (const edge of network.edges) {
    gradeCounts.set(edge.grade, (gradeCounts.get(edge.grade) ?? 0) + 1);
  }
  const strongestGrade = RELATIONSHIP_NETWORK_GRADES.find(
    (grade) => (gradeCounts.get(grade) ?? 0) > 0,
  ) ?? null;
  return {
    memberCount: network.memberCount,
    relationshipCount: network.edges.length,
    strongestGrade,
    strongestGradeCount: strongestGrade ? gradeCounts.get(strongestGrade) ?? 0 : 0,
    sGradeCount: gradeCounts.get("S") ?? 0,
  };
}

function publicNetworkUrl() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function summaryHeadline(summary: RelationshipNetworkShareSummary) {
  if (summary.relationshipCount === 0) return "첫 인연 자리가 비어 있어요";
  if (summary.sGradeCount > 0) return `S급 인연 ${summary.sGradeCount}쌍 발견`;
  return `현재 최고 ${summary.strongestGrade ?? "-"}등급`;
}

function shareText(summary: RelationshipNetworkShareSummary) {
  if (summary.relationshipCount === 0) {
    return "내 인연 네트워크의 첫 번째 등급을 확인해 보세요.";
  }
  return `인연 ${summary.memberCount}명, 관계 ${summary.relationshipCount}쌍이 연결됐어요. 나는 이 지도에서 몇 등급일까요?`;
}

function memberNamesForPreview(network: RelationshipNetworkPublic) {
  const visibleNames = network.members.slice(0, 4).map((member) => member.displayName);
  const remainingCount = Math.max(0, network.members.length - visibleNames.length);
  return `${visibleNames.join(" · ")}${remainingCount > 0 ? ` 외 ${remainingCount}명` : ""}`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const normalizedRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + normalizedRadius, y);
  context.arcTo(x + width, y, x + width, y + height, normalizedRadius);
  context.arcTo(x + width, y + height, x, y + height, normalizedRadius);
  context.arcTo(x, y + height, x, y, normalizedRadius);
  context.arcTo(x, y, x + width, y, normalizedRadius);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient,
) {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
}

function drawNamedNetwork(
  context: CanvasRenderingContext2D,
  memberNames: string[],
  strongestGrade: RelationshipNetworkGrade | null,
) {
  const center = { x: STORY_WIDTH / 2, y: 950 };
  const visibleCount = Math.max(1, Math.min(memberNames.length, 12));
  const positions: Array<{ x: number; y: number }> = [center];
  const guestCount = Math.max(visibleCount - 1, 0);
  for (let index = 0; index < guestCount; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(guestCount, 1);
    positions.push({
      x: center.x + Math.cos(angle) * 300,
      y: center.y + Math.sin(angle) * 300,
    });
  }

  context.save();
  context.lineCap = "round";
  context.strokeStyle = "rgba(215, 198, 255, .44)";
  context.lineWidth = 7;
  for (let index = 1; index < positions.length; index += 1) {
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(positions[index].x, positions[index].y);
    context.stroke();
  }
  if (positions.length > 3) {
    context.strokeStyle = "rgba(215, 198, 255, .2)";
    context.lineWidth = 4;
    for (let index = 1; index < positions.length; index += 1) {
      const nextIndex = index === positions.length - 1 ? 1 : index + 1;
      context.beginPath();
      context.moveTo(positions[index].x, positions[index].y);
      context.lineTo(positions[nextIndex].x, positions[nextIndex].y);
      context.stroke();
    }
  }

  for (let index = 0; index < positions.length; index += 1) {
    const point = positions[index];
    const radius = index === 0 ? 78 : 58;
    context.shadowColor = "rgba(141, 99, 226, .45)";
    context.shadowBlur = index === 0 ? 38 : 24;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = index === 0 ? "#fff4a9" : "#ffffff";
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = index === 0 ? 9 : 6;
    context.strokeStyle = index === 0
      ? strongestGrade ? GRADE_COLORS[strongestGrade] : "#8b64e6"
      : "#d8c7fb";
    context.stroke();

    const displayName = (memberNames[index] ?? "친구").trim().slice(0, index === 0 ? 5 : 4);
    context.fillStyle = "#2c2440";
    context.font = `${index === 0 ? "900 28px" : "800 22px"} Pretendard, Apple SD Gothic Neo, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(displayName, point.x, point.y);
  }
  context.restore();

  if (memberNames.length <= 1) {
    context.save();
    context.setLineDash([16, 16]);
    context.lineWidth = 5;
    context.strokeStyle = "rgba(255, 255, 255, .35)";
    context.beginPath();
    context.arc(center.x, center.y, 300, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

export async function createRelationshipNetworkStoryBlob(
  network: RelationshipNetworkPublic,
) {
  const summary = summarizeRelationshipNetwork(network);
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  const host = network.members.find((member) => member.id === network.hostMemberId);
  const orderedMembers = [
    ...(host ? [host] : []),
    ...network.members.filter((member) => member.id !== network.hostMemberId),
  ];
  const memberNames = orderedMembers.map((member) => member.displayName);

  const background = context.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
  background.addColorStop(0, "#f8f1ff");
  background.addColorStop(.48, "#fffaf0");
  background.addColorStop(1, "#ffeaf5");
  context.fillStyle = background;
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const cardGradient = context.createLinearGradient(120, 480, 960, 1450);
  cardGradient.addColorStop(0, "#21183f");
  cardGradient.addColorStop(.55, "#352260");
  cardGradient.addColorStop(1, "#5f3ba5");
  fillRoundedRect(context, 88, 388, 904, 1070, 58, cardGradient);

  context.textAlign = "left";
  context.fillStyle = "#5f3da9";
  context.font = "900 36px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("주토피 · 인연 네트워크", 104, 145);

  context.fillStyle = "#25202c";
  context.font = "900 72px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("나는 이 지도에서", 104, 252);
  context.fillText("몇 등급일까?", 104, 335);

  context.fillStyle = "#fff2a7";
  context.font = "900 50px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText(summaryHeadline(summary), 142, 500);
  context.fillStyle = "rgba(255, 255, 255, .76)";
  context.font = "700 28px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("이름은 그대로, 생년정보는 안전하게 가렸어", 142, 555);

  drawNamedNetwork(context, memberNames, summary.strongestGrade);

  const chipY = 1320;
  const chipWidth = 236;
  const chipGap = 18;
  const chips = [
    `${summary.memberCount}명 연결`,
    `${summary.relationshipCount}쌍 관계`,
    summary.strongestGrade ? `최고 ${summary.strongestGrade}등급` : "첫 인연 대기",
  ];
  chips.forEach((label, index) => {
    const x = 142 + index * (chipWidth + chipGap);
    fillRoundedRect(context, x, chipY, chipWidth, 76, 38, "rgba(255, 255, 255, .12)");
    context.fillStyle = "#ffffff";
    context.font = "900 27px Pretendard, Apple SD Gothic Neo, sans-serif";
    context.textAlign = "center";
    context.fillText(label, x + chipWidth / 2, chipY + 49);
  });

  context.textAlign = "center";
  context.fillStyle = "#2b2530";
  context.font = "900 47px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("내 정보만 넣고 인연 연결하기", STORY_WIDTH / 2, 1576);
  context.fillStyle = "#746c78";
  context.font = "700 29px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("공유 링크에서 모든 사람과의 궁합을 한 번에 확인해", STORY_WIDTH / 2, 1633);

  const buttonGradient = context.createLinearGradient(204, 1694, 876, 1812);
  buttonGradient.addColorStop(0, "#7046cc");
  buttonGradient.addColorStop(1, "#9a63e5");
  fillRoundedRect(context, 204, 1694, 672, 118, 59, buttonGradient);
  context.fillStyle = "#ffffff";
  context.font = "900 34px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("내 등급 확인하러 들어오기", STORY_WIDTH / 2, 1768);
  context.fillStyle = "#918991";
  context.font = "700 23px Pretendard, Apple SD Gothic Neo, sans-serif";
  context.fillText("참여자 이름은 보이고 생년정보는 공개하지 않아", STORY_WIDTH / 2, 1870);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("IMAGE_EXPORT_FAILED")),
      "image/png",
    );
  });
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = STORY_FILE_NAME;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function RelationshipNetworkShareCard({
  network,
  onStatus,
}: {
  network: RelationshipNetworkPublic;
  onStatus?: (message: string) => void;
}) {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const summary = summarizeRelationshipNetwork(network);
  const working = shareState === "working";

  function updateState(next: ShareState, message: string) {
    setShareState(next);
    onStatus?.(message);
  }

  async function shareStory() {
    if (working) return;
    updateState("working", "스토리 카드를 만들고 있어.");
    try {
      const blob = await createRelationshipNetworkStoryBlob(network);
      const file = new File([blob], STORY_FILE_NAME, { type: "image/png" });
      const url = publicNetworkUrl();
      const text = shareText(summary);
      const storyShareData = { title: "내 인연 네트워크", text, url, files: [file] };
      if (navigator.share && navigator.canShare?.(storyShareData)) {
        await navigator.share(storyShareData);
        updateState("shared", "스토리 카드와 참여 링크를 공유했어.");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: "내 인연 네트워크", text, url });
        updateState("shared", "참여 링크를 공유했어. 스토리 이미지는 아래에서 저장할 수 있어.");
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      downloadBlob(blob);
      updateState("saved", "스토리 이미지를 저장하고 참여 링크를 복사했어.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareState("idle");
        return;
      }
      updateState("failed", "공유 카드를 만들지 못했어. 잠시 후 다시 시도해 줘.");
    }
  }

  async function copyLink() {
    if (working) return;
    try {
      await navigator.clipboard.writeText(`${shareText(summary)}\n${publicNetworkUrl()}`);
      updateState("copied", "참여 링크를 복사했어.");
    } catch {
      updateState("failed", "링크를 복사하지 못했어. 주소창의 링크를 복사해 줘.");
    }
  }

  async function saveStory() {
    if (working) return;
    updateState("working", "스토리 카드를 만들고 있어.");
    try {
      const blob = await createRelationshipNetworkStoryBlob(network);
      downloadBlob(blob);
      updateState("saved", "1080×1920 스토리 이미지를 저장했어.");
    } catch {
      updateState("failed", "스토리 이미지를 저장하지 못했어. 잠시 후 다시 시도해 줘.");
    }
  }

  const statusMessage = shareState === "shared"
    ? "스토리 카드와 참여 링크를 공유했어."
    : shareState === "copied"
      ? "참여 링크를 복사했어."
      : shareState === "saved"
        ? "스토리 이미지를 저장했어."
        : shareState === "failed"
          ? "공유를 완료하지 못했어. 다시 시도해 줘."
          : "카드에는 참여자 이름이 들어가고 생년정보는 공개하지 않아.";

  return (
    <section id="network-share-card" className={styles.relationshipCard} aria-labelledby="relationship-network-share-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="relationship-network-share-title">스토리에 올리고 친구 초대하기</h2>
          <p>참여자 이름과 인원·등급 힌트를 담은 9:16 카드야.</p>
        </div>
      </div>
      <div
        aria-hidden="true"
        style={{
          display: "grid",
          gap: 8,
          marginTop: 14,
          padding: "18px 16px",
          borderRadius: 16,
          background: "linear-gradient(145deg, #261c46, #6f49ba)",
          color: "#fff",
        }}
      >
        <small style={{ color: "#fff2a7", fontWeight: 900 }}>나는 이 지도에서 몇 등급일까?</small>
        <strong style={{ fontSize: "1.05rem" }}>{summaryHeadline(summary)}</strong>
        <span style={{ color: "rgba(255,255,255,.76)", fontSize: ".7rem" }}>
          {summary.memberCount}명 연결 · {summary.relationshipCount}쌍 관계 · {memberNamesForPreview(network)}
        </span>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <button type="button" className={styles.primaryButton} disabled={working} onClick={shareStory}>
          {working ? "스토리 카드 만드는 중…" : "스토리 카드 공유"}
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button type="button" className={styles.secondaryButton} disabled={working} onClick={copyLink}>링크 복사</button>
          <button type="button" className={styles.secondaryButton} disabled={working} onClick={saveStory}>9:16 이미지 저장</button>
        </div>
      </div>
      <p className={styles.formFootnote} role="status" aria-live="polite" style={{ marginTop: 10 }}>
        {statusMessage}
      </p>
    </section>
  );
}
