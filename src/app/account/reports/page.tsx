"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReportSummary = {
  paymentId: string;
  product: "oneToOne" | "oneToMany";
  productLabel: string;
  relationshipLabel: string;
  title: string;
  createdAt: string;
  claimedAt: string;
};

type LibraryState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "failed" }
  | { status: "ready"; reports: ReportSummary[] };

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "저장일 확인 불가";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function reportHref(report: ReportSummary) {
  const path = report.product === "oneToOne" ? "/one-to-one/result" : "/one-to-many/result";
  return `${path}?${new URLSearchParams({ paymentId: report.paymentId, source: "account" }).toString()}`;
}

export default function AccountReportsPage() {
  const [state, setState] = useState<LibraryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/reports", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: "guest" });
        } else if (response.ok && Array.isArray(payload?.reports)) {
          setState({ status: "ready", reports: payload.reports });
        } else {
          setState({ status: "failed" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <main className="library-page">
    <section className="library-shell">
      <p className="eyebrow">ACCOUNT LIBRARY</p>
      <h1>내 궁합 보관함</h1>
      <p className="library-intro">결제 결과를 다시 계산하거나 AI를 다시 호출하지 않고, 구매 당시 저장된 리포트를 그대로 열어봅니다.</p>

      {state.status === "loading" ? <div className="library-state"><p>보관함을 불러오고 있어요.</p></div> : null}
      {state.status === "guest" ? <div className="library-state">
        <h2>로그인이 필요해요</h2>
        <p>카카오 로그인 후 저장한 구매 리포트를 확인할 수 있어요.</p>
        <Link className="primary-link" href="/login?returnTo=%2Faccount%2Freports">카카오 로그인</Link>
      </div> : null}
      {state.status === "failed" ? <div className="library-state">
        <h2>보관함을 불러오지 못했어요</h2>
        <p>잠시 후 페이지를 새로고침해 주세요. 기존 결과 링크는 계속 사용할 수 있습니다.</p>
      </div> : null}
      {state.status === "ready" && state.reports.length === 0 ? <div className="library-state">
        <h2>아직 저장한 리포트가 없어요</h2>
        <p>결제 결과 화면에서 로그인하면 해당 리포트가 이곳에 자동으로 연결됩니다.</p>
        <Link className="primary-link" href="/">새 궁합 보기</Link>
      </div> : null}
      {state.status === "ready" && state.reports.length > 0 ? <ul className="library-grid">
        {state.reports.map((report) => <li key={report.paymentId}>
          <Link className="library-card" href={reportHref(report)}>
            <span>{report.productLabel} · {report.relationshipLabel}</span>
            <strong>{report.title}</strong>
            <small>{formatDate(report.createdAt)} 구매</small>
            <b>저장된 결과 열기</b>
          </Link>
        </li>)}
      </ul> : null}
    </section>
  </main>;
}
