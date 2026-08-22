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
        raise RuntimeError(f"missing target in {path}: {old[:160]!r}")
    write(path, source.replace(old, new, 1))


def append_once(path: str, marker: str, block: str) -> None:
    source = read(path)
    if marker in source:
        return
    write(path, source.rstrip() + "\n\n" + block.strip() + "\n")


score_scale = r'''export const PUBLIC_COMPATIBILITY_SCORE_FLOOR = 45;
export const PUBLIC_COMPATIBILITY_SCORE_CEILING = 100;
export const PUBLIC_COMPATIBILITY_RAW_FLOOR = 30;

export type CompatibilityScoreBand = {
  min: number;
  max: number;
  label: string;
  shortLabel: string;
  description: string;
};

export const COMPATIBILITY_SCORE_BANDS: readonly CompatibilityScoreBand[] = [
  { min: 95, max: 100, label: "최상급 궁합", shortLabel: "최상급", description: "핵심 궁합 지표 대부분이 강하게 맞는 조합이에요. 서로의 차이보다 잘 맞는 힘이 훨씬 크게 보입니다." },
  { min: 90, max: 94, label: "아주 잘 맞는 궁합", shortLabel: "아주 잘 맞음", description: "전반적으로 조화가 매우 좋은 편이에요. 몇 가지 차이가 있어도 관계의 강점이 뚜렷합니다." },
  { min: 85, max: 89, label: "상당히 잘 맞는 궁합", shortLabel: "상당히 잘 맞음", description: "여러 핵심 지표에서 강점이 겹쳐요. 실제 관계에서도 편한 장면을 만들기 쉬운 편입니다." },
  { min: 80, max: 84, label: "잘 맞는 궁합", shortLabel: "잘 맞는 편", description: "전체적으로 잘 맞는 편이에요. 약한 지점 몇 가지만 조율하면 장점이 더 선명해집니다." },
  { min: 75, max: 79, label: "좋은 궁합", shortLabel: "좋은 편", description: "강점이 분명한 좋은 조합이에요. 서로 다른 리듬은 대화로 맞춰갈 여지가 있습니다." },
  { min: 70, max: 74, label: "무난하게 잘 맞는 궁합", shortLabel: "무난하게 잘 맞음", description: "잘 맞는 부분과 다른 부분이 함께 보여요. 관계의 기본 체력은 무난한 편입니다." },
  { min: 65, max: 69, label: "조율하면 좋아지는 궁합", shortLabel: "조율하면 좋음", description: "차이가 조금 더 눈에 띄지만, 서로의 방식을 알면 충분히 편해질 수 있는 구간이에요." },
  { min: 60, max: 64, label: "차이가 있는 궁합", shortLabel: "차이가 있음", description: "생활·표현·갈등 방식 중 몇 군데에서 조율이 필요해요. 맞추는 방식이 중요합니다." },
  { min: 55, max: 59, label: "조율이 많이 필요한 궁합", shortLabel: "조율 필요", description: "서로 다른 지점이 꽤 보여요. 잘 맞는 한두 가지 강점을 중심으로 관계 기준을 세우는 게 좋습니다." },
  { min: 45, max: 54, label: "서로 다른 점이 큰 궁합", shortLabel: "차이가 큰 편", description: "기본 리듬의 차이가 큰 편이에요. 나쁜 관계라는 뜻은 아니지만, 실제 대화와 행동으로 맞춰야 할 부분이 많습니다." },
] as const;

export function calibrateCompatibilityScore(rawScore: number) {
  if (!Number.isFinite(rawScore)) throw new RangeError("궁합 점수는 유한한 숫자여야 합니다.");
  const clamped = Math.min(PUBLIC_COMPATIBILITY_SCORE_CEILING, Math.max(PUBLIC_COMPATIBILITY_RAW_FLOOR, rawScore));
  const ratio = (clamped - PUBLIC_COMPATIBILITY_RAW_FLOOR)
    / (PUBLIC_COMPATIBILITY_SCORE_CEILING - PUBLIC_COMPATIBILITY_RAW_FLOOR);
  return Math.round(
    PUBLIC_COMPATIBILITY_SCORE_FLOOR
      + ratio * (PUBLIC_COMPATIBILITY_SCORE_CEILING - PUBLIC_COMPATIBILITY_SCORE_FLOOR),
  );
}

export function getCompatibilityScoreBand(score: number): CompatibilityScoreBand {
  const normalized = Math.min(PUBLIC_COMPATIBILITY_SCORE_CEILING, Math.max(PUBLIC_COMPATIBILITY_SCORE_FLOOR, Math.round(score)));
  return COMPATIBILITY_SCORE_BANDS.find((band) => normalized >= band.min && normalized <= band.max)
    ?? COMPATIBILITY_SCORE_BANDS[COMPATIBILITY_SCORE_BANDS.length - 1];
}
'''
write("src/lib/compatibility/score-scale.ts", score_scale)

# Engine: keep raw deterministic evidence, calibrate only public total/range.
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
    '''  const min = Math.round(Math.min(...scenarioResults.map(\n    (scenario) => clamp(scenario.rawTotal + timingMinDelta, 30, 100),\n  )));\n  const max = Math.round(Math.max(...scenarioResults.map(\n    (scenario) => clamp(scenario.rawTotal + timingMaxDelta, 30, 100),\n  )));\n  const width = max - min;''',
    '''  const rawMin = Math.min(...scenarioResults.map(\n    (scenario) => clamp(scenario.rawTotal + timingMinDelta, 30, 100),\n  ));\n  const rawMax = Math.max(...scenarioResults.map(\n    (scenario) => clamp(scenario.rawTotal + timingMaxDelta, 30, 100),\n  ));\n  const min = calibrateCompatibilityScore(rawMin);\n  const max = calibrateCompatibilityScore(rawMax);\n  const width = max - min;''',
)
replace_once(
    "src/lib/compatibility/weights.ts",
    'export const COMPATIBILITY_SCORING_VERSION = "1.3.0";',
    'export const COMPATIBILITY_SCORING_VERSION = "1.4.0";',
)

# 1:N display: recalibrate legacy stored totals too, without regenerating narrative/ranking order.
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    'import type { CompatibilityDimension, CompatibilityProfile } from "./types";\n',
    'import type { CompatibilityDimension, CompatibilityProfile } from "./types";\nimport { calibrateCompatibilityScore } from "./score-scale";\nimport { COMPATIBILITY_SCORING_VERSION } from "./weights";\n',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '''function roundScore(value: number) {\n  return Math.round(value);\n}\n''',
    '''function roundScore(value: number) {\n  return Math.round(value);\n}\n\nfunction publicCandidateScore(candidate: OneToManyCalculationSnapshot["candidates"][number]) {\n  return calibrateCompatibilityScore(candidate.calculationSnapshot.rawTotal);\n}\n\nfunction publicCandidateRange(candidate: OneToManyCalculationSnapshot["candidates"][number]) {\n  if (candidate.calculationSnapshot.scoringVersion === COMPATIBILITY_SCORING_VERSION) {\n    return candidate.uncertaintyRange;\n  }\n  const min = calibrateCompatibilityScore(candidate.uncertaintyRange.min);\n  const max = calibrateCompatibilityScore(candidate.uncertaintyRange.max);\n  return { min, max, width: max - min };\n}\n''',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '      overall: candidate.score,',
    '      overall: publicCandidateScore(candidate),',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '''  const secondGroup = snapshot.ranking.groups[1];\n  const closenessNotice = secondGroup?.gapFromPreviousGroup?.band === "SLIGHT_EDGE"\n    ? `다음 순위와 ${secondGroup.gapFromPreviousGroup.points}점 차이예요. 근소한 차이는 실제 관계의 절대적인 우열을 뜻하지 않아요.`''',
    '''  const secondGroup = snapshot.ranking.groups[1];\n  const leaderDisplayScore = publicCandidateScore(snapshot.candidates[0]);\n  const secondDisplayScore = secondGroup?.candidateIds[0]\n    ? publicCandidateScore(candidateById(snapshot, secondGroup.candidateIds[0]))\n    : null;\n  const displayGapToSecond = secondDisplayScore === null ? null : leaderDisplayScore - secondDisplayScore;\n  const closenessNotice = displayGapToSecond !== null && displayGapToSecond <= 5\n    ? `다음 순위와 ${displayGapToSecond}점 차이예요. 근소한 차이는 실제 관계의 절대적인 우열을 뜻하지 않아요.`''',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '''    rankings: snapshot.candidates.map((candidate) => ({\n      candidateId: candidate.candidateId,\n      displayName: displayNameFor(candidate.candidateId, names),\n      rank: candidate.rank,\n      score: candidate.score,\n      scoreGap: candidate.comparisonToLeader.scoreGap,\n      gapLabel: gapLabel(candidate.comparisonToLeader.scoreGap, candidate.rank),\n      uncertaintyRange: candidate.uncertaintyRange,\n      confidenceLabel: candidate.uncertaintyRange.width === 0\n        ? "입력 시간 기준"\n        : `가능 범위 ${candidate.uncertaintyRange.min}~${candidate.uncertaintyRange.max}점`,\n    })),''',
    '''    rankings: snapshot.candidates.map((candidate) => {\n      const score = publicCandidateScore(candidate);\n      const scoreGap = leaderDisplayScore - score;\n      const uncertaintyRange = publicCandidateRange(candidate);\n      return {\n        candidateId: candidate.candidateId,\n        displayName: displayNameFor(candidate.candidateId, names),\n        rank: candidate.rank,\n        score,\n        scoreGap,\n        gapLabel: gapLabel(scoreGap, candidate.rank),\n        uncertaintyRange,\n        confidenceLabel: uncertaintyRange.width === 0\n          ? "입력 시간 기준"\n          : `가능 범위 ${uncertaintyRange.min}~${uncertaintyRange.max}점`,\n      };\n    }),''',
)
replace_once(
    "src/lib/compatibility/one-to-many-view.ts",
    '        score: candidate.score,\n        insightTitle:',
    '        score: publicCandidateScore(candidate),\n        insightTitle:',
)

# Result UIs: explain what the public score means.
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    'import { DayPillarCharacterCard } from "./day-pillar-character-card";\n',
    'import { DayPillarCharacterCard } from "./day-pillar-character-card";\nimport { calibrateCompatibilityScore, COMPATIBILITY_SCORE_BANDS, getCompatibilityScoreBand } from "@/lib/compatibility/score-scale";\nimport { COMPATIBILITY_SCORING_VERSION } from "@/lib/compatibility/weights";\n',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '''  const personACharacter = getDayPillarCharacter(facts.A.pillars.day.korean);\n  const personBCharacter = getDayPillarCharacter(facts.B.pillars.day.korean);\n  const displayContent = normalizeStoredPaidReportForDisplay(content, facts);''',
    '''  const personACharacter = getDayPillarCharacter(facts.A.pillars.day.korean);\n  const personBCharacter = getDayPillarCharacter(facts.B.pillars.day.korean);\n  const displayContent = normalizeStoredPaidReportForDisplay(content, facts);\n  const publicScore = calibrateCompatibilityScore(snapshot.rawTotal);\n  const scoreBand = getCompatibilityScoreBand(publicScore);\n  const publicUncertaintyRange = snapshot.scoringVersion === COMPATIBILITY_SCORING_VERSION\n    ? snapshot.uncertaintyRange\n    : {\n        min: calibrateCompatibilityScore(snapshot.uncertaintyRange.min),\n        max: calibrateCompatibilityScore(snapshot.uncertaintyRange.max),\n        width: calibrateCompatibilityScore(snapshot.uncertaintyRange.max) - calibrateCompatibilityScore(snapshot.uncertaintyRange.min),\n      };\n  const displaySnapshot = snapshot.score === publicScore ? snapshot : { ...snapshot, score: publicScore, uncertaintyRange: publicUncertaintyRange };''',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '  const shareArchetype = buildCompatibilityShareArchetype(snapshot);',
    '  const shareArchetype = buildCompatibilityShareArchetype(displaySnapshot);',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '      score={snapshot.score}',
    '      score={publicScore}',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '      <div className="v2-score-gauge" style={{ "--score": snapshot.score } as React.CSSProperties}>\n        <div><span>{gradeFor(snapshot.score)}</span><strong>{snapshot.score}</strong><small>/ 100</small></div>\n      </div>\n      {(!personA.birthTimeKnown || !personB.birthTimeKnown) && <p className="v2-uncertainty">출생시간 미상 시나리오 {snapshot.scenarioPolicy.pairScenarios.toLocaleString("ko-KR")}개를 함께 비교했어요. 현재 입력 기준 점수 범위는 {snapshot.uncertaintyRange.min}~{snapshot.uncertaintyRange.max}점입니다.</p>}',
    '      <div className="v2-score-gauge" style={{ "--score": publicScore } as React.CSSProperties}>\n        <div><span>{gradeFor(publicScore)}</span><strong>{publicScore}</strong><small>/ 100</small></div>\n      </div>\n      <div className="v2-score-meaning" role="note">\n        <small>이 점수는 어느 정도?</small>\n        <strong>{scoreBand.label}</strong>\n        <p>{scoreBand.description}</p>\n        <details>\n          <summary>전체 점수 기준 보기</summary>\n          <div className="v2-score-band-grid">{COMPATIBILITY_SCORE_BANDS.map((band) => <span key={band.min}><b>{band.min}~{band.max}</b>{band.shortLabel}</span>)}</div>\n        </details>\n      </div>\n      {(!personA.birthTimeKnown || !personB.birthTimeKnown) && <p className="v2-uncertainty">출생시간 미상 시나리오 {snapshot.scenarioPolicy.pairScenarios.toLocaleString("ko-KR")}개를 함께 비교했어요. 현재 입력 기준 점수 범위는 {publicUncertaintyRange.min}~{publicUncertaintyRange.max}점입니다.</p>}',
)

replace_once(
    "src/components/one-to-many-result.tsx",
    'import type { OneToManyResultView } from "@/lib/compatibility/one-to-many-view";\n',
    'import type { OneToManyResultView } from "@/lib/compatibility/one-to-many-view";\nimport { getCompatibilityScoreBand } from "@/lib/compatibility/score-scale";\n',
)
replace_once(
    "src/components/one-to-many-result.tsx",
    '''                <div className="ranking-score">\n                  <span>{candidate.score}</span>\n                  <small>점</small>\n                </div>\n                <p>{candidate.confidenceLabel}</p>''',
    '''                <div className="ranking-score">\n                  <span>{candidate.score}</span>\n                  <small>점</small>\n                </div>\n                <small className="ranking-score-level">{getCompatibilityScoreBand(candidate.score).label}</small>\n                <p>{candidate.confidenceLabel}</p>''',
)
replace_once(
    "src/components/one-to-many-result.tsx",
    '<p>0~2점 차이는 공동 수준으로 보고, 점수 범위가 겹치면 확정적인 우열 표현을 피했어요.</p>',
    '<p>공개 종합점수는 재미와 직관성을 위해 45~100점 구간으로 보정해 보여드려요. 0~2점 차이는 공동 수준으로 보고, 점수 범위가 겹치면 확정적인 우열 표현을 피했어요.</p>',
)

# Individual report deletion: real data deletion with minimal legal transaction retention.
replace_once(
    "src/lib/account-report-store.ts",
    'export async function deleteAccountAndScrubReports(userId: string) {',
    '''export async function deleteOwnedAccountReport(userId: string, paymentId: string) {\n  if (!await ensureAccountReportSchema()) throw new Error("account_report_store_unavailable");\n  const sql = getQuery();\n  if (!sql) throw new Error("account_report_store_unavailable");\n\n  const rows = await sql`\n    WITH owned AS (\n      SELECT payment_id\n      FROM woorigunghap_account_reports\n      WHERE user_id = ${userId}\n        AND payment_id = ${paymentId}\n    ), scrubbed AS (\n      UPDATE woorigunghap_order_records records\n      SET order_json = jsonb_build_object(\n            'version', 'legal-retention-v1',\n            'paymentId', records.payment_id,\n            'orderId', COALESCE(records.order_json::jsonb ->> 'orderId', ''),\n            'product', COALESCE(records.order_json::jsonb ->> 'product', ''),\n            'amount', COALESCE((records.order_json::jsonb ->> 'amount')::int, 0),\n            'status', records.payment_status,\n            'createdAt', records.created_at,\n            'retainedFor', 'electronic-commerce-record'\n          )::text,\n          report_json = NULL,\n          access_token_hash = NULL,\n          generation_status = 'deleted',\n          generation_started_at = NULL,\n          updated_at = NOW()\n      WHERE records.payment_id IN (SELECT payment_id FROM owned)\n      RETURNING records.payment_id\n    ), deleted AS (\n      DELETE FROM woorigunghap_account_reports account\n      WHERE account.user_id = ${userId}\n        AND account.payment_id IN (SELECT payment_id FROM scrubbed)\n      RETURNING account.payment_id\n    )\n    SELECT payment_id FROM deleted\n  `;\n  return rows.length > 0;\n}\n\nexport async function deleteAccountAndScrubReports(userId: string) {''',
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

# Prevent in-flight generation from resurrecting a deleted report.
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}\n      AND payment_status = 'paid'\n      AND report_json IS NULL\n      AND (''',
    '''    WHERE payment_id = ${paymentId}\n      AND payment_status = 'paid'\n      AND report_json IS NULL\n      AND generation_status <> 'deleted'\n      AND (''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}\n      AND payment_status = 'paid'\n    RETURNING payment_id\n  `;\n  return rows.length > 0;\n}\n\nexport async function releaseOneToManyGeneration''',
    '''    WHERE payment_id = ${paymentId}\n      AND payment_status = 'paid'\n      AND generation_status <> 'deleted'\n    RETURNING payment_id\n  `;\n  return rows.length > 0;\n}\n\nexport async function releaseOneToManyGeneration''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}\n      AND report_json IS NULL\n  `;''',
    '''    WHERE payment_id = ${paymentId}\n      AND report_json IS NULL\n      AND generation_status = 'generating'\n  `;''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}\n    RETURNING payment_id\n  `;\n  return result.length > 0;\n}\n\nexport async function saveServerReportPrepared''',
    '''    WHERE payment_id = ${paymentId}\n      AND generation_status <> 'deleted'\n    RETURNING payment_id\n  `;\n  return result.length > 0;\n}\n\nexport async function saveServerReportPrepared''',
)
replace_once(
    "src/lib/server-report-store.ts",
    '''    WHERE payment_id = ${paymentId}\n      AND payment_status = 'paid'\n    RETURNING payment_id\n  `;\n  return rows.length > 0;\n}\n''',
    '''    WHERE payment_id = ${paymentId}\n      AND payment_status = 'paid'\n      AND generation_status <> 'deleted'\n    RETURNING payment_id\n  `;\n  return rows.length > 0;\n}\n''',
)

# Clear browser recovery copies when the user deletes a library report.
replace_once(
    "src/lib/order-storage.ts",
    '''function safeSet(storage: Storage, key: string, value: string) {\n  try {\n    storage.setItem(key, value);\n    return true;\n  } catch {\n    return false;\n  }\n}\n''',
    '''function safeSet(storage: Storage, key: string, value: string) {\n  try {\n    storage.setItem(key, value);\n    return true;\n  } catch {\n    return false;\n  }\n}\n\nfunction safeRemove(storage: Storage, key: string) {\n  try {\n    storage.removeItem(key);\n  } catch {\n    // Browser storage cleanup is best effort.\n  }\n}\n''',
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
    '''  async function deleteReport(report: ReportSummary) {\n    const confirmed = window.confirm("이 결과를 삭제하면 복구할 수 없습니다. 상세 리포트와 입력정보는 삭제되고, 결제 거래기록은 법정 보존 의무에 필요한 최소 정보만 남습니다. 삭제할까요?");\n    if (!confirmed) return;\n    setDeleteBusyPaymentId(report.paymentId);\n    setDeleteMessage(null);\n    try {\n      const response = await fetch(`/api/account/reports/${encodeURIComponent(report.paymentId)}`, { method: "DELETE" });\n      const payload = await response.json().catch(() => null);\n      if (!response.ok) {\n        setDeleteMessage(typeof payload?.error === "string" ? payload.error : "결과 삭제에 실패했습니다.");\n        return;\n      }\n      removeOrderDraft(report.paymentId);\n      removeReportProgress(report.paymentId, report.createdAt);\n      setState((current) => current.status === "ready"\n        ? { ...current, reports: current.reports.filter((item) => item.paymentId !== report.paymentId) }\n        : current);\n      setDeleteMessage("보관함 결과를 삭제했습니다.");\n    } catch {\n      setDeleteMessage("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");\n    } finally {\n      setDeleteBusyPaymentId(null);\n    }\n  }\n\n  async function disableChannelNotification() {''',
)
replace_once(
    "src/app/account/reports/page.tsx",
    '''        {state.status === "ready" && state.reports.length > 0 ? <ul className="library-grid">\n          {state.reports.map((report) => <li key={report.paymentId}>\n            {report.status === "ready" ? <Link className="library-card" href={reportHref(report)}>\n              <span>{report.productLabel} · {report.relationshipLabel}</span>\n              <strong>{report.title}</strong>\n              <small>{formatDate(report.createdAt)} 구매</small>\n              <b>저장된 결과 열기</b>\n            </Link> : <article className="library-card library-card-generating" aria-busy="true">\n              <span>{report.productLabel} · {report.relationshipLabel}</span>\n              <strong>{report.title}</strong>\n              <small>{formatDate(report.createdAt)} 구매</small>\n              <b>생성중</b>\n              <p>결과를 만들고 있어요. 같은 브라우저의 복구키가 있으면 멈춘 생성도 자동으로 다시 이어갑니다.</p>\n            </article>}\n          </li>)}\n        </ul> : null}''',
    '''        {state.status === "ready" && deleteMessage ? <p className="library-delete-feedback" role="status">{deleteMessage}</p> : null}\n        {state.status === "ready" && state.reports.length > 0 ? <ul className="library-grid">\n          {state.reports.map((report) => <li key={report.paymentId}>\n            <article className="library-card-shell">\n              {report.status === "ready" ? <Link className="library-card" href={reportHref(report)}>\n                <span>{report.productLabel} · {report.relationshipLabel}</span>\n                <strong>{report.title}</strong>\n                <small>{formatDate(report.createdAt)} 구매</small>\n                <b>저장된 결과 열기</b>\n              </Link> : <div className="library-card library-card-generating" aria-busy="true">\n                <span>{report.productLabel} · {report.relationshipLabel}</span>\n                <strong>{report.title}</strong>\n                <small>{formatDate(report.createdAt)} 구매</small>\n                <b>생성중</b>\n                <p>결과를 만들고 있어요. 같은 브라우저의 복구키가 있으면 멈춘 생성도 자동으로 다시 이어갑니다.</p>\n              </div>}\n              <button\n                type="button"\n                className="library-delete-button"\n                onClick={() => void deleteReport(report)}\n                disabled={deleteBusyPaymentId === report.paymentId}\n              >{deleteBusyPaymentId === report.paymentId ? "삭제 중…" : "결과 삭제"}</button>\n            </article>\n          </li>)}\n        </ul> : null}''',
)

# Contract tests.
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
    'assert.match(accountStore, /access_token_hash = NULL/);\nassert.match(accountStore, /export async function deleteOwnedAccountReport/);\nassert.match(accountStore, /generation_status = \'deleted\'/);\nassert.match(accountStore, /retainedFor[\s\S]*electronic-commerce-record/);',
)
replace_once(
    "scripts/day18-account-report-library-contract-test.ts",
    'assert.doesNotMatch(detailRoute, /accessToken|generateOneToManyNarrative|generatePaidReport/);',
    'assert.doesNotMatch(detailRoute, /accessToken|generateOneToManyNarrative|generatePaidReport/);\nassert.match(detailRoute, /export async function DELETE/);\nassert.match(detailRoute, /isSameOriginPost\(request\)/);\nassert.match(detailRoute, /deleteOwnedAccountReport\(user\.userId, paymentId\)/);\nassert.match(serverStore, /generation_status <> \'deleted\'/);',
)
replace_once(
    "scripts/day18-account-report-library-contract-test.ts",
    'assert.match(libraryPage, />생성중</);',
    'assert.match(libraryPage, />생성중</);\nassert.match(libraryPage, /결과 삭제/);\nassert.match(libraryPage, /method: "DELETE"/);\nassert.match(libraryPage, /removeOrderDraft\(report\.paymentId\)/);\nassert.match(libraryPage, /removeReportProgress\(report\.paymentId, report\.createdAt\)/);\nassert.match(orderStorage, /export function removeOrderDraft/);\nassert.match(progressStorage, /export function removeReportProgress/);',
)

# Styling for the new score guide and delete controls.
append_once(
    "src/app/report-p5-overrides.css",
    "/* Score calibration meaning */",
    r'''/* Score calibration meaning */
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
@media (max-width: 520px) { .v2-page .v2-score-band-grid { grid-template-columns: 1fr; } }
''',
)
append_once(
    "src/app/globals.css",
    "/* Library report deletion */",
    r'''/* Library report deletion */
.library-card-shell { position: relative; height: 100%; }
.library-card-shell .library-card { height: 100%; padding-bottom: 64px; }
.library-delete-button { position: absolute; right: 18px; bottom: 16px; z-index: 2; border: 1px solid #e3c9c4; border-radius: 10px; padding: 8px 11px; background: #fff8f6; color: #9b4f45; cursor: pointer; font-size: .78rem; font-weight: 800; }
.library-delete-button:hover { background: #fceeea; }
.library-delete-button:disabled { cursor: wait; opacity: .55; }
.library-delete-feedback { margin: 18px 0 -18px; color: #6d625a; font-size: .88rem; }
.ranking-score-level { display: block; margin-top: -4px; color: #756780; font-size: .74rem; font-weight: 800; }
''',
)
