import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isOpaqueToken } from "@/lib/auth-policy";
import { loadRelationshipNetwork } from "@/lib/relationship-network-store";
import { RelationshipNetworkExperience } from "@/components/relationship-network-experience";
import "../../../input-reference-v4.css";
import "../../one-to-many-input-v3.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loadNetwork = cache((token: string) => loadRelationshipNetwork(token));

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const network = isOpaqueToken(token) ? await loadNetwork(token) : null;
  const host = network?.members.find((member) => member.id === network.hostMemberId);
  const title = host ? `${host.displayName}님의 인연 네트워크 | 우리사주` : "인연 네트워크 | 우리사주";
  const description = "내 정보만 입력하면 모든 참여자와의 궁합 점수·등급이 인물 네트워크에 연결됩니다.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  };
}

export default async function RelationshipNetworkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isOpaqueToken(token)) notFound();
  const network = await loadNetwork(token);
  if (!network) notFound();
  return <RelationshipNetworkExperience token={token} initialNetwork={network} />;
}
