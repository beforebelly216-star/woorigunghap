import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateSoulmateResult } from "../src/lib/soulmate-result";
import type { PersonBirthInput } from "../src/lib/report-input";

const person: PersonBirthInput = {
  displayName: "테스터",
  gender: "female",
  calendarType: "solar",
  birthDate: "1995-07-21",
  birthTimeKnown: true,
  birthTime: "14:30",
  isLeapMonth: false,
};

const first = calculateSoulmateResult(person);
const second = calculateSoulmateResult(person);

assert.equal(first.version, "soulmate-result-v1");
assert.equal(first.pillars.length, 4, "년월일시 네 기둥을 반환해야 합니다.");
assert.ok(first.pillars.find((pillar) => pillar.key === "day")?.stem, "일주는 반드시 존재해야 합니다.");
assert.ok(first.recommendations.length >= 2 && first.recommendations.length <= 3, "추천 일간은 유의미한 2~3개만 노출해야 합니다.");
assert.equal(new Set(first.recommendations.map((item) => item.stem)).size, first.recommendations.length, "추천 일간은 중복되면 안 됩니다.");
assert.deepEqual(
  first.recommendations,
  second.recommendations,
  "동일 입력의 추천 결과는 generatedAt과 무관하게 결정론적이어야 합니다.",
);
assert.deepEqual(first.elementBalance, second.elementBalance);
assert.deepEqual(first.detailed, second.detailed);

const serialized = JSON.stringify(first);
assert.ok(!serialized.includes("천생연분 지수"), "비교 대상 없는 천생연분 지수를 만들면 안 됩니다.");
assert.ok(!serialized.includes("%"), "천생연분 결과에 확률처럼 보이는 퍼센트를 만들면 안 됩니다.");
assert.ok(first.detailed.methodNote.includes("용신을 확정"), "용신을 확정하지 않는다는 계산 경계를 명시해야 합니다.");
assert.ok(first.detailed.methodNote.includes("확률"), "천생연분 확률을 표시하지 않는다는 계산 경계를 명시해야 합니다.");

const page = readFileSync("src/app/free/result/soulmate-result-client.tsx", "utf8");
for (const required of [
  "내 사주 한눈에 보기",
  "사주팔자 · 원국",
  "가장 잘 맞는 일간 TOP",
  "잘 맞는 사주의 구체적인 모습",
  "주토피 마지막 한마디",
  "1:1 궁합 분석하기",
]) assert.ok(page.includes(required), `결과 화면에 ${required}가 있어야 합니다.`);

for (const forbidden of [
  "천생연분 지수",
  "만남 & 관계 가이드",
  "인연 시기 흐름",
  "추천 활동",
  "잘 맞는 컬러",
]) assert.ok(!page.includes(forbidden), `결과 화면에서 ${forbidden}는 제거되어야 합니다.`);

const api = readFileSync("src/app/api/free/soulmate/route.ts", "utf8");
assert.ok(api.includes("calculateSoulmateResult"), "무료 API는 결정론 천생연분 계산기를 사용해야 합니다.");

const form = readFileSync("src/components/soulmate-input-form.tsx", "utf8");
assert.ok(form.includes('/api/free/soulmate'), "입력 화면은 무료 천생연분 API를 호출해야 합니다.");
assert.ok(form.includes('router.push("/free/result")'), "계산 완료 후 결과 화면으로 이동해야 합니다.");

console.log("soulmate result contract: PASS");
