import type { CompatibilityCalculationSnapshot } from "@/lib/compatibility/engine";

export type CompatibilityShareArchetype = {
  id: "spark" | "complement" | "interlock" | "journey" | "growth" | "tuning";
  label: string;
  subtitle: string;
  clue: string;
};

function scoreOf(snapshot: CompatibilityCalculationSnapshot, dimension: keyof CompatibilityCalculationSnapshot["dimensions"]) {
  return snapshot.dimensions[dimension]?.normalizedScore ?? 0;
}

function average(...values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

export function buildCompatibilityShareArchetype(
  snapshot: CompatibilityCalculationSnapshot,
): CompatibilityShareArchetype {
  const coreChemistry = average(scoreOf(snapshot, "dayMaster"), scoreOf(snapshot, "dayBranch"));
  const complement = average(scoreOf(snapshot, "usefulGodFit"), scoreOf(snapshot, "elementComplementarity"));
  const interlock = average(scoreOf(snapshot, "heavenlyStemInteraction"), scoreOf(snapshot, "earthlyBranchInteraction"));
  const timing = scoreOf(snapshot, "luckCycleAlignment");

  if (snapshot.score >= 82 && coreChemistry >= 80) {
    return {
      id: "spark",
      label: "첫 단서부터 맞아드는 쌍",
      subtitle: "처음부터 서로의 리듬을 알아보는 궁합",
      clue: "사주소년의 첫 단서는 기본 케미가 빠르게 맞물린다는 점이에요.",
    };
  }

  if (complement >= 78) {
    return {
      id: "complement",
      label: "서로의 빈칸을 채우는 쌍",
      subtitle: "다른 점이 오히려 힘이 되는 궁합",
      clue: "사주소년이 찾은 핵심 단서는 서로 부족한 기운을 보완하는 힘이에요.",
    };
  }

  if (interlock >= 78) {
    return {
      id: "interlock",
      label: "부딪혀도 다시 맞물리는 쌍",
      subtitle: "긴장과 끌림이 함께 움직이는 궁합",
      clue: "사주소년의 단서는 천간과 지지의 상호작용이 관계를 계속 움직이게 한다는 점이에요.",
    };
  }

  if (timing >= 78 && snapshot.score >= 68) {
    return {
      id: "journey",
      label: "같은 길을 걷기 좋은 쌍",
      subtitle: "속도와 타이밍을 맞추기 쉬운 궁합",
      clue: "사주소년이 발견한 단서는 두 사람의 관계 타이밍이 비교적 같은 방향을 본다는 점이에요.",
    };
  }

  if (snapshot.score >= 70) {
    return {
      id: "growth",
      label: "천천히 깊어지는 쌍",
      subtitle: "시간을 들일수록 장점이 선명해지는 궁합",
      clue: "사주소년의 단서는 한 번의 강한 신호보다 여러 강점이 차곡차곡 쌓인다는 점이에요.",
    };
  }

  return {
    id: "tuning",
    label: "조율할수록 선명해지는 쌍",
    subtitle: "맞추는 법을 알면 관계의 색이 살아나는 궁합",
    clue: "사주소년의 단서는 자동으로 맞기보다 서로의 사용법을 알아갈수록 좋아진다는 점이에요.",
  };
}
