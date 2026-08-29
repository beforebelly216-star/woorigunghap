"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./home-p5.module.css";

type RecentReport = {
  paymentId: string;
  product: "oneToOne" | "oneToMany";
  relationshipLabel: string;
  subjectName: string;
  score: number | null;
  status: "generating" | "ready";
};

type RecentState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "failed" }
  | { status: "ready"; reports: RecentReport[] };

function reportHref(report: RecentReport) {
  const path = report.product === "oneToOne" ? "/one-to-one/result" : "/one-to-many/result";
  return `${path}?${new URLSearchParams({ paymentId: report.paymentId, source: "account" }).toString()}`;
}

function profileLabel(report: RecentReport) {
  if (report.product === "oneToMany") return "1:다";
  return Array.from(report.subjectName.trim()).slice(0, 3).join("") || "궁합";
}

export function HomeRecentReports() {
  const [state, setState] = useState<RecentState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/reports", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: "guest" });
          return;
        }
        if (response.ok && Array.isArray(payload?.reports)) {
          setState({ status: "ready", reports: (payload.reports as RecentReport[]).slice(0, 3) });
          return;
        }
        setState({ status: "failed" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <section className={styles.rankSection} aria-labelledby="recent-reports-title">
    <div className={styles.sectionTitle}>
      <h2 id="recent-reports-title">최근 보관함</h2>
      <Link href="/account/reports">전체보기 ›</Link>
    </div>

    {state.status === "loading" ? <div className={styles.recentState} aria-busy="true">최근 결과를 불러오고 있어요.</div> : null}
    {state.status === "guest" ? <div className={styles.recentState}>
      <p>로그인하면 보관함의 최근 궁합 3개를 바로 볼 수 있어요.</p>
      <Link href="/login?returnTo=%2F">카카오 로그인</Link>
    </div> : null}
    {state.status === "failed" ? <div className={styles.recentState} role="alert">보관함을 불러오지 못했어요.</div> : null}
    {state.status === "ready" && state.reports.length === 0 ? <div className={styles.recentState}>아직 보관한 궁합이 없어요.</div> : null}
    {state.status === "ready" && state.reports.length > 0 ? <div className={styles.rankGrid}>
      {state.reports.map((report) => <Link key={report.paymentId} href={reportHref(report)} className={styles.rankItem}>
        <span className={`${styles.avatar} ${report.product === "oneToMany" ? styles.manyAvatar : ""}`} aria-hidden="true">{profileLabel(report)}</span>
        {report.product === "oneToOne" ? <strong className={styles.rankName}>{report.subjectName}</strong> : null}
        <span className={styles.rankRelation}>{report.relationshipLabel}</span>
        <b className={styles.rankScore}>{report.score === null ? "생성 중" : `${Math.round(report.score)}점`}</b>
      </Link>)}
    </div> : null}
  </section>;
}
