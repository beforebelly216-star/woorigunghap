"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  readSavedRelationshipNetworks,
  type SavedRelationshipNetwork,
} from "@/lib/relationship-network-browser-storage";
import styles from "@/app/one-to-many/relationship-network.module.css";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const MAX_VISIBLE_NETWORKS = 50;

type AccountSavedRelationshipNetwork = SavedRelationshipNetwork & {
  memberCount: number;
  isOpen: boolean;
};

type VisibleSavedRelationshipNetwork = SavedRelationshipNetwork & {
  memberCount: number | null;
  isOpen: boolean | null;
  savedInAccount: boolean;
  savedOnDevice: boolean;
};

function expiryLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function parseAccountSavedNetworks(value: unknown, now = Date.now()) {
  if (!Array.isArray(value)) return [];
  const networks: AccountSavedRelationshipNetwork[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.token !== "string"
      || !TOKEN_PATTERN.test(candidate.token)
      || typeof candidate.hostName !== "string"
      || !candidate.hostName.trim()
      || typeof candidate.expiresAt !== "string"
      || Number.isNaN(Date.parse(candidate.expiresAt))
      || Date.parse(candidate.expiresAt) <= now
      || typeof candidate.savedAt !== "string"
      || Number.isNaN(Date.parse(candidate.savedAt))
      || typeof candidate.memberCount !== "number"
      || !Number.isInteger(candidate.memberCount)
      || candidate.memberCount < 1
      || candidate.memberCount > 30
      || typeof candidate.isOpen !== "boolean"
    ) continue;
    networks.push({
      token: candidate.token,
      hostName: candidate.hostName.trim().slice(0, 40),
      expiresAt: new Date(candidate.expiresAt).toISOString(),
      savedAt: new Date(candidate.savedAt).toISOString(),
      memberCount: candidate.memberCount,
      isOpen: candidate.isOpen,
    });
  }
  return networks.slice(0, MAX_VISIBLE_NETWORKS);
}

function mergeSavedNetworks(
  deviceNetworks: SavedRelationshipNetwork[],
  accountNetworks: AccountSavedRelationshipNetwork[],
) {
  const merged = new Map<string, VisibleSavedRelationshipNetwork>();
  for (const network of deviceNetworks) {
    merged.set(network.token, {
      ...network,
      memberCount: null,
      isOpen: null,
      savedInAccount: false,
      savedOnDevice: true,
    });
  }
  for (const network of accountNetworks) {
    const device = merged.get(network.token);
    merged.set(network.token, {
      ...network,
      savedAt: device && Date.parse(device.savedAt) > Date.parse(network.savedAt)
        ? device.savedAt
        : network.savedAt,
      savedInAccount: true,
      savedOnDevice: Boolean(device),
    });
  }
  return Array.from(merged.values())
    .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))
    .slice(0, MAX_VISIBLE_NETWORKS);
}

function savedLocationLabel(network: VisibleSavedRelationshipNetwork) {
  if (network.savedInAccount && network.savedOnDevice) return "카카오 보관함 · 이 기기";
  if (network.savedInAccount) return "카카오 보관함";
  return "이 기기";
}

export function RelationshipNetworkSavedList() {
  const [networks, setNetworks] = useState<VisibleSavedRelationshipNetwork[] | null>(null);

  useEffect(() => {
    let active = true;
    const deviceNetworks = readSavedRelationshipNetworks();
    queueMicrotask(() => {
      if (active) setNetworks(mergeSavedNetworks(deviceNetworks, []));
    });
    fetch("/api/account/relationship-networks", {
      cache: "no-store",
      referrerPolicy: "no-referrer",
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!active || !response.ok) return;
      setNetworks(mergeSavedNetworks(
        deviceNetworks,
        parseAccountSavedNetworks(payload?.networks),
      ));
    }).catch(() => {
      // 비회원 또는 일시적인 계정 조회 실패에도 이 기기의 저장 목록은 유지합니다.
    });
    return () => { active = false; };
  }, []);

  if (!networks?.length) return null;

  const hasAccountNetwork = networks.some((network) => network.savedInAccount);
  const hasDeviceNetwork = networks.some((network) => network.savedOnDevice);
  const storageSummary = hasAccountNetwork && hasDeviceNetwork
    ? "계정과 기기에 저장됨"
    : hasAccountNetwork ? "카카오 보관함에 저장됨" : "이 기기에 저장됨";

  return (
    <section className={styles.savedNetworks} aria-label="내가 만든 인연 네트워크">
      <div className={styles.savedNetworksHeader}>
        <div>
          <span>MY NETWORK</span>
          <h2>내가 만든 네트워크</h2>
        </div>
        <small>{storageSummary}</small>
      </div>
      <div className={styles.savedNetworkList}>
        {networks.map((network) => (
          <div className={styles.savedNetworkRow} key={network.token}>
            <div>
              <strong>{network.hostName}님의 인연 네트워크</strong>
              <small>
                {expiryLabel(network.expiresAt)}까지 · {savedLocationLabel(network)}
                {network.memberCount ? ` · ${network.memberCount}명` : ""}
              </small>
            </div>
            <Link href={`/one-to-many/network/${network.token}`}>다시 보기</Link>
          </div>
        ))}
      </div>
      <p>{hasAccountNetwork
        ? "카카오 보관함에 저장한 네트워크는 다른 기기에서도 다시 볼 수 있어. 방 관리는 처음 만든 기기나 관리 링크에서 이용해 줘."
        : "다른 기기에서 다시 보려면 네트워크 화면에서 카카오 계정에 저장하거나 관리 링크를 따로 보관해 줘."}</p>
    </section>
  );
}
