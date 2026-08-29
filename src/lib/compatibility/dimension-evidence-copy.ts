import type { CompatibilityDimension } from "./types";

type EvidenceRecord = Record<string, unknown>;

const DAY_MASTER_RELATION = {
  GENERATES: "서로 기운을 북돋는 생 관계",
  SAME_ELEMENT: "같은 오행을 공유하는 관계",
  CONTROLS: "힘의 방향을 조율해야 하는 극 관계",
} as const;

const DAY_BRANCH_RELATION = {
  SIX_HARMONY: "육합 관계",
  NEUTRAL: "뚜렷한 합·충이 없는 중립 관계",
  HARM: "해 관계",
  PUNISHMENT: "형 관계",
  CLASH: "충 관계",
} as const;

function record(value: unknown): EvidenceRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as EvidenceRecord : {};
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function string(value: unknown) {
  return typeof value === "string" ? value : null;
}

function list(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function finalSentence(score: number) {
  return `이 근거를 관계별 가중치에 반영한 항목 점수는 ${Math.round(score)}점입니다.`;
}

export function buildDimensionEvidenceCopy(
  dimension: CompatibilityDimension,
  score: number,
  rawEvidence: unknown,
) {
  const evidence = record(rawEvidence);
  let basis: string;

  switch (dimension) {
    case "dayMaster": {
      const stemA = string(evidence.stemA) ?? "첫 번째 일간";
      const stemB = string(evidence.stemB) ?? "두 번째 일간";
      const relationKey = string(evidence.relation) as keyof typeof DAY_MASTER_RELATION | null;
      const relation = relationKey ? DAY_MASTER_RELATION[relationKey] : null;
      basis = `${stemA} 일간과 ${stemB} 일간을 비교해 ${relation ?? "오행의 생극 관계"}로 계산했습니다.`;
      break;
    }
    case "dayBranch": {
      const branchA = string(evidence.branchA) ?? "첫 번째 일지";
      const branchB = string(evidence.branchB) ?? "두 번째 일지";
      const relationKey = string(evidence.primaryRelation) as keyof typeof DAY_BRANCH_RELATION | null;
      const relation = relationKey ? DAY_BRANCH_RELATION[relationKey] : null;
      basis = `${branchA} 일지와 ${branchB} 일지 사이의 ${relation ?? "합·충·형·해 관계"}를 일상 리듬과 친밀감의 근거로 반영했습니다.`;
      break;
    }
    case "usefulGodFit": {
      const aReceives = number(evidence.aReceives);
      const bReceives = number(evidence.bReceives);
      basis = aReceives === null || bReceives === null
        ? "두 사람의 오행 분포가 서로 필요한 기운을 채우는 방향을 양쪽에서 비교했습니다."
        : `서로 필요한 기운을 채우는 정도를 양쪽에서 각각 ${aReceives}점과 ${bReceives}점으로 비교했습니다.`;
      break;
    }
    case "elementComplementarity": {
      const improvement = number(evidence.improvement);
      basis = improvement === null
        ? "각자의 오행 분포를 합쳤을 때 부족하거나 치우친 부분이 얼마나 완화되는지 비교했습니다."
        : `각자의 오행 분포를 합쳤을 때 불균형이 완화되는 정도 ${improvement}를 보완 근거로 사용했습니다.`;
      break;
    }
    case "heavenlyStemInteraction": {
      basis = `두 원국의 천간 조합에서 합 ${list(evidence.harmonies).length}개와 충 ${list(evidence.clashes).length}개를 확인해 결속과 긴장을 함께 반영했습니다.`;
      break;
    }
    case "earthlyBranchInteraction": {
      const interactions = list(evidence.interactions).map(record);
      const harmonyCount = interactions.filter((item) => string(item.relation)?.includes("육합")).length;
      basis = `일지 상성에서 이미 본 조합을 제외하고 지지 상호작용 ${interactions.length}개를 확인했으며, 그중 육합은 ${harmonyCount}개입니다.`;
      break;
    }
    case "specialStars": {
      const hits = list(evidence.aReceivesNoblemanBranches).length + list(evidence.bReceivesNoblemanBranches).length;
      basis = `과도한 신살 해석은 제외하고 두 원국 사이의 천을귀인 성립 ${hits}건만 보수적으로 반영했습니다.`;
      break;
    }
    case "spouseStarRealization":
      basis = "성별로 역할을 단정하지 않고, 서로의 오행이 관계에서 필요한 책임감과 보완 역할을 얼마나 공급하는지 양방향으로 비교했습니다.";
      break;
    default:
      basis = "두 사람의 원국에서 확인 가능한 계산 근거만 사용했습니다.";
  }

  return `${basis} ${finalSentence(score)}`;
}
