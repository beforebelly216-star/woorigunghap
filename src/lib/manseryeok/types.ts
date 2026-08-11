import type { CalendarType } from "@/lib/report-input";

export type MansePillar = {
  korean: string;
  hanja: string;
  heavenlyStem: string;
  earthlyBranch: string;
};

export type ManseBoundaryAssessment = {
  birthTimeKnown: boolean;
  dayLevelStable: boolean;
  yearPillarStable: boolean;
  monthPillarStable: boolean;
  notes: string[];
};

export type ManseCalculationSnapshot = {
  policyVersion: string;
  engineVersion: string;
  timezone: "Asia/Seoul";
  dayBoundary: "midnight";
  trueSolarTimeApplied: false;
  sourceCalendar: CalendarType;
  sourceDate: string;
  solarDate: string;
  pillars: {
    year: MansePillar | null;
    month: MansePillar | null;
    day: MansePillar;
    hour: MansePillar | null;
  };
  elements: {
    year: { stem: string; branch: string } | null;
    month: { stem: string; branch: string } | null;
    day: { stem: string; branch: string };
    hour: { stem: string; branch: string } | null;
  };
  yinYang: {
    year: { stem: string; branch: string } | null;
    month: { stem: string; branch: string } | null;
    day: { stem: string; branch: string };
    hour: { stem: string; branch: string } | null;
  };
  boundaryAssessment: ManseBoundaryAssessment;
};
