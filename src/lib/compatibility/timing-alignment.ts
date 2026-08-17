import type { OneToOneReportInput } from "@/lib/report-input";
import { prepareCompatibilityPerson, type PreparedCompatibilityPerson } from "./simple-dimensions";
import {
  buildThreeYearTimingEvidence,
  type PersonYearLuckEvidence,
  type ThreeYearTimingEvidence,
  type YearLuckCandidate,
} from "./three-year-timing";

export const THREE_YEAR_TIMING_ALIGNMENT_VERSION = "three-year-timing-alignment-v1" as const;

export type TimingPhase = "rising" | "adjusting" | "caution";
export type TimingConfidence = "high" | "medium" | "low";

export type ThreeYearTimingAssessmentYear = {
  year: number;
  annualPillar: string;
  score: number;
  scoreRange: { min: number; max: number };
  phase: TimingPhase;
  confidence: TimingConfidence;
  signals: string[];
};

export type ThreeYearTimingAssessment = {
  version: typeof THREE_YEAR_TIMING_ALIGNMENT_VERSION;
  evidenceVersion: ThreeYearTimingEvidence["version"];
  baseYear: number;
  normalizedScore: number;
  scoreRange: { min: number; max: number };
  confidence: TimingConfidence;
  years: ThreeYearTimingAssessmentYear[];
};

const STEM_ELEMENT = {
  갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth",
  기: "earth", 경: "metal", 신: "metal", 임: "water", 계: "water",
} as const;

type FiveElement = (typeof STEM_ELEMENT)[keyof typeof STEM_ELEMENT];

const BRANCH_ORDER = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_HARMONY = new Set(["자-축", "인-해", "묘-술", "진-유", "사-신", "오-미"]);
const BRANCH_CLASH = new Set(["자-오", "축-미", "인-신", "묘-유", "진-술", "사-해"]);
const BRANCH_HARM = new Set(["자-미", "축-오", "인-사", "묘-진", "신-해", "유-술"]);
const BRANCH_PUNISHMENT = new Set([
  "자-묘",
  "인-사", "사-신", "인-신",
  "축-술", "미-술", "축-미",
  "진-진", "오-오", "유-유", "해-해",
]);
const BRANCH_BREAK = new Set(["자-유", "축-진", "인-해", "묘-오", "사-신", "미-술"]);

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function orderedBranchPair(a: string, b: string) {
  const ai = BRANCH_ORDER.indexOf(a);
  const bi = BRANCH_ORDER.indexOf(b);
  if (ai < 0 || bi < 0) return `${a}-${b}`;
  return ai <= bi ? `${a}-${b}` : `${b}-${a}`;
}

function elementDelta(person: PreparedCompatibilityPerson, stem: string) {
  const element = STEM_ELEMENT[stem as keyof typeof STEM_ELEMENT] as FiveElement | undefined;
  if (!element) return 0;
  if (person.usefulElements.includes(element)) return 7;
  if (person.favorableElements.includes(element)) return 4;
  if (person.unfavorableElements.includes(element)) return -6;
  return 0;
}

function branchDelta(person: PreparedCompatibilityPerson, branch: string) {
  const dayBranch = person.snapshot.pillars.day.earthlyBranch;
  const key = orderedBranchPair(dayBranch, branch);
  if (BRANCH_CLASH.has(key)) return -8;
  if (BRANCH_HARM.has(key)) return -5;
  if (BRANCH_PUNISHMENT.has(key)) return -5;
  if (BRANCH_BREAK.has(key)) return -3;
  if (BRANCH_HARMONY.has(key)) return 7;
  return 0;
}

function transitDelta(person: PreparedCompatibilityPerson, stem: string, branch: string) {
  return elementDelta(person, stem) + branchDelta(person, branch);
}

function candidateDelta(person: PreparedCompatibilityPerson, candidate: YearLuckCandidate) {
  return round1(transitDelta(person, candidate.heavenlyStem, candidate.earthlyBranch) * 0.7);
}

function personYearDeltas(
  person: PreparedCompatibilityPerson,
  annualStem: string,
  annualBranch: string,
  luck: PersonYearLuckEvidence,
) {
  const annual = transitDelta(person, annualStem, annualBranch);
  const candidates = luck.candidates.length
    ? luck.candidates.map((candidate) => annual + candidateDelta(person, candidate))
    : [annual];
  return candidates.map(round1);
}

function synchronizationDelta(a: number, b: number) {
  if (a >= 5 && b >= 5) return 3;
  if (a <= -5 && b <= -5) return -3;
  if ((a >= 5 && b <= -5) || (a <= -5 && b >= 5)) return -2;
  return 0;
}

function phaseFor(score: number): TimingPhase {
  if (score >= 76) return "rising";
  if (score <= 62) return "caution";
  return "adjusting";
}

function confidenceFor(
  width: number,
  a: PersonYearLuckEvidence,
  b: PersonYearLuckEvidence,
): TimingConfidence {
  if (width >= 10) return "low";
  if (
    width >= 5
    || a.informationLevel === "B"
    || b.informationLevel === "B"
    || a.transitionWithinYear
    || b.transitionWithinYear
  ) return "medium";
  return "high";
}

function overallConfidence(years: ThreeYearTimingAssessmentYear[]): TimingConfidence {
  if (years.some((year) => year.confidence === "low")) return "low";
  if (years.some((year) => year.confidence === "medium")) return "medium";
  return "high";
}

function buildSignals(
  aDeltas: number[],
  bDeltas: number[],
  aLuck: PersonYearLuckEvidence,
  bLuck: PersonYearLuckEvidence,
  rangeWidth: number,
) {
  const a = median(aDeltas);
  const b = median(bDeltas);
  const signals: string[] = [];

  if (a >= 5 && b >= 5) signals.push("두 사람 모두 현재 대운·세운 조합에서 관계에 여유를 쓰기 쉬운 편입니다.");
  else if (a <= -5 && b <= -5) signals.push("두 사람 모두 현재 대운·세운 조합에서 예민함이 겹치기 쉬워 속도 조절이 중요합니다.");
  else if ((a >= 5 && b <= -5) || (a <= -5 && b >= 5)) signals.push("한 사람은 확장하려 하고 다른 사람은 부담을 느끼기 쉬워 관계 속도 차이가 커질 수 있습니다.");
  else signals.push("한쪽으로 강하게 치우치기보다 기존 관계 패턴을 어떻게 운영하느냐가 더 중요한 해입니다.");

  if (a >= 7) signals.push("나 쪽에는 보완적으로 작용하는 기운이 상대적으로 강합니다.");
  if (b >= 7) signals.push("상대 쪽에는 보완적으로 작용하는 기운이 상대적으로 강합니다.");
  if (a <= -7) signals.push("나 쪽에는 부담 신호가 겹쳐 반응을 서두르지 않는 편이 좋습니다.");
  if (b <= -7) signals.push("상대 쪽에는 부담 신호가 겹쳐 반응을 서두르지 않는 편이 좋습니다.");

  if (aLuck.transitionWithinYear || bLuck.transitionWithinYear) {
    signals.push("해당 연도 안에 대운 전환 후보가 있어 상반기와 하반기의 체감이 달라질 수 있습니다.");
  }
  if (rangeWidth >= 5 || aLuck.informationLevel === "B" || bLuck.informationLevel === "B") {
    signals.push("출생시간 미상 시나리오를 함께 반영한 범위값이므로 단일 점수보다 범위를 우선해서 보세요.");
  }

  return signals.slice(0, 4);
}

export function calculateThreeYearTimingAlignment(
  input: Pick<OneToOneReportInput, "personA" | "personB">,
  baseYear: number,
): ThreeYearTimingAssessment {
  const evidence = buildThreeYearTimingEvidence(input, baseYear);
  const preparedA = prepareCompatibilityPerson(input.personA);
  const preparedB = prepareCompatibilityPerson(input.personB);

  const years = evidence.years.map((year): ThreeYearTimingAssessmentYear => {
    const aDeltas = personYearDeltas(
      preparedA,
      year.annualPillar.heavenlyStem,
      year.annualPillar.earthlyBranch,
      year.personA,
    );
    const bDeltas = personYearDeltas(
      preparedB,
      year.annualPillar.heavenlyStem,
      year.annualPillar.earthlyBranch,
      year.personB,
    );

    const pairScores: number[] = [];
    for (const a of aDeltas) {
      for (const b of bDeltas) {
        pairScores.push(round1(clamp(70 + (a + b) / 2 + synchronizationDelta(a, b), 45, 92)));
      }
    }

    const score = round1(median(pairScores));
    const min = round1(Math.min(...pairScores));
    const max = round1(Math.max(...pairScores));
    const width = max - min;

    return {
      year: year.year,
      annualPillar: year.annualPillar.korean,
      score,
      scoreRange: { min, max },
      phase: phaseFor(score),
      confidence: confidenceFor(width, year.personA, year.personB),
      signals: buildSignals(aDeltas, bDeltas, year.personA, year.personB, width),
    };
  });

  const normalizedScore = round1(years.reduce((sum, year) => sum + year.score, 0) / years.length);
  const min = round1(years.reduce((sum, year) => sum + year.scoreRange.min, 0) / years.length);
  const max = round1(years.reduce((sum, year) => sum + year.scoreRange.max, 0) / years.length);

  return {
    version: THREE_YEAR_TIMING_ALIGNMENT_VERSION,
    evidenceVersion: evidence.version,
    baseYear,
    normalizedScore,
    scoreRange: { min, max },
    confidence: overallConfidence(years),
    years,
  };
}
