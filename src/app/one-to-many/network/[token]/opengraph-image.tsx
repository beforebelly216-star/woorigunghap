import { ImageResponse } from "next/og";
import { isOpaqueToken } from "@/lib/auth-policy";
import {
  RELATIONSHIP_NETWORK_GRADES,
  type RelationshipNetworkGrade,
} from "@/lib/relationship-network-contract";
import { loadRelationshipNetwork } from "@/lib/relationship-network-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "우리사주 인연 네트워크 초대";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRADE_COLORS: Record<RelationshipNetworkGrade, string> = {
  S: "#49c58c",
  A: "#79c97d",
  B: "#b2c85b",
  C: "#e2ad4d",
  D: "#e6876b",
  E: "#d85f70",
};

function strongestGrade(grades: RelationshipNetworkGrade[]) {
  const present = new Set(grades);
  return RELATIONSHIP_NETWORK_GRADES.find((grade) => present.has(grade)) ?? null;
}

function NetworkConstellation({
  memberCount,
  grade,
}: {
  memberCount: number;
  grade: RelationshipNetworkGrade | null;
}) {
  const color = grade ? GRADE_COLORS[grade] : "#a889ef";
  const opacity = memberCount > 1 ? 1 : .42;
  return (
    <svg width="430" height="360" viewBox="0 0 430 360" aria-hidden="true">
      <defs>
        <radialGradient id="network-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8e64df" stopOpacity=".42" />
          <stop offset="100%" stopColor="#8e64df" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="215" cy="180" r="174" fill="url(#network-glow)" />
      <g stroke="#d7c6ff" strokeWidth="5" strokeLinecap="round" opacity={opacity}>
        <line x1="215" y1="180" x2="215" y2="42" />
        <line x1="215" y1="180" x2="348" y2="118" />
        <line x1="215" y1="180" x2="323" y2="286" />
        <line x1="215" y1="180" x2="107" y2="286" />
        <line x1="215" y1="180" x2="82" y2="118" />
      </g>
      <g fill="#ffffff" stroke="#d7c6ff" strokeWidth="6" opacity={opacity}>
        <circle cx="215" cy="42" r="28" />
        <circle cx="348" cy="118" r="28" />
        <circle cx="323" cy="286" r="28" />
        <circle cx="107" cy="286" r="28" />
        <circle cx="82" cy="118" r="28" />
      </g>
      <circle cx="215" cy="180" r="43" fill="#fff2a7" stroke={color} strokeWidth="9" />
      {memberCount <= 1 ? <circle cx="215" cy="180" r="138" fill="none" stroke="#ffffff" strokeWidth="4" strokeDasharray="12 14" opacity=".35" /> : null}
    </svg>
  );
}

export default async function RelationshipNetworkOpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const network = isOpaqueToken(token)
    ? await loadRelationshipNetwork(token).catch(() => null)
    : null;
  const host = network?.members.find((member) => member.id === network.hostMemberId);
  const hostName = host?.displayName.trim().slice(0, 12) || "친구";
  const memberCount = network?.memberCount ?? 1;
  const relationshipCount = network?.edges.length ?? 0;
  const grade = strongestGrade(network?.edges.map((edge) => edge.grade) ?? []);
  const headline = relationshipCount > 0
    ? `${hostName}님의 인연 네트워크`
    : `${hostName}님의 첫 인연을 기다려요`;

  return new ImageResponse(
    (
      <div
        lang="ko-KR"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          padding: "54px 64px",
          background: "linear-gradient(135deg, #fffaf0 0%, #f8f1ff 58%, #ffeaf5 100%)",
          color: "#25202c",
        }}
      >
        <div
          style={{
            width: "58%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "12px 0 8px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#6744b0", fontSize: 25, fontWeight: 800 }}>
              <span style={{ display: "flex", width: 13, height: 13, borderRadius: 99, background: "#8b64e6" }} />
              우리사주 · 인연 네트워크
            </div>
            <div style={{ display: "flex", marginTop: 34, fontSize: 55, lineHeight: 1.18, fontWeight: 900, letterSpacing: "-2px" }}>
              {headline}
            </div>
            <div style={{ display: "flex", marginTop: 24, color: "#61596a", fontSize: 29, lineHeight: 1.45, fontWeight: 700 }}>
              나는 이 지도에서 몇 등급일까?
              <br />내 정보만 넣으면 모든 인연이 연결돼요.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", padding: "12px 19px", borderRadius: 99, background: "#ffffff", color: "#5c5263", fontSize: 22, fontWeight: 800 }}>
              현재 {memberCount}명
            </div>
            <div style={{ display: "flex", padding: "12px 19px", borderRadius: 99, background: "#ffffff", color: "#5c5263", fontSize: 22, fontWeight: 800 }}>
              관계 {relationshipCount}쌍
            </div>
            <div style={{ display: "flex", padding: "12px 19px", borderRadius: 99, background: grade ? GRADE_COLORS[grade] : "#ede5fa", color: grade ? "#ffffff" : "#6744b0", fontSize: 22, fontWeight: 900 }}>
              {grade ? `최고 ${grade}등급` : "첫 인연 대기"}
            </div>
          </div>
        </div>
        <div
          style={{
            width: "42%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 42,
            background: "linear-gradient(150deg, #21183f, #6240a7)",
            boxShadow: "0 20px 45px rgba(86, 57, 139, .18)",
          }}
        >
          <NetworkConstellation memberCount={memberCount} grade={grade} />
        </div>
      </div>
    ),
    { ...size },
  );
}
