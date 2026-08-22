import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const theme = readFileSync("src/app/report-theme.css", "utf8");
const base = readFileSync("src/app/report-v2-base.css", "utf8");
const detail = readFileSync("src/app/report-v2-detail.css", "utf8");
const page = readFileSync("src/app/one-to-one/result/page.tsx", "utf8");
const result = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const components = readFileSync("src/app/one-to-one/result/report-v2-components.tsx", "utf8");
const checkout = readFileSync("src/app/one-to-one/checkout/page.tsx", "utf8");
const payment = readFileSync("src/components/payment-button.tsx", "utf8");
const share = readFileSync("src/app/one-to-one/result/compatibility-share-card.tsx", "utf8");
const shareCss = readFileSync("src/app/one-to-one/result/compatibility-share-card.module.css", "utf8");

for (const token of [
  "#FFFBF5", "#FFFFFF", "#3A3550", "#7B7396", "#B8A9E8", "#8B7BC7", "#FFB088", "#8FD9C4", "#FFC4D6",
  "#A8D8B9", "#FF9E9E", "#F5D6A0", "#D9D5E8", "#A5C9E8", "#1F1B2E", "#2A2540", "#EDE9F7",
]) assert.ok(theme.includes(token), `P5 token missing: ${token}`);
assert.match(theme, /prefers-color-scheme:\s*dark/);
assert.match(theme, /Pretendard/);
assert.match(theme, /Nanum Myeongjo/);
assert.match(page, /report-theme\.css/);
assert.doesNotMatch(base + detail, /#fbf8f2|#213f33|#fffdf8/i);
assert.match(base, /line-height:\s*1\.75/);
assert.match(components, /v2-saju-char/);
assert.match(components, /pillar\.stem/);
assert.match(components, /pillar\.branch/);
assert.match(components, /CompatibilityRadar/);
assert.match(components, /9개 핵심 궁합 지표 레이더 차트/);
assert.match(result, /v2-pair-type/);
assert.match(result, /<CompatibilityRadar/);
assert.match(result, /visibleDimensions/);
assert.match(components, /사주소년 용한/);
assert.match(result, /v2-reading-progress/);
assert.match(checkout, /checkout-sticky-cta/);
assert.match(checkout, /속마음까지 다 보기 · 1,000원/);
assert.match(payment, /buttonLabel\?: string/);
assert.match(share, /document\.createElement\("canvas"\)/);
assert.match(share, /new File\(\[blob\]/);
assert.match(share, /const \[includeNames, setIncludeNames\] = useState\(false\)/);
assert.match(share, /const safeUrl = `\$\{window\.location\.origin\}\//);
assert.doesNotMatch(share, /window\.location\.href/);
assert.doesNotMatch(share, /accessToken/);
assert.match(shareCss, /aspect-ratio:\s*9 \/ 16/);
assert.ok(result.indexOf("<CompatibilityShareCard") < result.indexOf("<section className=\"v2-basic-facts\""), "share card should appear immediately after hero before detailed facts");

console.log("P5 pastel mascot report UI contract: PASS");
