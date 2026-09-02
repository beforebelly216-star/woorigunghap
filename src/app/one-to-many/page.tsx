import Link from "next/link";
import type { Metadata } from "next";
import { RelationshipNetworkCreateForm } from "@/components/relationship-network-create-form";
import { RelationshipNetworkSavedList } from "@/components/relationship-network-saved-list";
import { ZootopiMark } from "@/components/zootopi-mark";
import "../../components/zootopi-mark.css";
import "../input-reference-v4.css";
import "./one-to-many-input-v3.css";
import styles from "./relationship-network.module.css";

export const metadata: Metadata = {
  title: "무료 인연 네트워크 | 우리사주",
  description: "내 정보만 입력하고 링크를 공유하면 친구들의 궁합 관계가 실시간 인물 네트워크로 연결돼",
};

export default function OneToManyPage() {
  return (
    <main className={`${styles.page} one-to-many-page reference-input-screen one-to-many-reference-page relationship-network-page`}>
      <div className={`${styles.shell} one-to-many-shell`}>
        <header className={`${styles.appHeader} one-to-many-app-header`}>
          <Link href="/" aria-label="홈으로 돌아가기">‹</Link>
          <strong>1:N 인연 네트워크</strong>
          <span>무료</span>
        </header>

        <section className={styles.createHero}>
          <div>
            <span className={styles.eyebrow}>공유하고 · 참여하고 · 연결하기</span>
            <h1>링크 하나로<br/><em>우리 관계가 연결돼요</em></h1>
            <p>나는 내 정보만 입력해서 공유해. 친구가 들어올 때마다 모든 사람 사이의 궁합이 실시간으로 이어져.</p>
          </div>
          <div className={styles.heroMascot} aria-hidden="true">
            <span>✦</span><ZootopiMark expression="idea" withBody />
          </div>
        </section>

        <section className={styles.featureStrip} aria-label="인연 네트워크 특징">
          <div><strong>01</strong><span>내 정보만<br/>한 번 입력</span></div>
          <div><strong>02</strong><span>친구에게<br/>링크 공유</span></div>
          <div><strong>03</strong><span>모든 관계<br/>자동 연결</span></div>
        </section>

        <RelationshipNetworkSavedList />
        <RelationshipNetworkCreateForm />
      </div>
    </main>
  );
}
