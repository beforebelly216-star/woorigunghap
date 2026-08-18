import { after, NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { findAccountReportOwnerUserId } from "@/lib/account-report-store";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { buildPaidReportFacts } from "@/lib/narrative/report-engine-v5";
import {
  PAID_REPORT_SEGMENTS,
  generatePaidReportSegmentV7,
  type PaidReportSegmentName,
} from "@/lib/narrative/report-engine-v7";
import { personalizeNarrativeNames } from "@/lib/narrative/name-personalization";
import { notifyReportCompleted } from "@/lib/report-completion-notification";
import {
  claimReportSegmentGeneration,
  completeReportSegmentGeneration,
  releaseReportSegmentGeneration,
} from "@/lib/report-generation-lock";
import {
  loadServerReportProgress,
  saveServerReportPrepared,
  saveServerReportSegment,
  type StoredOrderDraft,
} from "@/lib/server-report-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

function parseStoredOrder(raw: unknown, paymentId: string): StoredOrderDraft | null {
  if (typeof raw !== "string") return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredOrderDraft>;
    if (
      value.version !== "order-draft-v1"
      || value.paymentId !== paymentId
      || value.product !== "oneToOne"
      || !value.inputSnapshot
    ) return null;
    return value as StoredOrderDraft;
  } catch {
    return null;
  }
}

async function loadPaidOneToOneOrder(paymentId: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  const sql = neon(connectionString);
  const rows = await sql`
    SELECT order_json
    FROM woorigunghap_order_records
    WHERE payment_id = ${paymentId}
      AND payment_status = 'paid'
    LIMIT 1
  `;
  return parseStoredOrder(rows[0]?.order_json, paymentId);
}

function completedCount(progress: Awaited<ReturnType<typeof loadServerReportProgress>>) {
  return PAID_REPORT_SEGMENTS.filter((segment) => Boolean(progress?.segments[segment])).length;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: privateHeaders });
  }

  const { paymentId } = await params;
  if (!paymentId || paymentId.length > 160) {
    return NextResponse.json({ error: "결과 식별자가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }

  const ownerUserId = await findAccountReportOwnerUserId(paymentId).catch(() => null);
  if (ownerUserId !== user.userId) {
    return NextResponse.json({ error: "이 결과를 이어서 만들 권한이 없습니다." }, { status: 403, headers: privateHeaders });
  }

  const order = await loadPaidOneToOneOrder(paymentId).catch(() => null);
  if (!order || order.product !== "oneToOne") {
    return NextResponse.json({ error: "이어 만들 수 있는 1:1 주문을 찾지 못했습니다." }, { status: 404, headers: privateHeaders });
  }

  let claimedSegment: PaidReportSegmentName | null = null;
  try {
    let progress = await loadServerReportProgress(paymentId);
    const snapshot = progress?.snapshot ?? calculateOneToOneCompatibility(order.inputSnapshot);
    const facts = progress?.facts ?? buildPaidReportFacts(order.inputSnapshot);

    if (!progress?.snapshot || !progress.facts) {
      const prepared = await saveServerReportPrepared(paymentId, snapshot, facts);
      if (!prepared) throw new Error("RESUME_PREPARE_SAVE_FAILED");
      progress = await loadServerReportProgress(paymentId);
    }

    const nextSegment = PAID_REPORT_SEGMENTS.find((segment) => !progress?.segments[segment]) ?? null;
    if (!nextSegment) {
      after(() => notifyReportCompleted(paymentId));
      return NextResponse.json({ status: "ready", completedSegments: 3 }, { headers: privateHeaders });
    }

    if (!await claimReportSegmentGeneration(paymentId, nextSegment)) {
      return NextResponse.json(
        { status: "generating", completedSegments: completedCount(progress), retryable: true },
        { status: 202, headers: privateHeaders },
      );
    }
    claimedSegment = nextSegment;

    const generated = await generatePaidReportSegmentV7(snapshot, order.inputSnapshot, nextSegment);
    const personalizedContent = personalizeNarrativeNames(generated.content, {
      self: order.inputSnapshot.personA.displayName,
      partner: order.inputSnapshot.personB.displayName,
    });
    const persisted = await saveServerReportSegment(
      paymentId,
      nextSegment,
      personalizedContent,
      generated.meta,
    );
    if (!persisted) throw new Error("RESUME_SEGMENT_SAVE_FAILED");
    await completeReportSegmentGeneration(paymentId, nextSegment);
    claimedSegment = null;

    const nextCompletedCount = PAID_REPORT_SEGMENTS.indexOf(nextSegment) + 1;
    const ready = nextSegment === "action";
    if (ready) after(() => notifyReportCompleted(paymentId));
    return NextResponse.json(
      { status: ready ? "ready" : "generating", completedSegments: nextCompletedCount },
      { headers: privateHeaders },
    );
  } catch (error) {
    if (claimedSegment) {
      await releaseReportSegmentGeneration(paymentId, claimedSegment).catch(() => false);
    }
    console.error("[woorigunghap:account-report-resume]", error);
    return NextResponse.json(
      {
        error: "결과 생성이 지연되고 있습니다. 잠시 후 보관함에서 다시 이어서 만들 수 있습니다.",
        retryable: true,
      },
      { status: 503, headers: privateHeaders },
    );
  }
}
