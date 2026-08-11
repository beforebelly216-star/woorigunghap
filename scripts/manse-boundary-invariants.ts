import assert from "node:assert/strict";
import { calculateManseSnapshot } from "../src/lib/manseryeok/engine";
import type { PersonBirthInput } from "../src/lib/report-input";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

function input(date: string, time = "12:00"): PersonBirthInput {
  return {
    displayName: "boundary",
    gender: "male",
    calendarType: "solar",
    birthDate: date,
    birthTimeKnown: true,
    birthTime: time,
    isLeapMonth: false,
  };
}

function snapshot(date: string, time = "12:00") {
  return calculateManseSnapshot(input(date, time));
}

function dayGanji(date: string) {
  return snapshot(date).pillars.day.korean;
}

function sexagenaryIndex(ganji: string) {
  const stem = STEMS.indexOf(ganji[0] as (typeof STEMS)[number]);
  const branch = BRANCHES.indexOf(ganji[1] as (typeof BRANCHES)[number]);
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stem && i % 12 === branch) return i;
  }
  throw new Error(`60갑자 인덱스를 찾지 못했습니다: ${ganji}`);
}

function assertNextDay(previous: string, next: string, label: string) {
  const previousIndex = sexagenaryIndex(dayGanji(previous));
  const nextIndex = sexagenaryIndex(dayGanji(next));
  assert.equal(nextIndex, (previousIndex + 1) % 60, `${label}: 일진이 하루 순서대로 증가하지 않습니다.`);
  console.log(`✓ ${label}: ${previous} ${dayGanji(previous)} → ${next} ${dayGanji(next)}`);
}

// 윤년 2월 29일이 날짜 파싱/일진 연속성을 깨지 않는지 확인.
assertNextDay("2024-02-28", "2024-02-29", "윤년 2/28→2/29");
assertNextDay("2024-02-29", "2024-03-01", "윤년 2/29→3/1");

// 일반 월말 및 연말 경계를 검증.
assertNextDay("2024-01-31", "2024-02-01", "월말 1/31→2/1");
assertNextDay("2023-12-31", "2024-01-01", "연말 12/31→1/1");

// KASI 월력요항 2024: 입춘 2/4 17:27, 경칩 3/5 11:23 (KST).
// 절입 분단위 직전/직후에 연주·월주가 정확히 전환되는지 고정한다.
const beforeIpchun = snapshot("2024-02-04", "17:26");
assert.equal(beforeIpchun.pillars.year?.korean, "계묘", "입춘 1분 전 연주는 계묘여야 합니다.");
assert.equal(beforeIpchun.pillars.month?.korean, "을축", "입춘 1분 전 월주는 을축이어야 합니다.");
console.log("✓ 입춘 1분 전: 계묘년 을축월");

const afterIpchun = snapshot("2024-02-04", "17:28");
assert.equal(afterIpchun.pillars.year?.korean, "갑진", "입춘 1분 후 연주는 갑진이어야 합니다.");
assert.equal(afterIpchun.pillars.month?.korean, "병인", "입춘 1분 후 월주는 병인이어야 합니다.");
console.log("✓ 입춘 1분 후: 갑진년 병인월");

const beforeGyeongchip = snapshot("2024-03-05", "11:22");
assert.equal(beforeGyeongchip.pillars.year?.korean, "갑진", "경칩 전 연주는 갑진이어야 합니다.");
assert.equal(beforeGyeongchip.pillars.month?.korean, "병인", "경칩 1분 전 월주는 병인이어야 합니다.");
console.log("✓ 경칩 1분 전: 갑진년 병인월");

const afterGyeongchip = snapshot("2024-03-05", "11:24");
assert.equal(afterGyeongchip.pillars.year?.korean, "갑진", "경칩 후 연주는 갑진이어야 합니다.");
assert.equal(afterGyeongchip.pillars.month?.korean, "정묘", "경칩 1분 후 월주는 정묘여야 합니다.");
console.log("✓ 경칩 1분 후: 갑진년 정묘월");

console.log("\n날짜·절입 경계 invariant: 8/8 통과");
