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
const segmentLock = source("src/lib/report-generation-lock.ts");
const oneToOneShare = source("src/app/one-to-one/result/compatibility-share-card.tsx");
const oneToManyShare = source("src/components/one-to-many-share-card.tsx");
const oneToManyResult = source("src/components/one-to-many-result.tsx");
const vercel = JSON.parse(source("vercel.json")) as { git?: { deploymentEnabled?: boolean } };

assert.ok(layout.includes('import "./report-theme.css";'), "root layout must load the shared theme tokens");
assert.ok(layout.includes('import "./theme-unification.css";'), "root layout must load the final legacy-theme override");
assert.ok(
  layout.indexOf('import "./theme-unification.css";') > layout.indexOf('import "./score-library.css";'),
  "theme unification must be imported after legacy styles",
);
assert.ok(theme.includes("--saju-bg-base: #F4F1FA"), "light base must use the cool lavender palette");
assert.ok(theme.includes("--saju-bg-card: #FCFBFF"), "card surface must not use the previous pure-white/cream surface");
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
  oneToOneRoute.includes("paid-report-v7-editorial-server-store-20260824-background-fanout"),
  "1:1 route must expose the non-blocking background fanout runtime version",
);
assert.ok(oneToOneRoute.includes('import { after, NextRequest, NextResponse } from "next/server"'), "1:1 route must use Next after() for post-response segment work");
assert.ok(oneToOneRoute.includes("for (const segment of PAID_REPORT_SEGMENTS)"), "1:1 route must still plan every paid segment for opportunistic fanout");
assert.ok(oneToOneRoute.includes("const requestedResult = await requestedExecution"), "the HTTP response must wait only for the requested paid segment");
assert.ok(oneToOneRoute.includes("after(async () =>"), "non-requested paid segments must continue after the response");
assert.ok(oneToOneRoute.includes("Promise.allSettled(backgroundExecutions)"), "background segment fanout must be retained by waitUntil/after");
assert.ok(!oneToOneRoute.includes("const results = await Promise.all(plans.map"), "a requested segment must never wait for all three long segments before responding");
assert.ok(oneToOneRoute.includes("claimReportSegmentGeneration"), "parallel generation must retain segment single-flight claims");
assert.ok(oneToOneRoute.includes("releaseUnusedPlans"), "busy requested segments must release opportunistic claims");
assert.ok(segmentLock.includes("INTERVAL '5 minutes'"), "stale 1:1 segment claims must retain the five-minute duplicate-cost safety window");
assert.ok(accountLibrary.includes("GENERATION_RESUME_INTERVAL_MS = 60_000"), "library recovery handoff must retry every minute");
assert.ok(accountLibrary.includes("결과 열기 · 공유하기"), "ready library cards must make sharing discoverable");

for (const [label, shareSource] of [["1:1", oneToOneShare], ["1:N", oneToManyShare]] as const) {
  assert.ok(shareSource.includes("createPublicShareUrl"), `${label} sharing must create a public Shared View URL`);
  assert.ok(shareSource.includes("navigator.share"), `${label} sharing must use the platform share sheet when available`);
  assert.ok(shareSource.includes("canvas.width = 1080"), `${label} sharing must render a 1080px-wide image`);
  assert.ok(shareSource.includes("canvas.height = 1920"), `${label} sharing must render a 1920px-high image`);
  assert.ok(shareSource.includes("link.download"), `${label} sharing must support image save`);
}
assert.ok(oneToManyResult.includes("<OneToManyShareCard view={view} />"), "paid 1:N result must mount its share UI");
assert.equal(vercel.git?.deploymentEnabled, false, "automatic Vercel Git deployments must stay disabled until user approval");

console.log("Hotfix runtime/UI contract passed: unified theme, non-blocking 1:1 fanout, visible share path, and manual Vercel deploy policy.");
