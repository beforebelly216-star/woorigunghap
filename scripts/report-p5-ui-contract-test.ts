import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const theme = readFileSync("src/app/report-theme.css", "utf8");
const base = readFileSync("src/app/report-v2-base.css", "utf8");
const detail = readFileSync("src/app/report-v2-detail.css", "utf8");
const overrides = readFileSync("src/app/report-p5-overrides.css", "utf8");
const mobile = readFileSync("src/app/report-p5-mobile.css", "utf8");
const page = readFileSync("src/app/one-to-one/result/page.tsx", "utf8");
const result = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const resultStatusCss = readFileSync("src/app/one-to-one/result/result-status.css", "utf8");
const components = readFileSync("src/app/one-to-one/result/report-v2-components.tsx", "utf8");
const oneToOnePage = readFileSync("src/app/one-to-one/page.tsx", "utf8");
const oneToOneInputCss = readFileSync("src/app/one-to-one/one-to-one-input-v3.module.css", "utf8");
const checkout = readFileSync("src/app/one-to-one/checkout/page.tsx", "utf8");
const oneToOneFlowCss = readFileSync("src/app/one-to-one/one-to-one-flow.module.css", "utf8");
const payment = readFileSync("src/components/payment-button.tsx", "utf8");
const share = readFileSync("src/app/one-to-one/result/compatibility-share-card.tsx", "utf8");
const shareCss = readFileSync("src/app/one-to-one/result/compatibility-share-card.module.css", "utf8");
const home = readFileSync("src/app/page.tsx", "utf8");
const homeCss = readFileSync("src/app/home-p5.module.css", "utf8");

for (const token of ["#F7F7F4", "#FFFFFF", "#EFEFEB", "#222226", "#68686F", "#929298", "#E2E2DD", "#CBCBC4", "#E9E9E4", "#4D8B5F", "#D55A4A", "#C9973D", "#858E9E", "#3E78A8", "#2F7D4A", "#9A6A12", "#B74343", "#356F9C"]) {
  assert.ok(theme.includes(token), `Design Foundation v2 token missing: ${token}`);
}
assert.doesNotMatch(theme, /prefers-color-scheme:\s*dark/);
assert.match(theme, /Pretendard/);
assert.match(theme, /--saju-width-report:\s*640px/);
assert.match(page, /report-theme\.css/);
assert.match(page, /report-p5-overrides\.css/);
assert.match(page, /report-p5-mobile\.css/);
assert.match(page, /result-status\.css/);
assert.doesNotMatch(base + detail, /#fbf8f2|#213f33|#fffdf8/i);
assert.match(overrides, /partner-inner-mind-hero/);
assert.match(overrides, /deep-strategy-steps/);

assert.match(home, /home-p5\.module\.css/);
assert.match(home, /무료 천생연분/);
assert.match(home, /오늘의 궁합 TOP 3/);
assert.match(homeCss, /width:\s*min\(100%,\s*390px\)/);
assert.match(homeCss, /grid-template-columns:\s*repeat\(3/);
assert.match(homeCss, /\.bottomNav/);

assert.match(oneToOnePage, /input-reference-v4\.css/);
assert.match(oneToOnePage, /one-to-one-input-v3\.module\.css/);
assert.match(oneToOnePage, /1:1 궁합 입력/);
assert.match(oneToOneInputCss, /one-to-one-reference-page/);
assert.match(oneToOneInputCss, /#7b46d8/i);
assert.match(checkout, /one-to-one-flow\.module\.css/);
assert.match(oneToOneFlowCss, /var\(--saju-width-compact\)/);
assert.match(oneToOneFlowCss, /@media \(max-width:\s*480px\)/);

assert.match(resultStatusCss, /var\(--saju-width-compact\)/);
assert.match(resultStatusCss, /@media \(max-width:\s*480px\)/);
assert.match(page, /결제와 저장 상태를 확인한 뒤 이어서 보여드릴게요/);
assert.match(result, /STAGE_COPY/);
assert.match(result, /stageAttempt > 1/);
assert.match(result, /결제는 다시 하지 않아도 됩니다/);
assert.match(result, /recoverPaymentId=/);
assert.match(components, /CompatibilityHeatmap/);
assert.match(components, /9개 핵심 궁합 지표 히트맵/);
assert.match(result, /<CompatibilityHeatmap/);
assert.match(components, /사주소년 용한/);
assert.match(result, /v2-reading-progress/);
assert.match(checkout, /checkout-sticky-cta/);
assert.match(checkout, /1:1 전체 리포트 보기 · 1,000원/);
assert.match(checkout, /agreementAccepted=\{policyAccepted\}/);
assert.match(payment, /buttonLabel\?: string/);
assert.match(share, /document\.createElement\("canvas"\)/);
assert.match(share, /new File\(\[blob\]/);
assert.match(share, /createPublicShareUrl\(buildOneToOnePublicShare/);
assert.doesNotMatch(share, /accessToken/);
assert.match(shareCss, /aspect-ratio:\s*9 \/ 16/);
assert.match(mobile, /overflow-x:\s*clip/);
assert.ok(result.indexOf("<CompatibilityShareCard") < result.indexOf("<section className=\"v2-basic-facts\""));

console.log("Report + A99 home + rebuilt input UI responsive contract: PASS");
