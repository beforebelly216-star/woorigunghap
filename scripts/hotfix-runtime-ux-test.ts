import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const layout = source("src/app/layout.tsx");
const theme = source("src/app/report-theme.css");
const appThemeV4 = source("src/app/app-theme-v4.css");
const home = source("src/app/page.tsx");
const oneToOneCheckout = source("src/app/one-to-one/checkout/page.tsx");
const oneToManyCheckout = source("src/app/one-to-many/checkout/page.tsx");
const oneToOneResultStatus = source("src/app/one-to-one/result/result-status.css");
const oneToManyPaidResult = source("src/app/one-to-many/result/one-to-many-paid-result.tsx");
const accountLibrary = source("src/app/account/reports/page.tsx");
const oneToOneRoute = source("src/app/api/compatibility/one-to-one/route.ts");
const oneToOneResult = source("src/app/one-to-one/result/result-v2.tsx");
const oneToOneEngineV8 = source("src/lib/narrative/report-engine-v8.ts");
const paymentVerify = source("src/app/api/payments/verify/route.ts");
const backgroundKickoff = source("src/lib/background-report-kickoff.ts");
const segmentLock = source("src/lib/report-generation-lock.ts");
const oneToOneShare = source("src/app/one-to-one/result/compatibility-share-card.tsx");
const oneToManyShare = source("src/components/one-to-many-share-card.tsx");
const oneToManyResult = source("src/components/one-to-many-result.tsx");
const vercel = JSON.parse(source("vercel.json")) as { fluid?: boolean; git?: { deploymentEnabled?: boolean } };

assert.ok(layout.includes('import "./report-theme.css";'), "root layout must load the shared theme tokens");
assert.ok(layout.includes('import "./app-theme-v4.css";'), "root layout must load the unified mobile app theme");
for (const legacyImport of ["theme-unification.css", "account-foundation.css", "paid-flow-v3.css", "score-library.css", "day20-mobile.css"]) {
  assert.ok(!layout.includes(legacyImport), `root layout must not load legacy design CSS: ${legacyImport}`);
}
assert.ok(theme.includes("--saju-bg-base: #FBFAF7"), "light base must match the mobile report canvas");
assert.ok(theme.includes("--saju-bg-card: #FFFFFF"), "card surface must use the Design Foundation v2 card token");
assert.ok(theme.includes("--saju-action: #7652D8"), "primary action must use the shared purple action token");
assert.ok(theme.includes("--saju-width-report: 390px"), "all report surfaces must use the 390px mobile shell");
assert.ok(theme.includes("--saju-element-wood: #4D8B5F"), "functional five-element tokens must remain available");
assert.ok(!theme.includes("prefers-color-scheme: dark"), "Design Foundation v2 must stay light-only");
for (const selector of [".login-page", ".library-page", ".policy-page", ".one-to-many-result-page", ".site-header", ".shared-view-page"]) {
  assert.ok(appThemeV4.includes(selector), `mobile app theme must cover ${selector}`);
}
for (const legacyColor of ["#fbf8f3", "#f8f4ee", "#fffdf9", "#f7e4bc"]) {
  assert.ok(!theme.toLowerCase().includes(legacyColor), `shared theme must not reintroduce ${legacyColor}`);
  assert.ok(!appThemeV4.toLowerCase().includes(legacyColor), `mobile app theme must not reintroduce ${legacyColor}`);
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

assert.ok(appThemeV4.includes(".paid-flow-steps"), "v4 app theme must show a compact input/payment/generation journey");
assert.ok(appThemeV4.includes(".checkout-v3-assurance"), "v4 app theme must expose payment/storage/recovery assurances before purchase");
assert.ok(appThemeV4.includes(".checkout-sticky-cta"), "v4 app theme must keep the paid CTA reachable on mobile");
assert.ok(appThemeV4.includes(".v2-page > .v2-state"), "1:1 generation status must receive the unified waiting-state card");
assert.ok(appThemeV4.includes(".one-to-many-result-page .comparison-empty-state"), "1:N generation/recovery/failure states must receive the unified state surface");
assert.ok(oneToOneResultStatus.includes("paid 1:1 loading / recovery / terminal states"), "existing 1:1 status contract must remain the base layer");

for (const marker of [
  "입력 완료",
  "1:1 전체 리포트 보기 · 1,000원",
  "중간 이탈 복구",
  "같은 결과 링크로 다시 확인",
]) {
  assert.ok(oneToOneCheckout.includes(marker), `1:1 checkout must retain v3 paid-flow marker: ${marker}`);
}
for (const marker of [
  "1:N 궁합 · 결제",
  "후보 비교를 시작할 준비가 됐어요.",
  "1:N 전체 비교 보기 · 3,000원",
  "중복 생성 방지",
]) {
  assert.ok(oneToManyCheckout.includes(marker), `1:N checkout must retain v3 paid-flow marker: ${marker}`);
}
assert.ok(oneToManyPaidResult.includes("같은 결제로 다시 확인하기"), "1:N failed generation must preserve manual same-payment retry");
assert.ok(oneToManyPaidResult.includes("REPORT_GENERATION_IN_PROGRESS"), "1:N generation must preserve single-flight in-progress recovery");

assert.ok(
  oneToOneRoute.includes("paid-report-v8-action-core-bounded-retry-20260828"),
  "1:1 route must expose the action-core bounded-retry runtime version",
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
assert.ok(oneToOneRoute.includes('reason === "REPORT_GENERATION_IN_PROGRESS" || reason === "AI_FORMAT"'), "only in-progress and format recovery may be retried by this route");
assert.ok(oneToOneRoute.includes("retryable: retryableReportReason(reason)"), "format recovery must be declared to the result client");
assert.ok(oneToOneResult.includes("MAX_AUTOMATIC_FORMAT_ATTEMPTS = 2"), "format recovery must be bounded to one automatic same-payment retry");
assert.ok(oneToOneResult.includes("같은 결제로 다시 시도"), "exhausted generation must provide an in-page same-payment retry");
const actionSchemaSource = oneToOneEngineV8.slice(
  oneToOneEngineV8.indexOf("const ACTION_SCHEMA"),
  oneToOneEngineV8.indexOf("export type IntroSegment"),
);
assert.ok(!actionSchemaSource.includes("situationStrategy"), "legacy situation strategy must not expand the model action schema");
assert.ok(!actionSchemaSource.includes("actionPlan30"), "legacy 30-day plan must not expand the model action schema");
assert.ok(oneToOneEngineV8.includes("buildActionCompatibilityExtensions"), "legacy display extensions must be assembled deterministically from core action content");
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
assert.ok(!oneToManyResult.includes("OneToManyShareCard"), "1:N ranking-only result must not mount removed share UI");
assert.equal(vercel.fluid, true, "Fluid Compute must be pinned for long paid narrative functions");
assert.equal(vercel.git?.deploymentEnabled, false, "automatic Vercel Git deployments must stay disabled until user approval");

console.log("Hotfix runtime/UI contract passed: unified mobile app theme, staged 1:1 generation, no nested kickoff, visible failures, share path, and manual deploy policy.");
