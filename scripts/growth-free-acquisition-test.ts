import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFreeSelfAnalysis } from "../src/lib/free-self-analysis";
import { FREE_SELF_INSIGHT_KEYS } from "../src/lib/free-self-analysis-contract";
import type { PersonBirthInput } from "../src/lib/report-input";

const person: PersonBirthInput = {
  displayName: "테스트",
  gender: "female",
  calendarType: "solar",
  birthDate: "1998-08-15",
  birthTimeKnown: true,
  birthTime: "14:30",
  isLeapMonth: false,
};

const first = buildFreeSelfAnalysis(person);
const second = buildFreeSelfAnalysis(person);
assert.deepEqual(first, second, "무료 자기 분석은 같은 입력에서 결정론적으로 같아야 합니다.");
assert.equal(first.insights.length, 4, "무료 결과는 Aha insight 4개만 제공합니다.");
assert.deepEqual(first.insights.map((item) => item.key), [...FREE_SELF_INSIGHT_KEYS]);
assert.ok(first.dayPillar.length >= 2, "무료 결과에는 일주 수준의 설명 기준이 있어야 합니다.");

const publicResult = JSON.stringify(first);
for (const forbidden of [
  "birthDate", "birthTime", "sourceDate", "solarDate", "paymentId", "accessToken", "rawTotal", "dimensions", "narrative",
]) {
  assert.equal(publicResult.includes(forbidden), false, `무료 결과 DTO에 ${forbidden}가 노출되면 안 됩니다.`);
}

const homeSource = readFileSync("src/app/page.tsx", "utf8");
const homeCss = readFileSync("src/app/home-p5.module.css", "utf8");
assert.match(homeSource, /당신의 궁합/);
assert.match(homeSource, /href="\/one-to-one"/);
assert.match(homeSource, /href="\/one-to-many"/);
assert.match(homeSource, /1:1 궁합/);
assert.match(homeSource, /1:N 궁합/);
assert.match(homeSource, /오늘의 궁합 TOP 3/);
assert.match(homeSource, /관계 흐름 한눈에 보기/);
assert.match(homeSource, /주토피의 오늘의 한마디/);
assert.match(homeCss, /width:\s*min\(100%,\s*390px\)/);
assert.match(homeCss, /grid-template-columns:\s*1fr 1fr/);
assert.match(homeCss, /position:\s*fixed/);
assert.match(homeCss, /\.bottomNav/);
assert.match(homeCss, /@media \(max-width:\s*360px\)/);

const freePageSource = readFileSync("src/app/free/page.tsx", "utf8");
const freePageCss = readFileSync("src/app/free/free-page.module.css", "utf8");
assert.match(freePageSource, /무료 · 결제 없음/);
assert.match(freePageSource, /내 관계 성향을/);
assert.match(freePageSource, /<ZootopiMark/);
assert.match(freePageSource, /free-page\.module\.css/);
assert.doesNotMatch(freePageSource, /className="input-page"|className="input-shell"/, "무료 화면은 레거시 input-page shell에 의존하지 않아야 합니다.");
assert.match(freePageCss, /--saju-width-compact/);
assert.match(freePageCss, /--zootopi-butter/);
assert.match(freePageCss, /@media \(max-width:\s*480px\)/);

const freeClientSource = readFileSync("src/components/free-self-analysis.tsx", "utf8");
const freeClientCss = readFileSync("src/components/free-self-analysis.module.css", "utf8");
const birthFieldsSource = readFileSync("src/components/person-birth-fields.tsx", "utf8");
assert.match(freeClientSource, /sessionStorage\.setItem\(FREE_SELF_PERSON_STORAGE_KEY/);
assert.match(freeClientSource, /href="\/one-to-one\?from=free"/);
assert.match(freeClientSource, /1,000원/);
assert.match(freeClientSource, /3,000원/);
assert.match(freeClientSource, /내 관계 성향 보기/);
assert.match(freeClientSource, /\{analysis \? \(/, "유료 CTA는 무료 결과가 생긴 뒤에도 유지되어야 합니다.");
assert.doesNotMatch(freeClientSource, /birthDate=.*from=free|birthTime=.*from=free/);
assert.match(freeClientCss, /var\(--saju-action\)/);
assert.match(freeClientCss, /var\(--saju-ink\)/);
assert.match(freeClientCss, /var\(--zootopi-butter\)/);
assert.match(freeClientCss, /:global\(\.person-panel\)/);
assert.match(freeClientCss, /@media \(max-width:\s*480px\)/);

assert.match(birthFieldsSource, /24시간제/);
assert.match(birthFieldsSource, /placeholder="예: 1430"/);
assert.match(birthFieldsSource, /hour > 23 \|\| minute > 59/);
assert.doesNotMatch(birthFieldsSource, /출생시간 오전 또는 오후/);
assert.doesNotMatch(birthFieldsSource, />오전<|>오후</);
assert.match(birthFieldsSource, /legacyTwelveHourToTwentyFour/, "기존 저장된 12시간제 form state는 읽기 호환해야 합니다.");

const freeApiSource = readFileSync("src/app/api/free/self-analysis/route.ts", "utf8");
for (const forbidden of ["anthropic", "/api/orders", "paymentId", "PortOne", "server-report-store"]) {
  assert.equal(freeApiSource.toLowerCase().includes(forbidden.toLowerCase()), false, `무료 API가 ${forbidden} 경계를 침범하면 안 됩니다.`);
}
assert.match(freeApiSource, /buildFreeSelfAnalysis/);

const oneToOnePageSource = readFileSync("src/app/one-to-one/page.tsx", "utf8");
const oneToOneSource = readFileSync("src/components/one-to-one-form-v3.tsx", "utf8");
const oneToOneCss = readFileSync("src/app/one-to-one/one-to-one-input-v3.module.css", "utf8");
assert.match(oneToOnePageSource, /OneToOneFormV3/);
assert.match(oneToOnePageSource, /1:1 관계 궁합 · 3단계/);
assert.match(oneToOnePageSource, /24시간제 HHMM/);
assert.match(oneToOneSource, /const STEP_LABELS = \["내 정보", "상대방 정보", "확인"\]/);
assert.match(oneToOneSource, /FREE_SELF_PERSON_STORAGE_KEY/);
assert.match(oneToOneSource, /sessionStorage\.getItem/);
assert.match(oneToOneSource, /fromFree/);
assert.match(oneToOneSource, /personA: toPersonBirthForm\(parsed\)/);
assert.match(oneToOneSource, /birthTime\.replace\(":", ""\)/, "free prefill은 24시간 HHMM으로 표시해야 합니다.");
assert.match(oneToOneSource, /RELATIONSHIP_TYPES\.map/);
assert.match(oneToOneSource, /validateOneToOneReportInput/);
assert.match(oneToOneSource, /createRecoveredOneToOneOrderDraft/);
assert.match(oneToOneSource, /\/api\/orders\/one-to-one/);
assert.match(oneToOneSource, /v3-review-card/);
assert.match(oneToOneCss, /grid-template-columns:\s*repeat\(3/);
assert.match(oneToOneCss, /--zootopi-butter/);
assert.match(oneToOneCss, /@media \(max-width:\s*480px\)/);

console.log("Growth acquisition + A-reference home + v3 input + 24-hour birth time contract passed.");
