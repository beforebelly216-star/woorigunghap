import { calculateFourPillars } from "manseryeok";
import type { OneToOneReportInput, PersonBirthInput } from "@/lib/report-input";
import { MANSE_POLICY } from "@/lib/manseryeok/policy";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import {
  calculateLuckCycleEvidence,
  type LuckCyclePillarEvidence,
  type LuckCycleScenarioEvidence,
} from "@/lib/manseryeok/luck-cycle";

export const THREE_YEAR_TIMING_VERSION = "three-year-timing-evidence-v1" as const;

export type AnnualPillarEvidence = {
  year: number;
  korean: string;
  heavenlyStem: string;
  earthlyBranch: string;
};

export type YearLuckCandidate = {
  korean: string;
  heavenlyStem: string;
  earthlyBranch: string;
};

export type PersonYearLuckEvidence = {
  informationLevel: "A" | "B";
  candidates: YearLuckCandidate[];
  transitionWithinYear: boolean;
  scenarioCount: number;
};

export type ThreeYearTimingYearEvidence = {
  year: number;
  annualPillar: AnnualPillarEvidence;
  personA: PersonYearLuckEvidence;
  personB: PersonYearLuckEvidence;
};

export type ThreeYearTimingEvidence = {
  version: typeof THREE_YEAR_TIMING_VERSION;
  baseYear: number;
  years: ThreeYearTimingYearEvidence[];
};

function annualPillar(year: number): AnnualPillarEvidence {
  // 7월 1일은 입춘 경계에서 충분히 떨어져 있어 해당 Gregorian year의 세운 연주를 안정적으로 대표한다.
  const result = calculateFourPillars({
    year,
    month: 7,
    day: 1,
    hour: 12,
    minute: 0,
    dayBoundary: MANSE_POLICY.dayBoundary,
  });
  return {
    year,
    korean: result.yearString,
    heavenlyStem: result.year.heavenlyStem,
    earthlyBranch: result.year.earthlyBranch,
  };
}

function utcDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("양력 생년월일 형식은 YYYY-MM-DD여야 합니다.");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addOffset(base: Date, years: number, months: number, days: number) {
  const next = new Date(base.getTime());
  next.setUTCFullYear(next.getUTCFullYear() + years);
  next.setUTCMonth(next.getUTCMonth() + months);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function pillarStartDate(
  birthSolarDate: Date,
  scenario: LuckCycleScenarioEvidence,
  pillarIndex: number,
) {
  return addOffset(
    birthSolarDate,
    scenario.startYears + pillarIndex * 10,
    scenario.startMonths,
    scenario.startDays,
  );
}

function overlapsYear(start: Date, end: Date, year: number) {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextYear = new Date(Date.UTC(year + 1, 0, 1));
  return start < nextYear && end > yearStart;
}

function scenarioPillarsForYear(
  birthSolarDate: Date,
  scenario: LuckCycleScenarioEvidence,
  year: number,
) {
  const active: LuckCyclePillarEvidence[] = [];
  scenario.pillars.forEach((pillar, index) => {
    const start = pillarStartDate(birthSolarDate, scenario, index);
    const end = index + 1 < scenario.pillars.length
      ? pillarStartDate(birthSolarDate, scenario, index + 1)
      : addOffset(start, 10, 0, 0);
    if (overlapsYear(start, end, year)) active.push(pillar);
  });
  return active;
}

function dedupeCandidates(pillars: LuckCyclePillarEvidence[]) {
  const seen = new Set<string>();
  const result: YearLuckCandidate[] = [];
  for (const pillar of pillars) {
    const key = `${pillar.heavenlyStem}-${pillar.earthlyBranch}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      korean: pillar.korean,
      heavenlyStem: pillar.heavenlyStem,
      earthlyBranch: pillar.earthlyBranch,
    });
  }
  return result;
}

function personLuckForYear(person: PersonBirthInput, year: number): PersonYearLuckEvidence {
  const luck = calculateLuckCycleEvidence(person);
  const birthSolarDate = utcDate(calculateManseSnapshot(person).solarDate);
  const activeByScenario = luck.scenarios.map((scenario) => scenarioPillarsForYear(birthSolarDate, scenario, year));
  const allCandidates = dedupeCandidates(activeByScenario.flat());
  const transitionWithinYear = activeByScenario.some((pillars) => pillars.length > 1) || allCandidates.length > 1;

  return {
    informationLevel: luck.informationLevel,
    candidates: allCandidates,
    transitionWithinYear,
    scenarioCount: luck.scenarioCount,
  };
}

export function buildThreeYearTimingEvidence(
  input: Pick<OneToOneReportInput, "personA" | "personB">,
  baseYear: number,
): ThreeYearTimingEvidence {
  if (!Number.isInteger(baseYear) || baseYear < 1800 || baseYear > 2298) {
    throw new RangeError("3년 타이밍 기준연도는 1800~2298의 정수여야 합니다.");
  }

  const years = [baseYear, baseYear + 1, baseYear + 2].map((year) => ({
    year,
    annualPillar: annualPillar(year),
    personA: personLuckForYear(input.personA, year),
    personB: personLuckForYear(input.personB, year),
  }));

  return {
    version: THREE_YEAR_TIMING_VERSION,
    baseYear,
    years,
  };
}
