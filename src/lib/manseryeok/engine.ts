import { calculateFourPillars, lunarToSolar } from "manseryeok";
import type { PersonBirthInput } from "@/lib/report-input";
import { MANSE_POLICY } from "@/lib/manseryeok/policy";
import type { ManseCalculationSnapshot, MansePillar } from "@/lib/manseryeok/types";

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("생년월일 형식은 YYYY-MM-DD여야 합니다.");
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function splitTime(value: string | null) {
  if (!value) throw new RangeError("출생시간이 필요합니다.");
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new RangeError("출생시간 형식은 HH:MM이어야 합니다.");
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function toPillar(
  pillar: { heavenlyStem: string; earthlyBranch: string },
  korean: string,
  hanja: string,
): MansePillar {
  return {
    korean,
    hanja,
    heavenlyStem: pillar.heavenlyStem,
    earthlyBranch: pillar.earthlyBranch,
  };
}

function calculateAt(person: PersonBirthInput, hour: number, minute: number) {
  const { year, month, day } = parseDate(person.birthDate);
  return calculateFourPillars({
    year,
    month,
    day,
    hour,
    minute,
    isLunar: person.calendarType === "lunar",
    isLeapMonth: person.calendarType === "lunar" ? person.isLeapMonth : false,
    dayBoundary: MANSE_POLICY.dayBoundary,
  });
}

function getSolarDate(person: PersonBirthInput) {
  const { year, month, day } = parseDate(person.birthDate);
  if (person.calendarType === "solar") return formatDate(year, month, day);
  const solar = lunarToSolar(year, month, day, person.isLeapMonth);
  return formatDate(solar.year, solar.month, solar.day);
}

export function calculateManseSnapshot(person: PersonBirthInput): ManseCalculationSnapshot {
  const notes: string[] = [];
  let selected;
  let yearStable = true;
  let monthStable = true;
  let dayStable = true;

  if (person.birthTimeKnown) {
    const { hour, minute } = splitTime(person.birthTime);
    selected = calculateAt(person, hour, minute);
  } else {
    // 시간 미상은 시주를 임의 확정하지 않는다. 같은 KST 날짜의 양 끝을 비교하여
    // 입춘/절입 경계 때문에 연주·월주가 달라질 가능성을 감지한다.
    const start = calculateAt(person, 0, 0);
    const end = calculateAt(person, 23, 59);
    selected = calculateAt(person, 12, 0);

    yearStable = start.yearString === end.yearString;
    monthStable = start.monthString === end.monthString;
    dayStable = start.dayString === end.dayString;

    if (!dayStable) {
      throw new Error("자정 일경계 정책에서 같은 날짜의 일주가 달라졌습니다. 계산 엔진을 점검해 주세요.");
    }
    if (!yearStable || !monthStable) {
      notes.push("출생시간 미상이며 입춘/절입 경계일 가능성이 있어 연주 또는 월주를 확정하지 않습니다.");
    }
    notes.push("출생시간 미상으로 시주는 계산 결과에서 제외합니다.");
  }

  const yearPillar = yearStable
    ? toPillar(selected.year, selected.yearString, selected.yearHanja)
    : null;
  const monthPillar = monthStable
    ? toPillar(selected.month, selected.monthString, selected.monthHanja)
    : null;
  const dayPillar = toPillar(selected.day, selected.dayString, selected.dayHanja);
  const hourPillar = person.birthTimeKnown
    ? toPillar(selected.hour, selected.hourString, selected.hourHanja)
    : null;

  return {
    policyVersion: MANSE_POLICY.version,
    engineVersion: MANSE_POLICY.engineVersion,
    timezone: MANSE_POLICY.timezone,
    dayBoundary: MANSE_POLICY.dayBoundary,
    trueSolarTimeApplied: MANSE_POLICY.trueSolarTimeApplied,
    sourceCalendar: person.calendarType,
    sourceDate: person.birthDate,
    solarDate: getSolarDate(person),
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    elements: {
      year: yearStable ? selected.yearElement : null,
      month: monthStable ? selected.monthElement : null,
      day: selected.dayElement,
      hour: person.birthTimeKnown ? selected.hourElement : null,
    },
    yinYang: {
      year: yearStable ? selected.yearYinYang : null,
      month: monthStable ? selected.monthYinYang : null,
      day: selected.dayYinYang,
      hour: person.birthTimeKnown ? selected.hourYinYang : null,
    },
    boundaryAssessment: {
      birthTimeKnown: person.birthTimeKnown,
      dayLevelStable: yearStable && monthStable && dayStable,
      yearPillarStable: yearStable,
      monthPillarStable: monthStable,
      notes,
    },
  };
}
