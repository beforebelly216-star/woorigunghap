"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountDeletionPanel } from "@/components/account-deletion-panel";
import { RelationshipNetworkSavedList } from "@/components/relationship-network-saved-list";
import { loadOrderDraft, removeOrderDraft } from "@/lib/order-storage";
import { removeReportProgress } from "@/lib/report-progress-storage";

type ReportSummary = {
  paymentId: string;
  product: "oneToOne" | "oneToMany";
  productLabel: string;
  relationshipLabel: string;
  title: string;
  createdAt: string;
  claimedAt: string;
  status: "generating" | "ready";
};

type LibraryState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "failed" }
  | { status: "ready"; reports: ReportSummary[] };

const GENERATION_RESUME_INTERVAL_MS = 60_000;

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
  const [reloadKey, setReloadKey] = useState(0);
  const [deleteBusyPaymentId, setDeleteBusyPaymentId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const resumeAttemptedAt = useRef(new Map<string, number>());

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    async function resumeGeneratingReport(report: ReportSummary) {
      if (report.status !== "generating") return;
      const now = Date.now();
      const lastAttempt = resumeAttemptedAt.current.get(report.paymentId) ?? 0;
      if (now - lastAttempt < GENERATION_RESUME_INTERVAL_MS) return;

      const order = loadOrderDraft(report.paymentId);
      if (!order || order.product !== report.product) return;
      resumeAttemptedAt.current.set(report.paymentId, now);

      try {
        await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            paymentId: report.paymentId,
            accessToken: order.resultAccessToken,
            input: order.inputSnapshot,
          }),
          cache: "no-store",
        });
      } catch {
        // The library poll retries the recovery handoff after the throttle interval.
      }
    }

    async function load() {
      try {
        const response = await fetch("/api/account/reports", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: "guest" });
          return;
        }
        if (response.ok && Array.isArray(payload?.reports)) {
          const reports = payload.reports as ReportSummary[];
          setState({ status: "ready", reports });
          if (reports.some((report) => report.status === "generating")) {
            for (const report of reports) void resumeGeneratingReport(report);
            timer = window.setTimeout(load, 4_000);
          }
          return;
        }
        setState({ status: "failed" });
      } catch {
        if (!cancelled) setState({ status: "failed" });
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [reloadKey]);

  function reload() {
    setState({ status: "loading" });
    setReloadKey((value) => value + 1);
  }

  async function deleteReport(report: ReportSummary) {
    const confirmed = window.confirm("이 결과를 삭제하면 복구할 수 없습니다. 상세 리포트와 입력정보는 삭제되고, 결제 거래기록은 법정 보존 의무에 필요한 최소 정보만 남습니다. 삭제할까요?");
    if (!confirmed) return;
    setDeleteBusyPaymentId(report.paymentId);
    setDeleteMessage(null);
    try {
      const response = await fetch(`/api/account/reports/${encodeURIComponent(report.paymentId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setDeleteMessage(typeof payload?.error === "string" ? payload.error : "결과 삭제에 실패했습니다.");
        return;
      }
      removeOrderDraft(report.paymentId);
      removeReportProgress(report.paymentId, report.createdAt);
      setState((current) => current.status === "ready"
        ? { ...current, reports: current.reports.filter((item) => item.paymentId !== report.paymentId) }
        : current);
      setDeleteMessage("보관함 결과를 삭제했습니다.");
    } catch {
      setDeleteMessage("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setDeleteBusyPaymentId(null);
    }
  }

  return <main className="library-page">
    <section className="library-shell">
      <p className="eyebrow">ACCOUNT LIBRARY</p>
      <h1>내 궁합 보관함</h1>
      <p className="library-intro">구매 리포트와 이 브라우저에서 만든 무료 인연 네트워크를 이곳에서 다시 확인할 수 있습니다.</p>
      <RelationshipNetworkSavedList />

      <div aria-live="polite" aria-busy={state.status === "loading"}>
        {state.status === "loading" ? <div className="library-state"><p>보관함을 불러오고 있어요.</p></div> : null}
        {state.status === "guest" ? <div className="library-state">
          <h2>로그인이 필요해요</h2>
          <p>카카오 로그인 후 저장한 구매 리포트를 확인할 수 있어요. 이 브라우저에서 만든 무료 네트워크는 로그인 없이 다시 열 수 있습니다.</p>
          <Link className="primary-link" href="/login?returnTo=%2Faccount%2Freports">카카오 로그인</Link>
        </div> : null}
        {state.status === "failed" ? <div className="library-state" role="alert">
          <h2>보관함을 불러오지 못했어요</h2>
          <p>기존 결과는 사라지지 않았습니다. 네트워크 상태를 확인한 뒤 다시 불러와 주세요.</p>
          <button type="button" className="secondary-action" onClick={reload}>다시 불러오기</button>
        </div> : null}
        {state.status === "ready" && state.reports.length === 0 ? <div className="library-state">
          <h2>아직 저장한 구매 리포트가 없어요</h2>
          <p>결제가 확인되면 결과 생성 중부터 표시됩니다. 무료 인연 네트워크는 생성 즉시 위 목록에 저장됩니다.</p>
          <Link className="primary-link" href="/">새 궁합 보기</Link>
        </div> : null}
        {state.status === "ready" && deleteMessage ? <p className="library-delete-feedback" role="status">{deleteMessage}</p> : null}
        {state.status === "ready" && state.reports.length > 0 ? <ul className="library-grid">
          {state.reports.map((report) => <li key={report.paymentId}>
            {report.status === "ready" ? <article className="library-card-shell">
              <Link className="library-card" href={reportHref(report)}>
                <span>{report.productLabel} · {report.relationshipLabel}</span>
                <strong>{report.title}</strong>
                <small>{formatDate(report.createdAt)} 구매</small>
                <b>결과 열기 · 공유하기</b>
              </Link>
              <button
                type="button"
                className="library-delete-button"
                onClick={() => void deleteReport(report)}
                disabled={deleteBusyPaymentId === report.paymentId}
              >{deleteBusyPaymentId === report.paymentId ? "삭제 중…" : "결과 삭제"}</button>
            </article> : <article className="library-card library-card-generating" aria-busy="true">
              <span>{report.productLabel} · {report.relationshipLabel}</span>
              <strong>{report.title}</strong>
              <small>{formatDate(report.createdAt)} 구매</small>
              <b>생성중</b>
              <p>자동 복구를 확인하고 있어요. 생성이 끊기면 같은 브라우저의 복구키로 1분 간격으로 다시 이어갑니다. 추가 결제나 중복 AI 생성은 하지 않습니다.</p>
            </article>}
          </li>)}
        </ul> : null}
      </div>
      {state.status === "ready" ? <AccountDeletionPanel /> : null}
    </section>
  </main>;
}
