import { getSolarTermsOfYear } from "manseryeok";
import type { PersonBirthInput } from "@/lib/report-input";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import type {
  ManseCalculationSnapshot,
  MansePillar,
} from "@/lib/manseryeok/types";
import type {
  FiveElement,
  HiddenStemEvidence,
  MonthCommandEvidence,
  PillarPosition,
  UsefulGodPreparationEvidence,
} from "./types";

const USEFUL_GOD_PREPARATION_VERSION = "useful-god-prep-v1";
const KST_OFFSET = "+09:00";
const DAY_MS = 24 * 60 * 60 * 1000;

type HiddenStemSpec = Omit<HiddenStemEvidence, "element">;

const STEM_ELEMENT: Record<string, FiveElement> = {
  갑: "wood",
  을: "wood",
  병: "fire",
  정: "fire",
  무: "earth",
  기: "earth",
  경: "metal",
  신: "metal",
  임: "water",
  계: "water",
};

const BRANCH_ELEMENT: Record<string, FiveElement> = {
  자: "water",
  축: "earth",
  인: "wood",
  묘: "wood",
  진: "earth",
  사: "fire",
  오: "fire",
  미: "earth",
  신: "metal",
  유: "metal",
  술: "earth",
  해: "water",
};

const HIDDEN_STEMS: Record<string, HiddenStemSpec[]> = {
  자: [
    { stem: "임", role: "RESIDUAL" },
    { stem: "계", role: "MAIN" },
  ],
  축: [
    { stem: "계", role: "RESIDUAL" },
    { stem: "신", role: "MIDDLE" },
    { stem: "기", role: "MAIN" },
  ],
  인: [
    { stem: "무", role: "RESIDUAL" },
    { stem: "병", role: "MIDDLE" },
    { stem: "갑", role: "MAIN" },
  ],
  묘: [
    { stem: "갑", role: "RESIDUAL" },
    { stem: "을", role: "MAIN" },
  ],
  진: [
    { stem: "을", role: "RESIDUAL" },
    { stem: "계", role: "MIDDLE" },
    { stem: "무", role: "MAIN" },
  ],
  사: [
    { stem: "무", role: "RESIDUAL" },
    { stem: "경", role: "MIDDLE" },
    { stem: "병", role: "MAIN" },
  ],
  오: [
    { stem: "병", role: "RESIDUAL" },
    { stem: "기", role: "MIDDLE" },
    { stem: "정", role: "MAIN" },
  ],
  미: [
    { stem: "정", role: "RESIDUAL" },
    { stem: "을", role: "MIDDLE" },
    { stem: "기", role: "MAIN" },
  ],
  신: [
    { stem: "무", role: "RESIDUAL" },
    { stem: "임", role: "MIDDLE" },
    { stem: "경", role: "MAIN" },
  ],
  유: [
    { stem: "경", role: "RESIDUAL" },
    { stem: "신", role: "MAIN" },
  ],
  술: [
    { stem: "신", role: "RESIDUAL" },
    { stem: "정", role: "MIDDLE" },
    { stem: "무", role: "MAIN" },
  ],
  해: [
    { stem: "무", role: "RESIDUAL" },
    { stem: "갑", role: "MIDDLE" },
    { stem: "임", role: "MAIN" },
  ],
};

const MONTH_BRANCH_BY_JEOL_INDEX: Record<number, string> = {
  0: "축",
  2: "인",
  4: "묘",
  6: "진",
  8: "사",
  10: "오",
  12: "미",
  14: "신",
  16: "유",
  18: "술",
  20: "해",
  22: "자",
};

const MONTH_COMMAND_DAYS: Record<
  string,
  Array<{ stem: string; role: HiddenStemEvidence["role"]; days: number }>
> = {
  자: [
    { stem: "임", role: "RESIDUAL", days: 10 },
    { stem: "계", role: "MAIN", days: 20 },
  ],
  축: [
    { stem: "계", role: "RESIDUAL", days: 9 },
    { stem: "신", role: "MIDDLE", days: 3 },
    { stem: "기", role: "MAIN", days: 18 },
  ],
  인: [
    { stem: "무", role: "RESIDUAL", days: 7 },
    { stem: "병", role: "MIDDLE", days: 7 },
    { stem: "갑", role: "MAIN", days: 16 },
  ],
  묘: [
    { stem: "갑", role: "RESIDUAL", days: 10 },
    { stem: "을", role: "MAIN", days: 20 },
  ],
  진: [
    { stem: "을", role: "RESIDUAL", days: 9 },
    { stem: "계", role: "MIDDLE", days: 3 },
    { stem: "무", role: "MAIN", days: 18 },
  ],
  사: [
    { stem: "무", role: "RESIDUAL", days: 7 },
    { stem: "경", role: "MIDDLE", days: 7 },
    { stem: "병", role: "MAIN", days: 16 },
  ],
  오: [
    { stem: "병", role: "RESIDUAL", days: 10 },
    { stem: "기", role: "MIDDLE", days: 9 },
    { stem: "정", role: "MAIN", days: 11 },
  ],
  미: [
    { stem: "정", role: "RESIDUAL", days: 9 },
    { stem: "을", role: "MIDDLE", days: 3 },
    { stem: "기", role: "MAIN", days: 18 },
  ],
  신: [
    { stem: "무", role: "RESIDUAL", days: 7 },
    { stem: "임", role: "MIDDLE", days: 7 },
    { stem: "경", role: "MAIN", days: 16 },
  ],
  유: [
    { stem: "경", role: "RESIDUAL", days: 10 },
    { stem: "신", role: "MAIN", days: 20 },
  ],
  술: [
    { stem: "신", role: "RESIDUAL", days: 9 },
    { stem: "정", role: "MIDDLE", days: 3 },
    { stem: "무", role: "MAIN", days: 18 },
  ],
  해: [
    { stem: "무", role: "RESIDUAL", days: 7 },
    { stem: "갑", role: "MIDDLE", days: 7 },
    { stem: "임", role: "MAIN", days: 16 },
  ],
};

const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];

function emptyElementCounts(): Record<FiveElement, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

function stemElement(stem: string): FiveElement {
  const element = STEM_ELEMENT[stem];
  if (!element) throw new RangeError(`지원하지 않는 천간입니다: ${stem}`);
  return element;
}

function branchElement(branch: string): FiveElement {
  const element = BRANCH_ELEMENT[branch];
  if (!element) throw new RangeError(`지원하지 않는 지지입니다: ${branch}`);
  return element;
}

function hiddenStems(branch: string): HiddenStemEvidence[] {
  const specs = HIDDEN_STEMS[branch];
  if (!specs) throw new RangeError(`지원하지 않는 지지입니다: ${branch}`);
  return specs.map((item) => ({ ...item, element: stemElement(item.stem) }));
}

function pillarEntries(snapshot: ManseCalculationSnapshot) {
  return POSITIONS.flatMap((position) => {
    const pillar = snapshot.pillars[position];
    return pillar ? [{ position, pillar }] : [];
  });
}

function parseSolarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`양력 날짜 형식이 올바르지 않습니다: ${value}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function kstInstantMs(date: string, time: string) {
  parseSolarDate(date);
  const instant = Date.parse(`${date}T${time}:00${KST_OFFSET}`);
  if (!Number.isFinite(instant)) {
    throw new RangeError(`KST 날짜/시간을 해석할 수 없습니다: ${date} ${time}`);
  }
  return instant;
}

function monthCommandAt(instantMs: number): MonthCommandEvidence {
  const year = new Date(instantMs).getUTCFullYear();
  const terms = [year - 1, year, year + 1]
    .flatMap((candidateYear) => getSolarTermsOfYear(candidateYear))
    .filter((term) => term.index % 2 === 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const boundary = [...terms]
    .reverse()
    .find((term) => term.date.getTime() <= instantMs);
  if (!boundary) {
    throw new Error("월령 사령 계산을 위한 직전 절입을 찾지 못했습니다.");
  }

  const branch = MONTH_BRANCH_BY_JEOL_INDEX[boundary.index];
  if (!branch) {
    throw new Error(`월지로 매핑할 수 없는 절기 인덱스입니다: ${boundary.index}`);
  }

  const rawDay = Math.floor((instantMs - boundary.date.getTime()) / DAY_MS) + 1;
  const allocationDay = Math.min(30, Math.max(1, rawDay));
  const schedule = MONTH_COMMAND_DAYS[branch];
  let cumulative = 0;
  let selected = schedule[schedule.length - 1];
  for (const segment of schedule) {
    cumulative += segment.days;
    if (allocationDay <= cumulative) {
      selected = segment;
      break;
    }
  }

  return {
    status: "STABLE",
    branch,
    jeolName: boundary.name,
    jeolInstantUtc: boundary.date.toISOString(),
    elapsedDay: rawDay,
    allocationDay,
    commanderStem: selected.stem,
    commanderElement: stemElement(selected.stem),
    commanderRole: selected.role,
  };
}

function monthCommandEvidence(
  person: PersonBirthInput,
  snapshot: ManseCalculationSnapshot,
): MonthCommandEvidence {
  if (!snapshot.pillars.month) {
    return {
      status: "MONTH_PILLAR_UNCERTAIN",
      branch: null,
      jeolName: null,
      jeolInstantUtc: null,
      elapsedDay: null,
      allocationDay: null,
      commanderStem: null,
      commanderElement: null,
      commanderRole: null,
    };
  }

  if (person.birthTimeKnown) {
    if (!person.birthTime) throw new RangeError("birthTimeKnown=true인데 birthTime이 없습니다.");
    return monthCommandAt(kstInstantMs(snapshot.solarDate, person.birthTime));
  }

  const start = monthCommandAt(kstInstantMs(snapshot.solarDate, "00:00"));
  const end = monthCommandAt(kstInstantMs(snapshot.solarDate, "23:59"));
  const stable =
    start.branch === end.branch &&
    start.commanderStem === end.commanderStem &&
    start.commanderRole === end.commanderRole;

  if (stable) {
    return { ...start, status: "TIME_UNKNOWN_STABLE" };
  }

  return {
    status: "TIME_UNKNOWN_UNCERTAIN",
    branch: snapshot.pillars.month.earthlyBranch,
    jeolName: start.jeolName === end.jeolName ? start.jeolName : null,
    jeolInstantUtc:
      start.jeolInstantUtc === end.jeolInstantUtc ? start.jeolInstantUtc : null,
    elapsedDay: null,
    allocationDay: null,
    commanderStem: null,
    commanderElement: null,
    commanderRole: null,
  };
}

function countVisibleStems(entries: Array<{ position: PillarPosition; pillar: MansePillar }>) {
  const counts = emptyElementCounts();
  for (const { pillar } of entries) counts[stemElement(pillar.heavenlyStem)] += 1;
  return counts;
}

function countBranchSurface(entries: Array<{ position: PillarPosition; pillar: MansePillar }>) {
  const counts = emptyElementCounts();
  for (const { pillar } of entries) counts[branchElement(pillar.earthlyBranch)] += 1;
  return counts;
}

function countHiddenStemOccurrences(
  entries: Array<{ position: PillarPosition; pillar: MansePillar }>,
) {
  const counts = emptyElementCounts();
  for (const { pillar } of entries) {
    for (const hidden of hiddenStems(pillar.earthlyBranch)) counts[hidden.element] += 1;
  }
  return counts;
}

export function buildUsefulGodPreparationEvidence(
  person: PersonBirthInput,
  snapshot: ManseCalculationSnapshot = calculateManseSnapshot(person),
): UsefulGodPreparationEvidence {
  const entries = pillarEntries(snapshot);
  const dayMasterStem = snapshot.pillars.day.heavenlyStem;
  const dayMasterElement = stemElement(dayMasterStem);

  const branchHiddenStems = entries.map(({ position, pillar }) => ({
    position,
    branch: pillar.earthlyBranch,
    branchElement: branchElement(pillar.earthlyBranch),
    hiddenStems: hiddenStems(pillar.earthlyBranch),
  }));

  const rootEvidence = branchHiddenStems.map((item) => ({
    position: item.position,
    branch: item.branch,
    containsExactDayMasterStem: item.hiddenStems.some(
      (hidden) => hidden.stem === dayMasterStem,
    ),
    containsDayMasterElement: item.hiddenStems.some(
      (hidden) => hidden.element === dayMasterElement,
    ),
  }));

  const primaryRootPositions: PillarPosition[] = ["month", "day", "hour"];
  const exactRootPositions = rootEvidence
    .filter((item) => item.containsExactDayMasterStem)
    .map((item) => item.position);
  const elementRootPositions = rootEvidence
    .filter((item) => item.containsDayMasterElement)
    .map((item) => item.position);
  const primaryElementRootPositions = elementRootPositions.filter((position) =>
    primaryRootPositions.includes(position),
  );

  return {
    version: USEFUL_GOD_PREPARATION_VERSION,
    status: "EVIDENCE_ONLY",
    scoringReady: false,
    pillarsUsed: entries.map((entry) => entry.position),
    dayMaster: {
      stem: dayMasterStem,
      element: dayMasterElement,
    },
    branchHiddenStems,
    rootEvidence: {
      byPillar: rootEvidence,
      exactRootPositions,
      elementRootPositions,
      primaryElementRootPositions,
      hasExactRoot: exactRootPositions.length > 0,
      hasElementRoot: elementRootPositions.length > 0,
      hasPrimaryElementRoot: primaryElementRootPositions.length > 0,
    },
    elementOccurrences: {
      visibleStems: countVisibleStems(entries),
      branchSurface: countBranchSurface(entries),
      hiddenStems: countHiddenStemOccurrences(entries),
    },
    monthCommand: monthCommandEvidence(person, snapshot),
    methodDecision: {
      selectedMethod: null,
      usefulElements: [],
      favorableElements: [],
      unfavorableElements: [],
      confidence: null,
      pendingApprovals: [
        "STRENGTH_WEIGHTING",
        "STRONG_WEAK_THRESHOLDS",
        "SPECIAL_STRUCTURE_THRESHOLDS",
        "CLIMATE_PRIORITY_THRESHOLDS",
        "MEDIATION_PRIORITY_THRESHOLDS",
        "USEFUL_FAVORABLE_UNFAVORABLE_MAPPING",
        "USEFUL_GOD_FIT_SCORE_MAPPING",
      ],
    },
  };
}
