import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const homeSource = readFileSync("src/app/page.tsx", "utf8");
const homeCss = readFileSync("src/app/home-p5.module.css", "utf8");
assert.match(homeSource, /href="\/free"/);
assert.match(homeSource, /무료 천생연분/);
assert.match(homeSource, /href="\/one-to-one"/);
assert.match(homeSource, /href="\/one-to-many"/);
assert.match(homeCss, /grid-template-columns:\s*repeat\(3/);

const freePageSource = readFileSync("src/app/free/page.tsx", "utf8");
const freePageCss = readFileSync("src/app/free/free-page.module.css", "utf8");
const soulmateSource = readFileSync("src/components/soulmate-input-form.tsx", "utf8");
const soulmateCss = readFileSync("src/components/soulmate-input-form.module.css", "utf8");
const soulmateContract = readFileSync("src/lib/soulmate-input-contract.ts", "utf8");
const soulmateResult = readFileSync("src/app/free/result/soulmate-result-client.tsx", "utf8");
assert.match(freePageSource, /당신의 천생연분을/);
assert.match(freePageSource, /무료로/);
assert.match(freePageSource, /SoulmateInputForm/);
assert.match(freePageSource, /reference-input-screen/);
assert.match(freePageCss, /390px/);
assert.match(freePageCss, /free-soulmate-page/);
assert.match(soulmateSource, /SOULMATE_PERSON_STORAGE_KEY/);
assert.match(soulmateSource, /\/api\/free\/soulmate/);
assert.match(soulmateSource, /router\.push\("\/free\/result"\)/);
assert.match(soulmateSource, /외부 AI 호출 없이/);
assert.match(soulmateSource, /내 천생연분 보기/);
assert.match(soulmateCss, /#ffbf00|#ffc928/i);
assert.match(soulmateContract, /parseSoulmatePerson/);
assert.match(soulmateResult, /내 사주 한눈에 보기/);
assert.match(soulmateResult, /가장 잘 맞는 일간 TOP/);
assert.doesNotMatch(soulmateResult, /천생연분 지수/);

for (const retired of [
  "src/components/free-self-analysis.tsx",
  "src/components/free-self-analysis.module.css",
  "src/lib/free-self-analysis.ts",
  "src/app/api/free/self-analysis/route.ts",
]) assert.equal(existsSync(retired), false, `${retired} must stay retired`);

const birthFieldsSource = readFileSync("src/components/person-birth-fields.tsx", "utf8");
assert.match(birthFieldsSource, /24시간제/);
assert.match(birthFieldsSource, /placeholder="HHMM"/);
assert.match(birthFieldsSource, /hour > 23 \|\| minute > 59/);
assert.doesNotMatch(birthFieldsSource, />오전<|>오후</);
assert.match(birthFieldsSource, /calendar-choice/);
assert.match(birthFieldsSource, /input-with-count/);

const oneToOnePage = readFileSync("src/app/one-to-one/page.tsx", "utf8");
const oneToOneSource = readFileSync("src/components/one-to-one-form-v3.tsx", "utf8");
const oneToOneCss = readFileSync("src/app/one-to-one/one-to-one-input-v3.module.css", "utf8");
assert.match(oneToOnePage, /1:1 궁합 입력/);
assert.match(oneToOnePage, /reference-input-screen/);
assert.match(oneToOneSource, /STEP_LABELS = \["내 정보", "상대방 정보", "확인"\]/);
assert.match(oneToOneSource, /validateOneToOneReportInput/);
assert.match(oneToOneSource, /\/api\/orders\/one-to-one/);
assert.match(oneToOneCss, /#7b46d8/i);
assert.match(oneToOneCss, /one-to-one-reference-page/);

const oneToManyPage = readFileSync("src/app/one-to-many/page.tsx", "utf8");
const oneToManyCss = readFileSync("src/app/one-to-many/one-to-many-input-v3.css", "utf8");
assert.match(oneToManyPage, /1:N 궁합 입력/);
assert.match(oneToManyPage, /reference-input-screen/);
assert.match(oneToManyCss, /#7b46d8/i);
assert.match(oneToManyCss, /one-to-many-reference-page/);

console.log("Free soulmate + reference input UI contract passed.");
