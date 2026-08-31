import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DAILY_QUOTES, getDailyQuoteIndex } from "../src/lib/daily-quotes.ts";

const pageSource = await readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../src/app/home-p5.module.css", import.meta.url), "utf8");

assert.equal(DAILY_QUOTES.length, 365, "오늘의 한마디는 365개여야 합니다.");
assert.equal(new Set(DAILY_QUOTES).size, 365, "오늘의 한마디는 날짜별로 중복되지 않아야 합니다.");
assert.equal(
  DAILY_QUOTES[0],
  "인연은 기다리는 사람이 아니라, 준비된 사람이 알아보는 거예요!",
  "기존 홈 문구를 라이브러리에 보존해야 합니다.",
);

assert.equal(getDailyQuoteIndex(new Date("2026-01-01T03:00:00Z")), 0);
assert.equal(getDailyQuoteIndex(new Date("2026-12-31T03:00:00Z")), 364);
assert.equal(
  getDailyQuoteIndex(new Date("2028-02-29T03:00:00Z")),
  getDailyQuoteIndex(new Date("2028-02-28T03:00:00Z")),
  "365일 라이브러리에서 윤일은 2월 28일 문구를 재사용해야 합니다.",
);

assert.ok(!pageSource.includes("관계 흐름 한눈에 보기"), "홈에서 관계 흐름 섹션을 제거해야 합니다.");
assert.ok(!pageSource.includes("<b>이벤트</b>"), "기능이 없는 이벤트 메뉴를 제거해야 합니다.");
assert.ok(pageSource.includes("getDailyQuote(new Date())"), "서울 날짜 기준 오늘의 문구를 렌더해야 합니다.");
assert.ok(styleSource.includes("grid-template-columns:repeat(3,1fr)"), "하단 메뉴는 3열이어야 합니다.");

console.log("home daily quote contract: PASS");
