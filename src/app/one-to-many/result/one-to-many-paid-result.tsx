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

function tokenFromHash() {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("accessToken");
  return isResultAccessToken(token) ? token : null;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function OneToManyPaidResult() {
  const paymentId = useSearchParams().get("paymentId");
  const [order, setOrder] = useState<OneToManyOrderDraft | null>(null);
  const [report, setReport] = useState<StoredReport | null>(null);
  const [state, setState] = useState<ResultState>("loading");
  const [message, setMessage] = useState("결제와 저장 결과를 확인하고 있어요.");
  const [retryKey, setRetryKey] = useState(0);

  const load = useCallback(async () => {
    if (!paymentId) {
      setState("missing");
      return;
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
  }, [paymentId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load, retryKey]);

  const view = useMemo(() => {
    if (!order || !report) return null;
    const names = Object.fromEntries(order.inputSnapshot.candidates.map((candidate, index) => [`candidate_${index + 1}`, candidate.displayName]));
    return buildOneToManyResultView(report.snapshot, names, report.narrative);
  }, [order, report]);

  if (state === "ready" && view) return <OneToManyResult view={view} />;

  return <main className="comparison-report-page"><div className="comparison-empty-state">
    <p className="eyebrow">1:다 비교 결과</p>
    <h1>{state === "generating" ? "리포트를 만들고 있어요" : state === "missing" ? "복구 정보가 필요해요" : state === "failed" ? "결과를 다시 확인해 주세요" : "결과를 확인하고 있어요"}</h1>
    <p>{state === "missing" ? "결제 후 받은 결과 링크를 같은 브라우저에서 다시 열어 주세요." : message}</p>
    {state === "failed" ? <button type="button" className="primary-action" onClick={() => setRetryKey((value) => value + 1)}>같은 결제로 다시 확인하기</button> : null}
    {state === "missing" ? <Link href="/one-to-many" className="primary-link">비교 입력으로 돌아가기</Link> : null}
  </div></main>;
}
