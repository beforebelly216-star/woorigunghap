"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountDeletionPanel } from "@/components/account-deletion-panel";
import { loadOrderDraft } from "@/lib/order-storage";

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
  | { status: "ready"; reports: ReportSummary[]; kakaoNotifyEnabled: boolean };

type NotifyResult = "enabled" | "failed" | null;

const GENERATION_RESUME_INTERVAL_MS = 120_000;

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
  const [notifyResult, setNotifyResult] = useState<NotifyResult>(null);
  const resumeAttemptedAt = useRef(new Map<string, number>());

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("notify");
    if (result === "enabled" || result === "failed") setNotifyResult(result);
  }, []);

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
        // The library poll will retry this recovery handoff after the throttle interval.
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
          const kakaoNotifyEnabled = payload?.kakaoNotifyEnabled === true;
          setState({ status: "ready", reports, kakaoNotifyEnabled });
          if (kakaoNotifyEnabled) setNotifyResult("enabled");
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

  return <main className="library-page">
    <section className="library-shell">
      <p className="eyebrow">ACCOUNT LIBRARY</p>
      <h1>내 궁합 보관함</h1>
      <p className="library-intro">결제 완료 즉시 보관함에 저장되고, 생성 중인 결과는 완료될 때까지 자동으로 상태를 확인합니다.</p>

      <div aria-live="polite" aria-busy={state.status === "loading"}>
        {state.status === "loading" ? <div className="library-state"><p>보관함을 불러오고 있어요.</p></div> : null}
        {state.status === "guest" ? <div className="library-state">
          <h2>로그인이 필요해요</h2>
          <p>카카오 로그인 후 저장한 구매 리포트를 확인할 수 있어요.</p>
          <Link className="primary-link" href="/login?returnTo=%2Faccount%2Freports">카카오 로그인</Link>
        </div> : null}
        {state.status === "failed" ? <div className="library-state" role="alert">
          <h2>보관함을 불러오지 못했어요</h2>
          <p>기존 결과는 사라지지 않았습니다. 네트워크 상태를 확인한 뒤 다시 불러와 주세요.</p>
          <button type="button" className="secondary-action" onClick={reload}>다시 불러오기</button>
        </div> : null}
        {state.status === "ready" ? <div className="library-notification-panel">
          <div>
            <strong>카카오톡 완료 알림</strong>
            <p>{state.kakaoNotifyEnabled
              ? "결과 생성이 끝나면 카카오톡 ‘나에게 보내기’로 알려드려요."
              : "생성이 오래 걸려도 다른 화면을 이용할 수 있도록 완료 시 카카오톡으로 알려드릴 수 있어요."}</p>
            {notifyResult === "failed" && !state.kakaoNotifyEnabled ? <p className="library-notification-feedback library-notification-feedback-error" role="alert">
              카카오 메시지 권한 또는 알림 서버 설정을 활성화하지 못했어요. 아래 버튼으로 다시 연결해 주세요.
            </p> : null}
            {notifyResult === "enabled" && state.kakaoNotifyEnabled ? <p className="library-notification-feedback">
              완료 알림이 활성화되었습니다.
            </p> : null}
          </div>
          {!state.kakaoNotifyEnabled ? <Link
            className="secondary-action"
            href="/api/auth/kakao/start?notify=1&returnTo=%2Faccount%2Freports"
          >{notifyResult === "failed" ? "완료 알림 다시 연결" : "완료 알림 받기"}</Link> : <span className="library-notification-enabled">알림 사용 중</span>}
        </div> : null}
        {state.status === "ready" && state.reports.length === 0 ? <div className="library-state">
          <h2>아직 저장한 리포트가 없어요</h2>
          <p>로그인 상태에서 결제가 확인되면 결과 생성 중부터 이곳에 자동으로 표시됩니다.</p>
          <Link className="primary-link" href="/">새 궁합 보기</Link>
        </div> : null}
        {state.status === "ready" && state.reports.length > 0 ? <ul className="library-grid">
          {state.reports.map((report) => <li key={report.paymentId}>
            {report.status === "ready" ? <Link className="library-card" href={reportHref(report)}>
              <span>{report.productLabel} · {report.relationshipLabel}</span>
              <strong>{report.title}</strong>
              <small>{formatDate(report.createdAt)} 구매</small>
              <b>저장된 결과 열기</b>
            </Link> : <article className="library-card library-card-generating" aria-busy="true">
              <span>{report.productLabel} · {report.relationshipLabel}</span>
              <strong>{report.title}</strong>
              <small>{formatDate(report.createdAt)} 구매</small>
              <b>생성중</b>
              <p>결과를 만들고 있어요. 같은 브라우저의 복구키가 있으면 멈춘 생성도 자동으로 다시 이어갑니다.</p>
            </article>}
          </li>)}
        </ul> : null}
      </div>
      {state.status === "ready" ? <AccountDeletionPanel /> : null}
    </section>
  </main>;
}
