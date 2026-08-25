import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const layout = source("src/app/layout.tsx");
const theme = source("src/app/report-theme.css");
const unifiedTheme = source("src/app/theme-unification.css");
const home = source("src/app/page.tsx");
const accountLibrary = source("src/app/account/reports/page.tsx");
const oneToOneRoute = source("src/app/api/compatibility/one-to-one/route.ts");
const paymentVerify = source("src/app/api/payments/verify/route.ts");
const backgroundKickoff = source("src/lib/background-report-kickoff.ts");
const segmentLock = source("src/lib/report-generation-lock.ts");
const oneToOneShare = source("src/app/one-to-one/result/compatibility-share-card.tsx");
const oneToManyShare = source("src/components/one-to-many-share-card.tsx");
const oneToManyResult = source("src/components/one-to-many-result.tsx");
const vercel = JSON.parse(source("vercel.json")) as { fluid?: boolean; git?: { deploymentEnabled?: boolean } };

assert.ok(layout.includes('import "./report-theme.css";'), "root layout must load the shared theme tokens");
assert.ok(layout.includes('import "./theme-unification.css";'), "root layout must load the final legacy-theme override");
assert.ok(
  layout.indexOf('import "./theme-unification.css";') > layout.indexOf('import "./score-library.css";'),
  "theme unification must be imported after legacy styles",
);
assert.ok(theme.includes("--saju-bg-base: #F7F7F4"), "light base must use the Design Foundation v2 neutral canvas");
assert.ok(theme.includes("--saju-bg-card: #FFFFFF"), "card surface must use the Design Foundation v2 card token");
assert.ok(theme.includes("--saju-action: #222226"), "primary action must use the shared ink action token");
assert.ok(theme.includes("--saju-element-wood: #4D8B5F"), "functional five-element tokens must remain available");
assert.ok(!theme.includes("prefers-color-scheme: dark"), "Design Foundation v2 must stay light-only");
for (const selector of [".library-page", ".input-page", ".result-page", ".comparison-report-page", ".site-header"]) {
  assert.ok(unifiedTheme.includes(selector), `theme override must cover ${selector}`);
}
for (const legacyColor of ["#fbf8f3", "#f8f4ee", "#fffdf9", "#f7e4bc"]) {
  assert.ok(!theme.toLowerCase().includes(legacyColor), `shared theme must not reintroduce ${legacyColor}`);
  assert.ok(!unifiedTheme.toLowerCase().includes(legacyColor), `theme override must not reintroduce ${legacyColor}`);
}

for (const removedCopy of [
  "계산은 서버가",
  "무료는 계산만",
  "AI는 서술만",
  "결제 후 생성",
  "전통 명리 해석을 바탕으로 관계의 패턴을 살펴보는 콘텐츠",
]) {
  assert.ok(!home.includes(removedCopy), `home must not render removed implementation copy: ${removedCopy}`);
}

assert.ok(
  oneToOneRoute.includes("paid-report-v7-concise-structured-quality-repair-20260826"),
  "1:1 route must expose the concise structured generation runtime version",
);
assert.ok(oneToOneRoute.includes("export const maxDuration = 300"), "1:1 route must use the Hobby Fluid Compute duration ceiling");
assert.ok(oneToOneRoute.includes('requestedSegment === "dynamics" ? ["dynamics", "action"] : [requestedSegment]'), "intro must run alone and only the two long segments may overlap");
assert.ok(oneToOneRoute.includes("const requestedResult = await requestedExecution"), "the HTTP response must wait only for the requested paid segment");
assert.ok(oneToOneRoute.includes("after(async () =>"), "only the second long segment may continue after the dynamics response");
assert.ok(oneToOneRoute.includes("Promise.allSettled(backgroundExecutions)"), "the staged long-segment overlap must be retained by waitUntil/after");
assert.ok(!oneToOneRoute.includes("for (const segment of PAID_REPORT_SEGMENTS)"), "every request must not fan out all three paid segments again");
assert.ok(!oneToOneRoute.includes("const results = await Promise.all(plans.map"), "a requested segment must never wait for every segment before responding");
assert.ok(oneToOneRoute.includes("claimReportSegmentGeneration(paymentId, segment)"), "generation must retain per-segment single-flight claims");
assert.ok(oneToOneRoute.includes("reclaimCompletedReportSegmentGeneration"), "a complete lock with no stored output must be repairable");
assert.ok(oneToOneRoute.includes('code: "REPORT_GENERATION_STOPPED"'), "exhausted AI failures must stop hidden infinite retry");
assert.ok(oneToOneRoute.includes("retryable: false"), "hard generation failures must be visible instead of retrying forever");
assert.ok(segmentLock.includes("INTERVAL '5 minutes'"), "stale 1:1 segment claims must retain the five-minute duplicate-cost safety window");
assert.ok(segmentLock.includes("status = 'complete'"), "segment lock recovery must detect completed claims");
assert.ok(segmentLock.includes("reclaimCompletedReportSegmentGeneration"), "completed-without-output claims must have a reconciliation path");
assert.ok(paymentVerify.includes('verified.product === "oneToMany"'), "payment verification must not start nested 1:1 AI generation");
assert.ok(!backgroundKickoff.includes("ONE_TO_ONE_SEGMENTS"), "background kickoff must not launch three 1:1 segment requests");
assert.ok(!backgroundKickoff.includes("/api/compatibility/one-to-one"), "payment/library background work must not compete with the active 1:1 result page");
assert.ok(accountLibrary.includes("GENERATION_RESUME_INTERVAL_MS = 60_000"), "library recovery handoff must retain its throttle while legacy behavior is reviewed");
assert.ok(accountLibrary.includes("결과 열기 · 공유하기"), "ready library cards must make sharing discoverable");

for (const [label, shareSource] of [["1:1", oneToOneShare], ["1:N", oneToManyShare]] as const) {
  assert.ok(shareSource.includes("createPublicShareUrl"), `${label} sharing must create a public Shared View URL`);
  assert.ok(shareSource.includes("navigator.share"), `${label} sharing must use the platform share sheet when available`);
  assert.ok(shareSource.includes("canvas.width = 1080"), `${label} sharing must render a 1080px-wide image`);
  assert.ok(shareSource.includes("canvas.height = 1920"), `${label} sharing must render a 1920px-high image`);
  assert.ok(shareSource.includes("link.download"), `${label} sharing must support image save`);
}
assert.ok(oneToManyResult.includes("<OneToManyShareCard view={view} />"), "paid 1:N result must mount its share UI");
assert.equal(vercel.fluid, true, "Fluid Compute must be pinned for long paid narrative functions");
assert.equal(vercel.git?.deploymentEnabled, false, "automatic Vercel Git deployments must stay disabled until user approval");

console.log("Hotfix runtime/UI contract passed: Design Foundation v2 theme, staged 1:1 generation, no nested 1:1 kickoff, visible failures, share path, and manual deploy policy.");
