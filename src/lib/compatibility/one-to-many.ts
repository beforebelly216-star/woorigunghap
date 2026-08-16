import {
  getRelationshipCalculationProfile,
  validateOneToManyReportInput,
  type OneToManyReportInput,
} from "@/lib/report-input";
import {
  calculateOneToOneCompatibility,
  COMPATIBILITY_DIMENSIONS,
  type CompatibilityCalculationSnapshot,
} from "./engine";
import type { CompatibilityDimension, CompatibilityProfile } from "./types";

export const ONE_TO_MANY_ENGINE_VERSION = "one-to-many-engine-v1.0.0";
export const ONE_TO_MANY_RANKING_POLICY_VERSION = "one-to-many-ranking-v1.0.0";

export type OneToManyCandidateId = `candidate_${number}`;
export type ScoreGapBand = "EQUIVALENT" | "SLIGHT_EDGE" | "MEANINGFUL_GAP";
export type UncertaintyRange = CompatibilityCalculationSnapshot["uncertaintyRange"];

export type RankingCandidate = {
  candidateId: OneToManyCandidateId;
  inputIndex: number;
  score: number;
  rawTotal: number;
  uncertaintyRange: UncertaintyRange;
};

export type RankedCandidate = RankingCandidate & {
  rank: number;
  groupIndex: number;
  comparisonToLeader: {
    scoreGap: number;
    band: ScoreGapBand;
    uncertaintyRangesOverlap: boolean;
    decisiveWordingAllowed: boolean;
  };
};

export type RankingGroup = {
  groupIndex: number;
  rank: number;
  candidateIds: OneToManyCandidateId[];
  representativeScore: number;
  scoreRange: { min: number; max: number };
  gapFromPreviousGroup: null | {
    points: number;
    band: Exclude<ScoreGapBand, "EQUIVALENT">;
  };
};

export type OneToManyRanking = {
  orderedCandidates: RankedCandidate[];
  groups: RankingGroup[];
};

export type OneToManyCalculationSnapshot = {
  engineVersion: typeof ONE_TO_MANY_ENGINE_VERSION;
  rankingPolicyVersion: typeof ONE_TO_MANY_RANKING_POLICY_VERSION;
  oneToOneEngineVersion: string;
  scoringVersion: string;
  relationshipType: OneToManyReportInput["relationshipType"];
  profile: CompatibilityProfile;
  candidateCount: number;
  rankingPolicy: {
    source: "SERVER_FINAL_INTEGER_SCORE";
    equivalentMaxGap: 2;
    slightEdgeMaxGap: 5;
    meaningfulGapMin: 6;
    equivalenceGrouping: "GROUP_LEADER_ANCHORED";
    deterministicTieBreak: "INPUT_ORDER";
    uncertaintyOverlapAffectsRank: false;
  };
  ranking: OneToManyRanking;
  candidates: Array<RankedCandidate & {
    calculationSnapshot: CompatibilityCalculationSnapshot;
  }>;
  comparisonMatrix: {
    dimensionOrder: readonly CompatibilityDimension[];
    rows: Array<{
      candidateId: OneToManyCandidateId;
      rank: number;
      score: number;
      uncertaintyRange: UncertaintyRange;
      dimensions: Record<CompatibilityDimension, number>;
    }>;
  };
  privacyBoundary: {
    containsDisplayNames: false;
    containsRawBirthData: false;
    candidateIdentifiers: "ANONYMOUS_STABLE_INPUT_ORDER";
  };
  aiBoundary: {
    scoreMutableByAi: false;
    rankingMutableByAi: false;
    explanationOnly: true;
  };
};

export function classifyScoreGap(points: number): ScoreGapBand {
  if (!Number.isFinite(points) || points < 0) {
    throw new RangeError("점수 차이는 0 이상의 유한한 값이어야 합니다.");
  }
  if (points <= 2) return "EQUIVALENT";
  if (points <= 5) return "SLIGHT_EDGE";
  return "MEANINGFUL_GAP";
}

export function uncertaintyRangesOverlap(a: UncertaintyRange, b: UncertaintyRange) {
  return a.min <= b.max && b.min <= a.max;
}

/**
 * 0~2점 동급은 각 그룹의 최고점에 고정해 판정한다. 연쇄 비교로
 * 80점과 77점이 같은 그룹이 되는 현상을 막기 위한 정책이다.
 */
export function buildOneToManyRanking(candidates: RankingCandidate[]): OneToManyRanking {
  if (candidates.length === 0) throw new RangeError("랭킹 후보가 없습니다.");

  const ordered = [...candidates].sort(
    (a, b) => b.score - a.score || a.inputIndex - b.inputIndex,
  );
  const leader = ordered[0];
  const groups: RankingGroup[] = [];
  const ranked: RankedCandidate[] = [];

  for (const candidate of ordered) {
    let group = groups.at(-1);
    const joinsCurrentGroup = group
      ? group.representativeScore - candidate.score <= 2
      : false;

    if (!group || !joinsCurrentGroup) {
      const previousGroup = group;
      const points = previousGroup
        ? previousGroup.representativeScore - candidate.score
        : null;
      group = {
        groupIndex: groups.length,
        rank: ranked.length + 1,
        candidateIds: [],
        representativeScore: candidate.score,
        scoreRange: { min: candidate.score, max: candidate.score },
        gapFromPreviousGroup: points === null
          ? null
          : {
              points,
              band: classifyScoreGap(points) as Exclude<ScoreGapBand, "EQUIVALENT">,
            },
      };
      groups.push(group);
    }

    group.candidateIds.push(candidate.candidateId);
    group.scoreRange.min = Math.min(group.scoreRange.min, candidate.score);
    const scoreGap = leader.score - candidate.score;
    const overlaps = uncertaintyRangesOverlap(leader.uncertaintyRange, candidate.uncertaintyRange);
    ranked.push({
      ...candidate,
      rank: group.rank,
      groupIndex: group.groupIndex,
      comparisonToLeader: {
        scoreGap,
        band: classifyScoreGap(scoreGap),
        uncertaintyRangesOverlap: overlaps,
        decisiveWordingAllowed: scoreGap >= 6 && !overlaps,
      },
    });
  }

  return { orderedCandidates: ranked, groups };
}

function candidateId(index: number): OneToManyCandidateId {
  return `candidate_${index + 1}`;
}

export function calculateOneToManyCompatibility(
  input: OneToManyReportInput,
): OneToManyCalculationSnapshot {
  const validation = validateOneToManyReportInput(input);
  if (!validation.valid) {
    throw new RangeError(`1:N 입력값이 올바르지 않습니다: ${JSON.stringify(validation.errors)}`);
  }

  const calculated = input.candidates.map((candidate, inputIndex) => {
    const calculationSnapshot = calculateOneToOneCompatibility({
      relationshipType: input.relationshipType,
      personA: input.referencePerson,
      personB: candidate,
    });
    return {
      candidateId: candidateId(inputIndex),
      inputIndex,
      calculationSnapshot,
    };
  });

  const ranking = buildOneToManyRanking(calculated.map((candidate) => ({
    candidateId: candidate.candidateId,
    inputIndex: candidate.inputIndex,
    score: candidate.calculationSnapshot.score,
    rawTotal: candidate.calculationSnapshot.rawTotal,
    uncertaintyRange: candidate.calculationSnapshot.uncertaintyRange,
  })));
  const byId = new Map(calculated.map((candidate) => [candidate.candidateId, candidate]));
  const candidates = ranking.orderedCandidates.map((ranked) => ({
    ...ranked,
    calculationSnapshot: byId.get(ranked.candidateId)!.calculationSnapshot,
  }));
  const first = candidates[0].calculationSnapshot;

  return {
    engineVersion: ONE_TO_MANY_ENGINE_VERSION,
    rankingPolicyVersion: ONE_TO_MANY_RANKING_POLICY_VERSION,
    oneToOneEngineVersion: first.engineVersion,
    scoringVersion: first.scoringVersion,
    relationshipType: input.relationshipType,
    profile: getRelationshipCalculationProfile(input.relationshipType),
    candidateCount: candidates.length,
    rankingPolicy: {
      source: "SERVER_FINAL_INTEGER_SCORE",
      equivalentMaxGap: 2,
      slightEdgeMaxGap: 5,
      meaningfulGapMin: 6,
      equivalenceGrouping: "GROUP_LEADER_ANCHORED",
      deterministicTieBreak: "INPUT_ORDER",
      uncertaintyOverlapAffectsRank: false,
    },
    ranking,
    candidates,
    comparisonMatrix: {
      dimensionOrder: COMPATIBILITY_DIMENSIONS,
      rows: candidates.map((candidate) => ({
        candidateId: candidate.candidateId,
        rank: candidate.rank,
        score: candidate.score,
        uncertaintyRange: candidate.uncertaintyRange,
        dimensions: Object.fromEntries(COMPATIBILITY_DIMENSIONS.map((dimension) => [
          dimension,
          candidate.calculationSnapshot.dimensions[dimension].normalizedScore,
        ])) as Record<CompatibilityDimension, number>,
      })),
    },
    privacyBoundary: {
      containsDisplayNames: false,
      containsRawBirthData: false,
      candidateIdentifiers: "ANONYMOUS_STABLE_INPUT_ORDER",
    },
    aiBoundary: {
      scoreMutableByAi: false,
      rankingMutableByAi: false,
      explanationOnly: true,
    },
  };
}
