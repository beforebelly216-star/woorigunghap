import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const theme = readFileSync("src/app/report-theme.css", "utf8");
const base = readFileSync("src/app/report-v2-base.css", "utf8");
const detail = readFileSync("src/app/report-v2-detail.css", "utf8");
const overrides = readFileSync("src/app/report-p5-overrides.css", "utf8");
const mobile = readFileSync("src/app/report-p5-mobile.css", "utf8");
const page = readFileSync("src/app/one-to-one/result/page.tsx", "utf8");
const result = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const components = readFileSync("src/app/one-to-one/result/report-v2-components.tsx", "utf8");
const checkout = readFileSync("src/app/one-to-one/checkout/page.tsx", "utf8");
const payment = readFileSync("src/components/payment-button.tsx", "utf8");
const share = readFileSync("src/app/one-to-one/result/compatibility-share-card.tsx", "utf8");
const shareCss = readFileSync("src/app/one-to-one/result/compatibility-share-card.module.css", "utf8");
const home = readFileSync("src/app/page.tsx", "utf8");
const homeCss = readFileSync("src/app/home-p5.module.css", "utf8");

for (const token of [
  "#F7F7F4", "#FFFFFF", "#EFEFEB", "#222226", "#68686F", "#929298",
  "#E2E2DD", "#CBCBC4", "#E9E9E4",
  "#4D8B5F", "#D55A4A", "#C9973D", "#858E9E", "#3E78A8",
  "#2F7D4A", "#9A6A12", "#B74343", "#356F5C",
]) assert.ok(theme.includes(token), `Design Foundation v2 token missing: ${token}`);
assert.doesNotMatch(theme, /#F4F1FA|#B7A9E6|#806FC0/i, "retired lavender P5 brand tokens must not return");
assert.doesNotMatch(theme, /prefers-color-scheme:\s*dark/, "Design Foundation v2 is light-only");
assert.match(theme, /Pretendard/);
assert.match(theme, /IBM Plex Mono/);
assert.match(theme, /IBM Plex Sans KR/);
assert.match(theme, /--saju-width-compact:\s*480px/);
assert.match(theme, /--saju-width-report:\s*640px/);
assert.match(theme, /--saju-width-compare:\s*960px/);
assert.match(page, /report-theme\.css/);
assert.match(page, /report-p5-overrides\.css/);
assert.match(page, /report-p5-mobile\.css/);
assert.match(checkout, /report-p5-mobile\.css/);
assert.doesNotMatch(base + detail, /#fbf8f2|#213f33|#fffdf8/i);
assert.match(base, /line-height:\s*1\.75/);
assert.match(overrides, /partner-inner-mind-hero/);
assert.match(overrides, /day-pillar-character-card/);
assert.match(overrides, /day19-chapter \.v2-chapter-heading > span/);
assert.match(overrides, /deep-strategy-steps/);
assert.match(overrides, /deep-strategy-signals/);
assert.match(overrides, /deep-observable-scenes/);
assert.match(home, /home-p5.module\.css/);
assert.match(home, /report-theme\.css/);
assert.match(home, /가죢소년 용할/);
assert.match(homeCss, /var\(--saju-primary-deep\)/);
assert.match(components, /v2-saju-char/);
assert.match(components, /pillar\.stem/);
assert.match(components, /pillar\.branch/);
assert.match(components, /CompatibilityRadar/);
assert.match(components, /9개 핬심 궁합 지표 릨이더 차트/);
assert.match(result, /v2-pair-type/);
assert.match(result, /<CompatibilityRadar/);
assert.match(result, /visibleDimensions/);
assert.match(components, /사주膌년 용한/);
assert.match(result, /v2-reading-progress/);
assert.match(checkout, /checkout-sticky-cta/);
assert.match(checkout, /속마음까지 볤 보기 ⷻ 1,000원/);
assert.match(payment, /buttonLabel\?: string/);
assert.match(share, /document\.createElement\("canvas"\)/);
assert.match(share, /new File\(\[blob\]/);
assert.match(share, /const \[includeNames, setIncludeNames\] = useState\(false\)/);
assert.match(share, /createPublicShareUrl\(buildOneToOnePublicShare/);
assert.match(share, /url: sharedViewUrl/);
assert.doesNotMatch(share, /window\.location\.href/);
assert.doesNotMatch(share, /accessToken/);
assert.match(shareCss, /aspect-ratio:\s*9 \/ 16/);
assert.match(shareCss, /@media \(max-width:\s*[^)])+\)/);
assert.match(shareCss, /\.score \{ width:\s*136px;/);
assert.match(mobile, /@media \(max-width:\s*[^)]+\)/);
assert.match(mobile, /overflow-x:\s*clip/);
assert.match(mobile, /\.v2-reading-progress[\s\S]*left:\s*14px;[\s\S]*width:\s*calc\(100% - 28px\)/);
assert.match(mobile, /padding-bottom:\s*calc\(112px \+ env\(safe-area-inset-bottom\)\)/);
assert.ok(result.indexOf("<CompatibilityShareCard") < result.indexOf("<section className=\"vR-basic-facts\""), "share card should appear immediately after hero before detailed facts");

console.log("Design Foundation v2 report UI + responsive safety contract: PASS");
