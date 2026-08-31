"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OneToManyResult } from "@/components/one-to-many-result";
import { buildOneToManyResultView } from "@/lib/compatibility/one-to-many-view";
import type { OneToManyCalculationSnapshot } from "@/lib/compatibility/one-to-many";
import type { OneToManyNarrativeContent, OneToManyNarrativeMeta } from "@/lib/narrative/one-to-many-report-engine";
import { loadOrderDraft, saveOrderDraft } from "@/lib/order-storage";
import type { OneToManyOrderDraft } from "@/lib/orders";
import { isResultAccessToken } from "@/lib/result-access-token";

type StoredReport = {
  snapshot: OneToManyCalculationSnapshot;
  narrative: OneToManyNarrativeContent;
  meta: OneToManyNarrativeMeta;
};

type ResultState = "loading" | "generating" | "ready" | "failed" | "missing";

type DisplayOneToManyOrder = Omit<OneToManyOrderDraft, "resultAccessToken"> & {
  resultAccessToken?: string;
};

type AccountReportPayload = {
  product?: "oneToOne" | "oneToMany";
  order?: DisplayOneToManyOrder;
  report?: StoredReport;
  error?: string;
};

function tokenFromHash() {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("accessToken");
  return isResultAccessToken(token) ? token : null;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function OneToManyPaidResult() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const accountSource = searchParams.get("source") === "account";
  const [order, setOrder] = useState<DisplayOneToManyOrder | null>(null);
  const [report, setReport] = useState<StoredReport | null>(null);
  const [state, setState] = useState<ResultState>("loading");
  const [message, setMessage] = useState("결제와 저장 결과를 확인하고 있어요.");
  const [retryKey, setRetryKey] = useState(0);

  const load = useCallback(async () => {
    if (!paymentId) {
      setState("missing");
      return;
    }
    if (accountSource) {
      try {
        const response = await fetch(`/api/account/reports/${encodeURIComponent(paymentId)}`, {
          cache: "no-store",
          referrerPolicy: "no-referrer",
        });
        const payload = await response.json().catch(() => null) as AccountReportPayload | null;
        if (response.ok && payload?.product === "oneToMany" && payload.order && payload.report) {
          setOrder(payload.order);
          setReport(payload.report);
          setState("ready");
          return;
        }
        setMessage(response.status === 401
          ? "이 보관함 결과를 열려면 다시 로그인해 주세요."
          : payload?.error ?? "보관함에서 결과를 불러오지 못했어요.");
        setState("failed");
        return;
      } catch {
        setMessage("보관함에서 결과를 불러오지 못했어요.");
        setState("failed");
        return;
      }
    }
    const local = loadOrderDraft(paymentId);
    let activeOrder = local?.product === "oneToMany" ? local : null;
    const accessToken = activeOrder?.resultAccessToken ?? tokenFromHash();
    if (!accessToken) {
      setState("missing");
      return;
    }

    try {
      if (!activeOrder) {
        const response = await fetch("/api/reports/one-to-many/recover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentId, accessToken }),
          cache: "no-store",
        });
        const recovered = await response.json().catch(() => null) as { order?: OneToManyOrderDraft; report?: StoredReport; error?: string } | null;
        if (!response.ok || !recovered?.order) throw new Error(recovered?.error ?? "결과를 복구하지 못했어요.");
        activeOrder = recovered.order;
        saveOrderDraft(activeOrder);
        setOrder(activeOrder);
        if (recovered.report) {
          setReport(recovered.report);
          setState("ready");
          return;
        }
      }

      setOrder(activeOrder);
      setState("generating");
      setMessage("서버 계산 결과를 확정하고 AI 해설을 한 번 생성하고 있어요. 창을 닫아도 같은 링크에서 이어집니다.");
      for (let attempt = 1; attempt <= 12; attempt += 1) {
        const response = await fetch("/api/compatibility/one-to-many", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentId, accessToken }),
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null) as (StoredReport & { error?: string; code?: string; retryable?: boolean }) | null;
        if (response.ok && payload?.snapshot && payload.narrative && payload.meta) {
          setReport(payload);
          setState("ready");
          return;
        }
        if (payload?.code === "REPORT_GENERATION_IN_PROGRESS") {
          setMessage("같은 결제의 리포트를 안전하게 생성 중이에요. 중복 AI 호출 없이 완료 결과를 확인하고 있습니다.");
          await wait(Math.min(5_000, attempt * 1_000));
          continue;
        }
        throw new Error(payload?.error ?? "리포트를 생성하지 못했어요.");
      }
      throw new Error("생성 시간이 길어지고 있어요. 잠시 후 같은 링크에서 다시 확인해 주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "결과를 불러오지 못했어요.");
      setState("failed");
    }
  }, [accountSource, paymentId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load, retryKey]);

  const view = useMemo(() => {
    if (!order || !report) return null;
    const names = Object.fromEntries(order.inputSnapshot.candidates.map((candidate, index) => [`candidate_${index + 1}`, candidate.displayName]));
    return buildOneToManyResultView(report.snapshot, names, report.narrative);
  }, [order, report]);

  if (state === "ready" && view && order) return <OneToManyResult view={view} />;

  return <main className="one-to-many-result-page"><div className="comparison-empty-state">
    <p className="eyebrow">1:다 비교 결과</p>
    <h1>{state === "generating" ? "리포트를 만들고 있어요" : state === "missing" ? "복구 정보가 필요해요" : state === "failed" ? "결과를 다시 확인해 주세요" : "결과를 확인하고 있어요"}</h1>
    <p>{state === "missing" ? "결제 후 받은 결과 링크를 같은 브라우저에서 다시 열어 주세요." : message}</p>
    {state === "failed" && accountSource ? <Link className="primary-link" href={`/login?${new URLSearchParams({ returnTo: `/one-to-many/result?paymentId=${paymentId ?? ""}&source=account` }).toString()}`}>카카오 로그인 다시 하기</Link> : null}
    {state === "failed" && !accountSource ? <button type="button" className="primary-action" onClick={() => setRetryKey((value) => value + 1)}>같은 결제로 다시 확인하기</button> : null}
    {state === "missing" ? <Link href="/one-to-many" className="primary-link">비교 입력으로 돌아가기</Link> : null}
  </div></main>;
}
