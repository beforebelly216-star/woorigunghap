from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if new in source:
        return
    if old not in source:
        raise RuntimeError(f"missing replacement target in {path}: {old[:180]!r}")
    write(path, source.replace(old, new, 1))


def append_once(path: str, marker: str, block: str) -> None:
    source = read(path)
    if marker in source:
        return
    write(path, source.rstrip() + "\n\n" + block.strip() + "\n")


# Public score calibration: deterministic evidence/rawTotal stays unchanged.
replace_once(
    "src/lib/compatibility/engine.ts",
    'import { calculateThreeYearTimingAlignment, type ThreeYearTimingAssessment } from "./timing-alignment";\n',
    'import { calculateThreeYearTimingAlignment, type ThreeYearTimingAssessment } from "./timing-alignment";\nimport { calibrateCompatibilityScore } from "./score-scale";\n',
)
replace_once(
    "src/lib/compatibility/engine.ts",
    'export const COMPATIBILITY_ENGINE_VERSION = "compatibility-engine-v1.3.0";',
    'export const COMPATIBILITY_ENGINE_VERSION = "compatibility-engine-v1.4.0";',
)
replace_once(
    "src/lib/compatibility/engine.ts",
    '  const score = Math.round(rawTotal);',
    '  const score = calibrateCompatibilityScore(rawTotal);',
)
replace_once(
    "src/lib/compatibility/engine.ts",
    '''  const min = Math.round(Math.min(...scenarioResults.map(
    (scenario) => clamp(scenario.rawTotal + timingMinDelta, 30, 100),
  )));
  const max = Math.round(Math.max(...scenarioResults.map(
    (scenario) => clamp(scenario.rawTotal + timingMaxDelta, 30, 100),
  )));
  const width = max - min;''',
    '''  const rawMin = Math.min(...scenarioResults.map(
    (scenario) => clamp(scenario.rawTotal + timingMinDelta, 30, 100),
  ));
  const rawMax = Math.max(...scenarioResults.map(
    (scenario) => clamp(scenario.rawTotal + timingMaxDelta, 30, 100),
  ));
  const min = calibrateCompatibilityScore(rawMin);
  const max = calibrateCompatibilityScore(rawMax);
  const width = max - min;''',
)
replace_once(
    "src/lib/compatibility/weights.ts",
    'export const COMPATIBILITY_SCORING_VERSION = "1.3.0";',
    'export const COMPATIBILITY_SCORING_VERSION = "1.4.0";',
)

# Existing stored 1:N results: re-present overall totals with the new public scale, no AI regeneration.
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    'import type { CompatibilityDimension, CompatibilityProfile } from "./types";\n',
    'import type { CompatibilityDimension, CompatibilityProfile } from "./types";\nimport { calibrateCompatibilityScore } from "./score-scale";\nimport { COMPATIBILITY_SCORING_VERSION } from "./weights";\n',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '''function roundScore(value: number) {
  return Math.round(value);
}
''',
    '''function roundScore(value: number) {
  return Math.round(value);
}

function publicCandidateScore(candidate: OneToManyCalculationSnapshot["candidates"][number]) {
  return calibrateCompatibilityScore(candidate.calculationSnapshot.rawTotal);
}

function publicCandidateRange(candidate: OneToManyCalculationSnapshot["candidates"][number]) {
  if (candidate.calculationSnapshot.scoringVersion === COMPATIBILITY_SCORING_VERSION) {
    return candidate.uncertaintyRange;
  }
  const min = calibrateCompatibilityScore(candidate.uncertaintyRange.min);
  const max = calibrateCompatibilityScore(candidate.uncertaintyRange.max);
  return { min, max, width: max - min };
}
''',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '      overall: candidate.score,',
    '      overall: publicCandidateScore(candidate),',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '''  const secondGroup = snapshot.ranking.groups[1];
  const closenessNotice = secondGroup?.gapFromPreviousGroup?.band === "SLIGHT_EDGE"
    ? `다음 순위와 ${secondGroup.gapFromPreviousGroup.points}점 차이예요. 근소한 차이는 실제 관계의 절대적인 우열을 뜻하지 않아요.`''',
    '''  const secondGroup = snapshot.ranking.groups[1];
  const leaderDisplayScore = publicCandidateScore(snapshot.candidates[0]);
  const secondDisplayScore = secondGroup?.candidateIds[0]
    ? publicCandidateScore(candidateById(snapshot, secondGroup.candidateIds[0]))
    : null;
  const displayGapToSecond = secondDisplayScore === null ? null : leaderDisplayScore - secondDisplayScore;
  const closenessNotice = displayGapToSecond !== null && displayGapToSecond <= 5
    ? `다음 순위와 ${displayGapToSecond}점 차이예요. 근소한 차이는 실제 관계의 절대적인 우열을 뜻하지 않아요.`''',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '''    rankings: snapshot.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      displayName: displayNameFor(candidate.candidateId, names),
      rank: candidate.rank,
      score: candidate.score,
      scoreGap: candidate.comparisonToLeader.scoreGap,
      gapLabel: gapLabel(candidate.comparisonToLeader.scoreGap, candidate.rank),
      uncertaintyRange: candidate.uncertaintyRange,
      confidenceLabel: candidate.uncertaintyRange.width === 0
        ? "입력 시간 기준"
        : `가능 범위 ${candidate.uncertaintyRange.min}~${candidate.uncertaintyRange.max}점`,
    })),''',
    '''    rankings: snapshot.candidates.map((candidate) => {
      const score = publicCandidateScore(candidate);
      const scoreGap = leaderDisplayScore - score;
      const uncertaintyRange = publicCandidateRange(candidate);
      return {
        candidateId: candidate.candidateId,
        displayName: displayNameFor(candidate.candidateId, names),
        rank: candidate.rank,
        score,
        scoreGap,
        gapLabel: gapLabel(scoreGap, candidate.rank),
        uncertaintyRange,
        confidenceLabel: uncertaintyRange.width === 0
          ? "입력 시간 기준"
          : `가능 범위 ${uncertaintyRange.min}~${uncertaintyRange.max}점`,
      };
    }),''',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '        score: candidate.score,\n        insightTitle:',
    '        score: publicCandidateScore(candidate),\n        insightTitle:',
)

# 1:1 result: retroactively present saved snapshots on the same public scale and explain the band.
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    'import { DayPillarCharacterCard } from "./day-pillar-character-card";\n',
    'import { DayPillarCharacterCard } from "./day-pillar-character-card";\nimport { calibrateCompatibilityScore, COMPATIBILITY_SCORE_BANDS, getCompatibilityScoreBand } from "@/lib/compatibility/score-scale";\nimport { COMPATIBILITY_SCORING_VERSION } from "@/lib/compatibility/weights";\n',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '''  const shareArchetype = buildCompatibilityShareArchetype(snapshot);
  const personACharacter = getDayPillarCharacter(facts.A.pillars.day.korean);
  const personBCharacter = getDayPillarCharacter(facts.B.pillars.day.korean);
  const displayContent = normalizeStoredPaidReportForDisplay(content, facts);''',
    '''  const publicScore = calibrateCompatibilityScore(snapshot.rawTotal);
  const scoreBand = getCompatibilityScoreBand(publicScore);
  const publicUncertaintyRange = snapshot.scoringVersion === COMPATIBILITY_SCORING_VERSION
    ? snapshot.uncertaintyRange
    : (() => {
        const min = calibrateCompatibilityScore(snapshot.uncertaintyRange.min);
        const max = calibrateCompatibilityScore(snapshot.uncertaintyRange.max);
        return { min, max, width: max - min };
      })();
  const displaySnapshot = snapshot.score === publicScore && snapshot.uncertaintyRange.min === publicUncertaintyRange.min
    ? snapshot
    : { ...snapshot, score: publicScore, uncertaintyRange: publicUncertaintyRange };
  const shareArchetype = buildCompatibilityShareArchetype(displaySnapshot);
  const personACharacter = getDayPillarCharacter(facts.A.pillars.day.korean);
  const personBCharacter = getDayPillarCharacter(facts.B.pillars.day.korean);
  const displayContent = normalizeStoredPaidReportForDisplay(content, facts);''',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '''      <div className="v2-score-gauge" style={{ "--score": snapshot.score } as React.CSSProperties}>
        <div><span>{gradeFor(snapshot.score)}</span><strong>{snapshot.score}</strong><small>/ 100</small></div>
      </div>
      {(!personA.birthTimeKnown || !personB.birthTimeKnown) && <p className="v2-uncertainty">출생시간 미상 시나리오 {snapshot.scenarioPolicy.pairScenarios.toLocaleString("ko-KR")}개를 함께 비교했어요. 현재 입력 기준 점수 범위는 {snapshot.uncertaintyRange.min}~{snapshot.uncertaintyRange.max}점입니다.</p>}''',
    '''      <div className="v2-score-gauge" style={{ "--score": publicScore } as React.CSSProperties}>
        <div><span>{gradeFor(publicScore)}</span><strong>{publicScore}</strong><small>/ 100</small></div>
      </div>
      <div className="v2-score-meaning" role="note">
        <small>이 점수는 어느 정도?</small>
        <strong>{scoreBand.label}</strong>
        <p>{scoreBand.description}</p>
        <details>
          <summary>전체 점수 기준 보기</summary>
          <div className="v2-score-band-grid">{COMPATIBILITY_SCORE_BANDS.map((band) => <span key={band.min}><b>{band.min}~{band.max}</b>{band.shortLabel}</span>)}</div>
        </details>
      </div>
      {(!personA.birthTimeKnown || !personB.birthTimeKnown) && <p className="v2-uncertainty">출생시간 미상 시나리오 {snapshot.scenarioPolicy.pairScenarios.toLocaleString("ko-KR")}개를 함께 비교했어요. 현재 입력 기준 점수 범위는 {publicUncertaintyRange.min}~{publicUncertaintyRange.max}점입니다.</p>}''',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '      score={snapshot.score}',
    '      score={publicScore}',
)

# 1:N UI: show a qualitative label beside every overall score.
replace_once(
    "src/components/one-to-many-result.tsx",
    'import type { OneToManyResultView } from "@/lib/compatibility/one-to-many-view";\n',
    'import type { OneToManyResultView } from "@/lib/compatibility/one-to-many-view";\nimport { getCompatibilityScoreBand } from "@/lib/compatibility/score-scale";\n',
)
replace_once(
    "src/components/one-to-many-result.tsx",
    '<p>0~2점 차이는 공동 수준으로 보고, 점수 범위가 겹치면 확정적인 우열 표현을 피했어요.</p>',
    '<p>종합점수는 관계의 차이를 더 직관적으로 느낄 수 있도록 45~100점 구간으로 보정해 보여드려요. 0~2점 차이는 공동 수준으로 보고, 점수 범위가 겹치면 확정적인 우열 표현을 피했어요.</p>',
)
replace_once(
    "src/components/one-to-many-result.tsx",
    '''                <div className="ranking-score">
                  <span>{candidate.score}</span>
                  <small>점</small>
                </div>
                <p>{candidate.confidenceLabel}</p>''',
    '''                <div className="ranking-score">
                  <span>{candidate.score}</span>
                  <small>점</small>
                </div>
                <small className="ranking-score-level">{getCompatibilityScoreBand(candidate.score).label}</small>
                <p>{candidate.confidenceLabel}</p>''',
)

# Individual report delete. API is limited to completed owned reports so no in-flight generation can be deleted.
replace_once(
    "src/lib/account-report-store.ts",
    'export async function deleteAccountAndScrubReports(userId: string) {',
    '''export async function deleteOwnedAccountReport(userId: string, paymentId: string) {
  if (!await ensureAccountReportSchema()) throw new Error("account_report_store_unavailable");
  const sql = getQuery();
  if (!sql) throw new Error("account_report_store_unavailable");

  const rows = await sql`
    WITH owned AS (
      SELECT payment_id
      FROM woorigunghap_account_reports
      WHERE user_id = ${userId}
        AND payment_id = ${paymentId}
    ), scrubbed AS (
      UPDATE woorigunghap_order_records records
      SET order_json = jsonb_build_object(
            'version', 'legal-retention-v1',
            'paymentId', records.payment_id,
            'orderId', COALESCE(records.order_json::jsonb ->> 'orderId', ''),
            'product', COALESCE(records.order_json::jsonb ->> 'product', ''),
            'amount', COALESCE((records.order_json::jsonb ->> 'amount')::int, 0),
            'status', records.payment_status,
            'createdAt', records.created_at,
            'retainedFor', 'electronic-commerce-record'
          )::text,
          report_json = NULL,
          access_token_hash = NULL,
          generation_status = 'deleted',
          generation_started_at = NULL,
          updated_at = NOW()
      WHERE records.payment_id IN (SELECT payment_id FROM owned)
      RETURNING records.payment_id
    ), deleted AS (
      DELETE FROM woorigunghap_account_reports account
      WHERE account.user_id = ${userId}
        AND account.payment_id IN (SELECT payment_id FROM scrubbed)
      RETURNING account.payment_id
    )
    SELECT payment_id FROM deleted
  `;
  return rows.length > 0;
}

export async function deleteAccountAndScrubReports(userId: string) {''',
)
replace_once(
    "src/app/api/account/reports/[paymentId]/route.ts",
    'import { loadOwnedAccountReport } from "@/lib/account-report-store";\n',
    'import { deleteOwnedAccountReport, loadOwnedAccountReport } from "@/lib/account-report-store";\nimport { isSameOriginPost } from "@/lib/auth-policy";\n',
)
append_once(
    "src/app/api/account/reports/[paymentId]/route.ts",
    "export async function DELETE(",
    r'''export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  if (!isSameOriginPost(request)) {
    return NextResponse.json({ error: "안전하지 않은 요청입니다." }, { status: 403, headers: privateHeaders });
  }
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: privateHeaders });
  }
  const { paymentId } = await params;
  if (!paymentId || paymentId.length > 160) {
    return NextResponse.json({ error: "결과 식별자가 올바르지 않습니다." }, { status: 400, headers: privateHeaders });
  }
  try {
    const completed = await loadOwnedAccountReport(user.userId, paymentId);
    if (!completed) {
      return NextResponse.json({ error: "완성된 보관함 결과를 찾지 못했습니다." }, { status: 404, headers: privateHeaders });
    }
    const deleted = await deleteOwnedAccountReport(user.userId, paymentId);
    if (!deleted) {
      return NextResponse.json({ error: "삭제할 보관함 결과를 찾지 못했습니다." }, { status: 404, headers: privateHeaders });
    }
    return NextResponse.json({ deleted: true }, { headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:account-report-delete]", error);
    return NextResponse.json({ error: "보관함 결과를 삭제하지 못했습니다." }, { status: 503, headers: privateHeaders });
  }
}''',
)

# Browser-side recovery copies must be cleared so a deleted paid report cannot linger locally.
replace_once(
    "src/lib/order-storage.ts",
    '''function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
''',
    '''function safeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Browser storage cleanup is best effort.
  }
}
''',
)
append_once(
    "src/lib/order-storage.ts",
    "export function removeOrderDraft(",
    r'''export function removeOrderDraft(paymentId: string) {
  if (typeof window === "undefined") return;
  const key = storageKey(paymentId);
  safeRemove(window.sessionStorage, key);
  safeRemove(window.localStorage, key);
}''',
)
append_once(
    "src/lib/report-progress-storage.ts",
    "export function removeReportProgress(",
    r'''export function removeReportProgress(paymentId: string, orderCreatedAt: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key(paymentId, orderCreatedAt));
  } catch {
    // Server deletion remains authoritative even if local cleanup is blocked.
  }
}''',
)

replace_once(
    "src/app/account/reports/page.tsx",
    'import { loadOrderDraft } from "@/lib/order-storage";\n',
    'import { loadOrderDraft, removeOrderDraft } from "@/lib/order-storage";\nimport { removeReportProgress } from "@/lib/report-progress-storage";\n',
)
replace_once(
    "src/app/account/reports/page.tsx",
    '  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);\n',
    '  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);\n  const [deleteBusyPaymentId, setDeleteBusyPaymentId] = useState<string | null>(null);\n  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);\n',
)
replace_once(
    "src/app/account/reports/page.tsx",
    '  async function disableChannelNotification() {',
    '''  async function deleteReport(report: ReportSummary) {
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

  async function disableChannelNotification() {''',
)
replace_once(
    "src/app/account/reports/page.tsx",
    '''        {state.status === "ready" && state.reports.length > 0 ? <ul className="library-grid">
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
        </ul> : null}''',
    '''        {state.status === "ready" && deleteMessage ? <p className="library-delete-feedback" role="status">{deleteMessage}</p> : null}
        {state.status === "ready" && state.reports.length > 0 ? <ul className="library-grid">
          {state.reports.map((report) => <li key={report.paymentId}>
            {report.status === "ready" ? <article className="library-card-shell">
              <Link className="library-card" href={reportHref(report)}>
                <span>{report.productLabel} · {report.relationshipLabel}</span>
                <strong>{report.title}</strong>
                <small>{formatDate(report.createdAt)} 구매</small>
                <b>저장된 결과 열기</b>
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
              <p>결과를 만들고 있어요. 같은 브라우저의 복구키가 있으면 멈춘 생성도 자동으로 다시 이어갑니다.</p>
            </article>}
          </li>)}
        </ul> : null}''',
)

# Dedicated styles, loaded after existing global/report layers.
score_library_css = r'''/* Public score interpretation + account library deletion. */
.v2-page .v2-score-meaning {
  width: min(100%, 620px);
  margin: 18px auto 0;
  border: 1px solid var(--saju-border);
  border-radius: 20px;
  padding: 18px 20px;
  background: color-mix(in srgb, var(--saju-primary) 10%, var(--saju-bg-card));
  color: var(--saju-ink);
  text-align: left;
}
.v2-page .v2-score-meaning > small { color: var(--saju-primary-deep); font-weight: 800; }
.v2-page .v2-score-meaning > strong { display: block; margin-top: 6px; font-size: 1.12rem; }
.v2-page .v2-score-meaning > p { margin: 6px 0 0; color: var(--saju-ink-soft); line-height: 1.65; }
.v2-page .v2-score-meaning details { margin-top: 12px; }
.v2-page .v2-score-meaning summary { cursor: pointer; color: var(--saju-primary-deep); font-size: .84rem; font-weight: 800; }
.v2-page .v2-score-band-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
.v2-page .v2-score-band-grid span { display: flex; gap: 7px; align-items: baseline; border-radius: 12px; padding: 9px 10px; background: var(--saju-bg-card); color: var(--saju-ink-soft); font-size: .78rem; }
.v2-page .v2-score-band-grid b { color: var(--saju-ink); }
.ranking-score-level { display: block; margin-top: -4px; color: #756780; font-size: .74rem; font-weight: 800; }
.library-card-shell { position: relative; height: 100%; }
.library-card-shell .library-card { height: 100%; padding-bottom: 64px; }
.library-delete-button { position: absolute; right: 18px; bottom: 16px; z-index: 2; border: 1px solid #e3c9c4; border-radius: 10px; padding: 8px 11px; background: #fff8f6; color: #9b4f45; cursor: pointer; font-size: .78rem; font-weight: 800; }
.library-delete-button:hover { background: #fceeea; }
.library-delete-button:disabled { cursor: wait; opacity: .55; }
.library-delete-feedback { margin: 18px 0 -18px; color: #6d625a; font-size: .88rem; }
@media (max-width: 520px) { .v2-page .v2-score-band-grid { grid-template-columns: 1fr; } }
'''
write("src/app/score-library.css", score_library_css)
replace_once(
    "src/app/layout.tsx",
    'import "./day22-policy.css";\n',
    'import "./day22-policy.css";\nimport "./score-library.css";\n',
)

# Regression contracts.
replace_once(
    "scripts/compatibility-engine-test.ts",
    'import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";\n',
    'import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";\nimport { calibrateCompatibilityScore, getCompatibilityScoreBand } from "../src/lib/compatibility/score-scale";\n',
)
replace_once(
    "scripts/compatibility-engine-test.ts",
    'assert.ok(first.score >= 30 && first.score <= 100);',
    'assert.ok(first.score >= 45 && first.score <= 100);\nassert.equal(first.score, calibrateCompatibilityScore(first.rawTotal));\nassert.equal(calibrateCompatibilityScore(30), 45);\nassert.equal(calibrateCompatibilityScore(100), 100);\nassert.ok(calibrateCompatibilityScore(74) > 74, "public score calibration should raise the absolute score for entertainment value");\nassert.ok(getCompatibilityScoreBand(first.score).label.length > 0);',
)
replace_once(
    "scripts/compatibility-engine-test.ts",
    'assert.ok(bothUnknown.score >= 30 && bothUnknown.score <= 100);',
    'assert.ok(bothUnknown.score >= 45 && bothUnknown.score <= 100);',
)
replace_once(
    "scripts/day18-account-report-library-contract-test.ts",
    'const oneToMany = readFileSync("src/app/one-to-many/result/one-to-many-paid-result.tsx", "utf8");\n',
    'const oneToMany = readFileSync("src/app/one-to-many/result/one-to-many-paid-result.tsx", "utf8");\nconst orderStorage = readFileSync("src/lib/order-storage.ts", "utf8");\nconst progressStorage = readFileSync("src/lib/report-progress-storage.ts", "utf8");\n',
)
replace_once(
    "scripts/day18-account-report-library-contract-test.ts",
    'assert.match(accountStore, /access_token_hash = NULL/);',
    'assert.match(accountStore, /access_token_hash = NULL/);\nassert.match(accountStore, /export async function deleteOwnedAccountReport/);\nassert.match(accountStore, /generation_status = \'deleted\'/);\nassert.match(accountStore, /retainedFor[\\s\\S]*electronic-commerce-record/);',
)
replace_once(
    "scripts/day18-account-report-library-contract-test.ts",
    'assert.doesNotMatch(detailRoute, /accessToken|generateOneToManyNarrative|generatePaidReport/);',
    'assert.doesNotMatch(detailRoute, /accessToken|generateOneToManyNarrative|generatePaidReport/);\nassert.match(detailRoute, /export async function DELETE/);\nassert.match(detailRoute, /isSameOriginPost\\(request\\)/);\nassert.match(detailRoute, /loadOwnedAccountReport\\(user\\.userId, paymentId\\)/);\nassert.match(detailRoute, /deleteOwnedAccountReport\\(user\\.userId, paymentId\\)/);',
)
replace_once(
    "scripts/day18-account-report-library-contract-test.ts",
    'assert.match(libraryPage, />생성중</);',
    'assert.match(libraryPage, />생성중</);\nassert.match(libraryPage, /결과 삭제/);\nassert.match(libraryPage, /method: "DELETE"/);\nassert.match(libraryPage, /removeOrderDraft\\(report\\.paymentId\\)/);\nassert.match(libraryPage, /removeReportProgress\\(report\\.paymentId, report\\.createdAt\\)/);\nassert.match(orderStorage, /export function removeOrderDraft/);\nassert.match(progressStorage, /export function removeReportProgress/);',
)
