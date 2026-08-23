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
  birthTime: "09:30",
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
  "birthDate",
  "birthTime",
  "sourceDate",
  "solarDate",
  "paymentId",
  "accessToken",
  "rawTotal",
  "dimensions",
  "narrative",
]) {
  assert.equal(publicResult.includes(forbidden), false, `무료 결과 DTO에 ${forbidden}가 노출되면 안 됩니다.`);
}

const homeSource = readFileSync("src/app/page.tsx", "utf8");
assert.match(homeSource, /href="\/free"/);
assert.match(homeSource, /무료로 내 관계 성향 보기/);
assert.doesNotMatch(homeSource, /1:1 궁합 보기 · 1,000원/);
assert.match(homeSource, /<strong>1,000원<\/strong>/);
assert.match(homeSource, /<strong>3,000원<\/strong>/);
assert.ok(homeSource.indexOf("무료로 내 관계 성향 보기") < homeSource.indexOf("<strong>1,000원</strong>"), "첫 설득은 무료 CTA여야 합니다.");

const freePageSource = readFileSync("src/app/free/page.tsx", "utf8");
assert.match(freePageSource, /0원 · 결제 없음/);
assert.match(freePageSource, /무료 결과가 잘 맞는다고 느껴졌을 때만/);

const freeClientSource = readFileSync("src/components/free-self-analysis.tsx", "utf8");
assert.match(freeClientSource, /sessionStorage\.setItem\(FREE_SELF_PERSON_STORAGE_KEY/);
assert.match(freeClientSource, /href="\/one-to-one\?from=free"/);
assert.match(freeClientSource, /1,000원/);
assert.match(freeClientSource, /3,000원/);
assert.match(freeClientSource, /\{analysis \? \(/, "유료 CTA는 무료 결과가 생긴 뒤에 렌더링되어야 합니다.");
assert.doesNotMatch(freeClientSource, /birthDate=.*from=free|birthTime=.*from=free/);

const freeApiSource = readFileSync("src/app/api/free/self-analysis/route.ts", "utf8");
for (const forbidden of ["anthropic", "/api/orders", "paymentId", "PortOne", "server-report-store"]) {
  assert.equal(freeApiSource.toLowerCase().includes(forbidden.toLowerCase()), false, `무료 API가 ${forbidden} 경계를 침범하면 안 됩니다.`);
}
assert.match(freeApiSource, /buildFreeSelfAnalysis/);

const oneToOneSource = readFileSync("src/components/one-to-one-form.tsx", "utf8");
assert.match(oneToOneSource, /FREE_SELF_PERSON_STORAGE_KEY/);
assert.match(oneToOneSource, /sessionStorage\.getItem/);
assert.match(oneToOneSource, /fromFree/);
assert.match(oneToOneSource, /personA: toPersonBirthForm\(parsed\)/);

console.log("Growth free acquisition contract passed.");
