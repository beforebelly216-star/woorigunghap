import type {
  CompatibilityProfile,
  DayBranchCompatibilityScore,
  DayBranchEvidenceRelation,
  DayBranchPrimaryRelation,
} from "./types";
import { getCompatibilityDimensionWeight } from "./weights";

const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
type CanonicalBranch = (typeof BRANCHES)[number];

const BRANCH_ALIASES: Record<string, CanonicalBranch> = {
  子: "子", 자: "子",
  丑: "丑", 축: "丑",
  寅: "寅", 인: "寅",
  卯: "卯", 묘: "卯",
  辰: "辰", 진: "辰",
  巳: "巳", 사: "巳",
  午: "午", 오: "午",
  未: "未", 미: "未",
  申: "申", 신: "申",
  酉: "酉", 유: "酉",
  戌: "戌", 술: "戌",
  亥: "亥", 해: "亥",
};

const SIX_HARMONY = new Set(["子-丑", "寅-亥", "卯-戌", "辰-酉", "巳-申", "午-未"]);
const CLASH = new Set(["子-午", "丑-未", "寅-申", "卯-酉", "辰-戌", "巳-亥"]);
const HARM = new Set(["子-未", "丑-午", "寅-巳", "卯-辰", "申-亥", "酉-戌"]);
const PUNISHMENT = new Set([
  "子-卯",
  "寅-巳", "巳-申", "寅-申",
  "丑-戌", "未-戌", "丑-未",
  "辰-辰", "午-午", "酉-酉", "亥-亥",
]);

const RELATION_PRECEDENCE: DayBranchEvidenceRelation[] = [
  "CLASH",
  "SIX_HARMONY",
  "PUNISHMENT",
  "HARM",
];

const NORMALIZED_SCORE: Record<DayBranchPrimaryRelation, 45 | 55 | 60 | 70 | 90> = {
  SIX_HARMONY: 90,
  NEUTRAL: 70,
  HARM: 60,
  PUNISHMENT: 55,
  CLASH: 45,
};

function canonicalBranch(value: string): CanonicalBranch {
  const branch = BRANCH_ALIASES[value.trim()];
  if (!branch) throw new RangeError(`지원하지 않는 일지입니다: ${value}`);
  return branch;
}

function pairKey(a: CanonicalBranch, b: CanonicalBranch) {
  const indexA = BRANCHES.indexOf(a);
  const indexB = BRANCHES.indexOf(b);
  return indexA <= indexB ? `${a}-${b}` : `${b}-${a}`;
}

function evidenceFor(a: CanonicalBranch, b: CanonicalBranch) {
  const key = pairKey(a, b);
  const evidence: DayBranchEvidenceRelation[] = [];
  if (CLASH.has(key)) evidence.push("CLASH");
  if (SIX_HARMONY.has(key)) evidence.push("SIX_HARMONY");
  if (PUNISHMENT.has(key)) evidence.push("PUNISHMENT");
  if (HARM.has(key)) evidence.push("HARM");
  return evidence;
}

function selectPrimary(evidence: DayBranchEvidenceRelation[]): DayBranchPrimaryRelation {
  for (const relation of RELATION_PRECEDENCE) {
    if (evidence.includes(relation)) return relation;
  }
  return "NEUTRAL";
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

export function scoreDayBranchCompatibility(
  branchA: string,
  branchB: string,
  profile: CompatibilityProfile,
): DayBranchCompatibilityScore {
  const canonicalBranchA = canonicalBranch(branchA);
  const canonicalBranchB = canonicalBranch(branchB);
  const evidenceRelations = evidenceFor(canonicalBranchA, canonicalBranchB);
  const primaryRelation = selectPrimary(evidenceRelations);
  const normalizedScore = NORMALIZED_SCORE[primaryRelation];
  const maxPoints = getCompatibilityDimensionWeight(profile, "dayBranch");

  return {
    dimension: "dayBranch",
    branchA,
    branchB,
    canonicalBranchA,
    canonicalBranchB,
    evidenceRelations,
    primaryRelation,
    normalizedScore,
    profile,
    maxPoints,
    weightedPoints: round4((normalizedScore / 100) * maxPoints),
  };
}
