import { calculateFourPillars } from "manseryeok";
import type { PersonBirthInput } from "@/lib/report-input";
import { MANSE_POLICY } from "@/lib/manseryeok/policy";

export const UNKNOWN_TIME_LUCK_SCENARIOS = [
  "00:30", "02:30", "04:30", "06:30", "08:30", "10:30",
  "12:30", "14:30", "16:30", "18:30", "20:30", "22:30",
] as const;

export type LuckCyclePillarEvidence = {
  age: number;
  korean: string;
  heavenlyStem: string;
  earthlyBranch: string;
};

export type LuckCycleScenarioEvidence = {
  time: string;
  forward: boolean;
  startAge: number;
  startYears: number;
  startMonths: number;
  startDays: number;
  pillars: LuckCyclePillarEvidence[];
};

export type LuckCycleEvidence = {
  version: "luck-cycle-evidence-v1";
  informationLevel: "A" | "B";
  scenarioCount: number;
  forwardStable: boolean;
  pillarSequenceStable: boolean;
  startAgeRange: { min: number; max: number };
  startOffsetRangeMonths: { min: number; max: number };
  representative: LuckCycleScenarioEvidence;
  scenarios: LuckCycleScenarioEvidence[];
};

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("생년월일 형식은 YYYY-MM-DD여야 합니다.");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new RangeError("출생시간 형식은 HH:MM이어야 합니다.");
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function calculateScenario(person: PersonBirthInput, time: string): LuckCycleScenarioEvidence {
  const { year, month, day } = parseDate(person.birthDate);
  const { hour, minute } = parseTime(time);
  const result = calculateFourPillars({
    year,
    month,
    day,
    hour,
    minute,
    isLunar: person.calendarType === "lunar",
    isLeapMonth: person.calendarType === "lunar" ? person.isLeapMonth : false,
    dayBoundary: MANSE_POLICY.dayBoundary,
    gender: person.gender,
  });

  if (!result.luckPillars) {
    throw new Error("대운 계산 결과가 없습니다. 성별 및 만세력 엔진 설정을 확인해 주세요.");
  }

  return {
    time,
    forward: result.luckPillars.forward,
    startAge: result.luckPillars.startAge,
    startYears: result.luckPillars.startYears,
    startMonths: result.luckPillars.startMonths,
    startDays: result.luckPillars.startDays,
    pillars: result.luckPillars.pillars.map((item) => ({
      age: item.age,
      korean: item.korean,
      heavenlyStem: item.pillar.heavenlyStem,
      earthlyBranch: item.pillar.earthlyBranch,
    })),
  };
}

function offsetMonths(scenario: LuckCycleScenarioEvidence) {
  return scenario.startYears * 12 + scenario.startMonths + scenario.startDays / 30;
}

function samePillarSequence(a: LuckCycleScenarioEvidence, b: LuckCycleScenarioEvidence) {
  if (a.pillars.length !== b.pillars.length) return false;
  return a.pillars.every((pillar, index) => {
    const other = b.pillars[index];
    return !!other
      && pillar.age === other.age
      && pillar.heavenlyStem === other.heavenlyStem
      && pillar.earthlyBranch === other.earthlyBranch;
  });
}

export function calculateLuckCycleEvidence(person: PersonBirthInput): LuckCycleEvidence {
  const informationLevel = person.birthTimeKnown ? "A" : "B";
  const times = person.birthTimeKnown
    ? [person.birthTime ?? ""]
    : [...UNKNOWN_TIME_LUCK_SCENARIOS];

  const scenarios = times.map((time) => calculateScenario(person, time));
  const representative = person.birthTimeKnown
    ? scenarios[0]
    : scenarios[Math.floor(scenarios.length / 2)];

  if (!representative) throw new Error("대운 대표 시나리오를 만들지 못했습니다.");

  const startAges = scenarios.map((scenario) => scenario.startAge);
  const startOffsets = scenarios.map(offsetMonths);
  const forwardStable = scenarios.every((scenario) => scenario.forward === representative.forward);
  const pillarSequenceStable = scenarios.every((scenario) => samePillarSequence(scenario, representative));

  return {
    version: "luck-cycle-evidence-v1",
    informationLevel,
    scenarioCount: scenarios.length,
    forwardStable,
    pillarSequenceStable,
    startAgeRange: {
      min: Math.min(...startAges),
      max: Math.max(...startAges),
    },
    startOffsetRangeMonths: {
      min: Math.round(Math.min(...startOffsets) * 10) / 10,
      max: Math.round(Math.max(...startOffsets) * 10) / 10,
    },
    representative,
    scenarios,
  };
}
