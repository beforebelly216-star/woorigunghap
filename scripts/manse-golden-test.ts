import assert from "node:assert/strict";
import { calculateManseSnapshot } from "../src/lib/manseryeok/engine";
import type { PersonBirthInput } from "../src/lib/report-input";

function person(
  birthDate: string,
  birthTime: string | null,
  options: Partial<PersonBirthInput> = {},
): PersonBirthInput {
  return {
    displayName: "golden",
    gender: "male",
    calendarType: "solar",
    birthDate,
    birthTimeKnown: birthTime !== null,
    birthTime,
    isLeapMonth: false,
    ...options,
  };
}

function pillars(input: PersonBirthInput) {
  const snapshot = calculateManseSnapshot(input);
  return [
    snapshot.pillars.year?.korean ?? null,
    snapshot.pillars.month?.korean ?? null,
    snapshot.pillars.day.korean,
    snapshot.pillars.hour?.korean ?? null,
  ];
}

type Case = { name: string; run: () => void };
const cases: Case[] = [];
function test(name: string, run: () => void) {
  cases.push({ name, run });
}

// 1~14. upstream manseryeok의 KASI 표준 골든/핵심 정확도 케이스를
// 우리 서버 어댑터가 그대로 보존하는지 검증한다.
const fullPillarCases: Array<{
  date: string;
  time: string;
  expected: [string, string, string, string];
}> = [
  { date: "1936-08-25", time: "07:30", expected: ["병자", "병신", "기묘", "무진"] },
  { date: "1948-05-01", time: "12:00", expected: ["무자", "병진", "병술", "갑오"] },
  { date: "1960-03-15", time: "10:00", expected: ["경자", "기묘", "임인", "을사"] },
  { date: "1975-07-07", time: "14:00", expected: ["을묘", "임오", "갑인", "신미"] },
  { date: "1984-06-15", time: "09:00", expected: ["갑자", "경오", "경진", "신사"] },
  { date: "1988-09-20", time: "16:00", expected: ["무진", "신유", "무인", "경신"] },
  { date: "1992-10-24", time: "05:30", expected: ["임신", "경술", "계유", "을묘"] },
  { date: "1995-11-11", time: "11:11", expected: ["을해", "정해", "병오", "갑오"] },
  { date: "2000-06-10", time: "08:30", expected: ["경진", "임오", "기해", "무진"] },
  { date: "2010-12-05", time: "18:00", expected: ["경인", "정해", "기축", "계유"] },
  { date: "2020-04-20", time: "13:00", expected: ["경자", "경진", "계사", "기미"] },
  { date: "1990-08-17", time: "11:38", expected: ["경오", "갑신", "갑인", "경오"] },
  { date: "1990-05-15", time: "14:30", expected: ["경오", "신사", "경진", "계미"] },
  { date: "1999-10-20", time: "10:25", expected: ["기묘", "갑술", "을사", "신사"] },
];

for (const c of fullPillarCases) {
  test(`표준 명식 ${c.date} ${c.time}`, () => {
    assert.deepEqual(pillars(person(c.date, c.time)), c.expected);
  });
}

// 15~16. 음력 입력 전체 명식.
test("음력 2006-08-20 06:38", () => {
  assert.deepEqual(
    pillars(person("2006-08-20", "06:38", { calendarType: "lunar" })),
    ["병술", "무술", "계유", "을묘"],
  );
});

test("음력 2000-12-12 03:38", () => {
  assert.deepEqual(
    pillars(person("2000-12-12", "03:38", { calendarType: "lunar" })),
    ["경진", "기축", "기사", "병인"],
  );
});

// 17~19. 입춘 연주 경계.
test("2024-01-14는 입춘 전 계묘년", () => {
  assert.equal(calculateManseSnapshot(person("2024-01-14", "22:30")).pillars.year?.korean, "계묘");
});

test("2024-02-10은 입춘 후 갑진년", () => {
  assert.equal(calculateManseSnapshot(person("2024-02-10", "12:00")).pillars.year?.korean, "갑진");
});

test("2000-01-01은 입춘 전 기묘년", () => {
  assert.equal(calculateManseSnapshot(person("2000-01-01", "00:00")).pillars.year?.korean, "기묘");
});

// 20~24. 한국 음력·윤달 변환. 중국 음력과 날짜가 달라질 수 있는 케이스도 포함한다.
const lunarConversionCases: Array<{
  lunar: string;
  leap?: boolean;
  solar: string;
}> = [
  { lunar: "1992-09-29", solar: "1992-10-24" },
  { lunar: "2020-04-01", leap: true, solar: "2020-05-23" },
  { lunar: "1997-01-01", solar: "1997-02-08" },
  { lunar: "2023-04-01", solar: "2023-05-20" },
  { lunar: "1933-06-01", solar: "1933-07-23" },
];

for (const c of lunarConversionCases) {
  test(`음력 변환 ${c.lunar}${c.leap ? " 윤달" : ""} → ${c.solar}`, () => {
    const snapshot = calculateManseSnapshot(
      person(c.lunar, "12:00", {
        calendarType: "lunar",
        isLeapMonth: c.leap ?? false,
      }),
    );
    assert.equal(snapshot.solarDate, c.solar);
  });
}

// 25~27. 출생시간 미상 정책.
test("시간 미상 일반일은 연주·월주 유지, 시주 제외", () => {
  const snapshot = calculateManseSnapshot(person("1992-10-24", null));
  assert.equal(snapshot.pillars.year?.korean, "임신");
  assert.equal(snapshot.pillars.month?.korean, "경술");
  assert.equal(snapshot.pillars.day.korean, "계유");
  assert.equal(snapshot.pillars.hour, null);
  assert.equal(snapshot.boundaryAssessment.yearPillarStable, true);
  assert.equal(snapshot.boundaryAssessment.monthPillarStable, true);
});

test("시간 미상 2024 입춘 당일은 연주·월주를 확정하지 않음", () => {
  const snapshot = calculateManseSnapshot(person("2024-02-04", null));
  assert.equal(snapshot.pillars.year, null);
  assert.equal(snapshot.pillars.month, null);
  assert.equal(snapshot.pillars.hour, null);
  assert.equal(snapshot.boundaryAssessment.yearPillarStable, false);
  assert.equal(snapshot.boundaryAssessment.monthPillarStable, false);
});

test("시간 미상 절입 당일은 연주는 유지하고 월주는 경계 처리", () => {
  const snapshot = calculateManseSnapshot(person("2024-03-05", null));
  assert.notEqual(snapshot.pillars.year, null);
  assert.equal(snapshot.pillars.month, null);
  assert.equal(snapshot.pillars.hour, null);
  assert.equal(snapshot.boundaryAssessment.yearPillarStable, true);
  assert.equal(snapshot.boundaryAssessment.monthPillarStable, false);
});

// 28~30. 시진 경계. MVP는 midnight dayBoundary이며 23시는 자시지만 다음 일주로 넘기지 않는다.
test("23:30은 자시", () => {
  assert.equal(calculateManseSnapshot(person("2024-03-10", "23:30")).pillars.hour?.earthlyBranch, "자");
});

test("00:30은 자시", () => {
  assert.equal(calculateManseSnapshot(person("2024-03-10", "00:30")).pillars.hour?.earthlyBranch, "자");
});

test("02:30은 축시", () => {
  assert.equal(calculateManseSnapshot(person("2024-03-10", "02:30")).pillars.hour?.earthlyBranch, "축");
});

assert.equal(cases.length, 30, `골든 테스트는 정확히 30개여야 합니다. 현재 ${cases.length}개`);

let passed = 0;
const failures: Array<{ name: string; error: unknown }> = [];
for (const c of cases) {
  try {
    c.run();
    passed++;
    console.log(`✓ ${String(passed).padStart(2, "0")}/30 ${c.name}`);
  } catch (error) {
    failures.push({ name: c.name, error });
    console.error(`✗ ${c.name}`);
    console.error(error);
  }
}

console.log(`\n만세력 골든 테스트: ${passed}/30 통과`);
if (failures.length > 0) {
  console.error(`실패 ${failures.length}개`);
  process.exitCode = 1;
}
