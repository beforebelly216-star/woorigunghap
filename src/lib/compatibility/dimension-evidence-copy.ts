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

export function buildDimensionEvidenceCopy(
  dimension: CompatibilityDimension,
  _score: number,
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
      basis = `${stemA} 일간과 ${stemB} 일간은 ${relation ?? "오행의 생극 관계"}로 이어져. 기본 성향이 만날 때 생기는 편안함과 긴장을 함께 살폈어.`;
      break;
    }
    case "dayBranch": {
      const branchA = string(evidence.branchA) ?? "첫 번째 일지";
      const branchB = string(evidence.branchB) ?? "두 번째 일지";
      const relationKey = string(evidence.primaryRelation) as keyof typeof DAY_BRANCH_RELATION | null;
      const relation = relationKey ? DAY_BRANCH_RELATION[relationKey] : null;
      basis = `${branchA} 일지와 ${branchB} 일지 사이에는 ${relation ?? "합·충·형·해 관계"}가 보여. 가까워질수록 드러나는 생활 리듬과 친밀감의 단서야.`;
      break;
    }
    case "usefulGodFit": {
      const aReceives = number(evidence.aReceives);
      const bReceives = number(evidence.bReceives);
      basis = aReceives === null || bReceives === null
        ? "두 사람의 오행 분포가 서로 필요한 기운을 채우는 방향인지 양쪽에서 살폈어."
        : `한 사람만 받는 관계인지 피하려고, 서로 필요한 기운을 채우는 정도를 양쪽에서 각각 ${aReceives}와 ${bReceives}로 살폈어.`;
      break;
    }
    case "elementComplementarity": {
      const improvement = number(evidence.improvement);
      basis = improvement === null
        ? "각자의 오행 분포를 합쳤을 때 부족하거나 치우친 부분이 얼마나 부드러워지는지 살폈어."
        : `두 사람이 함께 있을 때 오행의 치우침이 ${improvement}만큼 부드러지는 흐름이 보여.`;
      break;
    }
    case "heavenlyStemInteraction": {
      basis = `두 원국의 천간에서 합 ${list(evidence.harmonies).length}개와 충 ${list(evidence.clashes).length}개가 보여. 표현이 자연스럽게 모이는 지점과 힘겨루기가 생길 지점을 함께 읽었어.`;
      break;
    }
    case "earthlyBranchInteraction": {
      const interactions = list(evidence.interactions).map(record);
      const harmonyCount = interactions.filter((item) => string(item.relation)?.includes("육합")).length;
      basis = `겹치는 단서를 빼고도 지지 상호작용이 ${interactions.length}개 보이고, 그중 육합은 ${harmonyCount}개야. 일상에서 리듬이 맞거나 어긋날 장면을 읽는 단서로 봤어.`;
      break;
    }
    case "specialStars": {
      const hits = list(evidence.aReceivesNoblemanBranches).length + list(evidence.bReceivesNoblemanBranches).length;
      basis = `과한 신살 해석은 빼고, 두 원국 사이에 실제로 성립한 천을귀인 ${hits}건만 조심스럽게 살폈어.`;
      break;
    }
    case "spouseStarRealization":
      basis = "성별로 역할을 정하지 않고, 서로의 오행이 관계에 필요한 책임감과 보완을 양쪽으로 주고받는지 살폈어.";
      break;
    default:
      basis = "두 사람의 원국에서 실제로 확인되는 관계 단서만 살폈어.";
  }

  return basis;
}
