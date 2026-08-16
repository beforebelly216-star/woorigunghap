import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";
import type { PaidReportFacts } from "@/lib/narrative/report-engine-v5";
import type {
  ActionSegment,
  DynamicsSegment,
  IntroSegment,
  PaidReportSegmentMeta,
} from "@/lib/narrative/report-engine-v7";

export const REPORT_PROGRESS_VERSION = "report-progress-v7-1" as const;
const PREFIX = "woorigunghap:report-progress:v3:";

export type ReportProgress = {
  version: typeof REPORT_PROGRESS_VERSION;
  paymentId: string;
  orderCreatedAt: string;
  snapshot: CompatibilityCalculationSnapshot | null;
  facts: PaidReportFacts | null;
  segments: {
    intro?: IntroSegment;
    dynamics?: DynamicsSegment;
    action?: ActionSegment;
  };
  metas: {
    intro?: PaidReportSegmentMeta;
    dynamics?: PaidReportSegmentMeta;
    action?: PaidReportSegmentMeta;
  };
  updatedAt: string;
};

function key(paymentId: string, orderCreatedAt: string) {
  return `${PREFIX}${paymentId}:${orderCreatedAt}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function emptyReportProgress(paymentId: string, orderCreatedAt: string): ReportProgress {
  return {
    version: REPORT_PROGRESS_VERSION,
    paymentId,
    orderCreatedAt,
    snapshot: null,
    facts: null,
    segments: {},
    metas: {},
    updatedAt: new Date().toISOString(),
  };
}

export function loadReportProgress(paymentId: string, orderCreatedAt: string): ReportProgress | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key(paymentId, orderCreatedAt));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReportProgress>;
    if (
      parsed.version !== REPORT_PROGRESS_VERSION
      || parsed.paymentId !== paymentId
      || parsed.orderCreatedAt !== orderCreatedAt
      || !parsed.segments
      || !parsed.metas
    ) {
      return null;
    }
    return parsed as ReportProgress;
  } catch {
    return null;
  }
}

export function saveReportProgress(progress: ReportProgress) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      key(progress.paymentId, progress.orderCreatedAt),
      JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // Report generation must continue even if browser storage is unavailable.
  }
}
