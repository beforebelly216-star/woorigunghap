"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  readSavedRelationshipNetworks,
  type SavedRelationshipNetwork,
} from "@/lib/relationship-network-browser-storage";
import styles from "@/app/one-to-many/relationship-network.module.css";

function expiryLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function RelationshipNetworkSavedList() {
  const [networks, setNetworks] = useState<SavedRelationshipNetwork[] | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setNetworks(readSavedRelationshipNetworks());
    });
    return () => { active = false; };
  }, []);

  if (!networks?.length) return null;

  return (
    <section className={styles.savedNetworks} aria-label="내가 만든 인연 네트워크">
      <div className={styles.savedNetworksHeader}>
        <div>
          <span>MY NETWORK</span>
          <h2>내가 만든 네트워크</h2>
        </div>
        <small>이 브라우저에 저장됨</small>
      </div>
      <div className={styles.savedNetworkList}>
        {networks.map((network) => (
          <div className={styles.savedNetworkRow} key={network.token}>
            <div>
              <strong>{network.hostName}님의 인연 네트워크</strong>
              <small>{expiryLabel(network.expiresAt)}까지 다시 볼 수 있어요</small>
            </div>
            <Link href={`/one-to-many/network/${network.token}`}>다시 보기</Link>
          </div>
        ))}
      </div>
      <p>다른 기기에서 관리하려면 네트워크 화면의 방 관리에서 관리 링크를 따로 저장해 주세요.</p>
    </section>
  );
}
