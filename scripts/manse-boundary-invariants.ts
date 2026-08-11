import assert from "node:assert/strict";
import { calculateManseSnapshot } from "../src/lib/manseryeok/engine";
import type { PersonBirthInput } from "../src/lib/report-input";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

function input(date: string): PersonBirthInput {
  return {
    displayName: "boundary",
    gender: "male",
    calendarType: "solar",
    birthDate: date,
    birthTimeKnown: true,
    birthTime: "12:00",
    isLeapMonth: false,
  };
}

function dayGanji(date: string) {
  return calculateManseSnapshot(input(date)).pillars.day.korean;
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

console.log("\n날짜 경계 invariant: 4/4 통과");
