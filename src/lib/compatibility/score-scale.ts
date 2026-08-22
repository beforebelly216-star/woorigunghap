export const PUBLIC_COMPATIBILITY_SCORE_FLOOR = 45;
export const PUBLIC_COMPATIBILITY_SCORE_CEILING = 100;
export const PUBLIC_COMPATIBILITY_RAW_FLOOR = 30;

export type CompatibilityScoreBand = {
  min: number;
  max: number;
  label: string;
  shortLabel: string;
  description: string;
};

export const COMPATIBILITY_SCORE_BANDS: readonly CompatibilityScoreBand[] = [
  { min: 95, max: 100, label: "최상급 궁합", shortLabel: "최상급", description: "핵심 궁합 지표 대부분이 강하게 맞는 조합이에요. 서로의 차이보다 잘 맞는 힘이 훨씬 크게 보입니다." },
  { min: 90, max: 94, label: "아주 잘 맞는 궁합", shortLabel: "아주 잘 맞음", description: "전반적으로 조화가 매우 좋은 편이에요. 몇 가지 차이가 있어도 관계의 강점이 뚜렷합니다." },
  { min: 85, max: 89, label: "상당히 잘 맞는 궁합", shortLabel: "상당히 잘 맞음", description: "여러 핵심 지표에서 강점이 겹쳐요. 실제 관계에서도 편한 장면을 만들기 쉬운 편입니다." },
  { min: 80, max: 84, label: "잘 맞는 궁합", shortLabel: "잘 맞는 편", description: "전체적으로 잘 맞는 편이에요. 약한 지점 몇 가지만 조율하면 장점이 더 선명해집니다." },
  { min: 75, max: 79, label: "좋은 궁합", shortLabel: "좋은 편", description: "강점이 분명한 좋은 조합이에요. 서로 다른 리듬은 대화로 맞춰갈 여지가 있습니다." },
  { min: 70, max: 74, label: "무난하게 잘 맞는 궁합", shortLabel: "무난하게 잘 맞음", description: "잘 맞는 부분과 다른 부분이 함께 보여요. 관계의 기본 체력은 무난한 편입니다." },
  { min: 65, max: 69, label: "조율하면 좋아지는 궁합", shortLabel: "조율하면 좋음", description: "차이가 조금 더 눈에 띄지만, 서로의 방식을 알면 충분히 편해질 수 있는 구간이에요." },
  { min: 60, max: 64, label: "차이가 있는 궁합", shortLabel: "차이가 있음", description: "생활·표현·갈등 방식 중 몇 군데에서 조율이 필요해요. 맞추는 방식이 중요합니다." },
  { min: 55, max: 59, label: "조율이 많이 필요한 궁합", shortLabel: "조율 필요", description: "서로 다른 지점이 꽤 보여요. 잘 맞는 한두 가지 강점을 중심으로 관계 기준을 세우는 게 좋습니다." },
  { min: 45, max: 54, label: "서로 다른 점이 큰 궁합", shortLabel: "차이가 큰 편", description: "기본 리듬의 차이가 큰 편이에요. 나쁜 관계라는 뜻은 아니지만, 실제 대화와 행동으로 맞춰야 할 부분이 많습니다." },
] as const;

export function calibrateCompatibilityScore(rawScore: number) {
  if (!Number.isFinite(rawScore)) throw new RangeError("궁합 점수는 유한한 숫자여야 합니다.");
  const clamped = Math.min(PUBLIC_COMPATIBILITY_SCORE_CEILING, Math.max(PUBLIC_COMPATIBILITY_RAW_FLOOR, rawScore));
  const ratio = (clamped - PUBLIC_COMPATIBILITY_RAW_FLOOR)
    / (PUBLIC_COMPATIBILITY_SCORE_CEILING - PUBLIC_COMPATIBILITY_RAW_FLOOR);
  return Math.round(
    PUBLIC_COMPATIBILITY_SCORE_FLOOR
      + ratio * (PUBLIC_COMPATIBILITY_SCORE_CEILING - PUBLIC_COMPATIBILITY_SCORE_FLOOR),
  );
}

export function getCompatibilityScoreBand(score: number): CompatibilityScoreBand {
  const normalized = Math.min(PUBLIC_COMPATIBILITY_SCORE_CEILING, Math.max(PUBLIC_COMPATIBILITY_SCORE_FLOOR, Math.round(score)));
  return COMPATIBILITY_SCORE_BANDS.find((band) => normalized >= band.min && normalized <= band.max)
    ?? COMPATIBILITY_SCORE_BANDS[COMPATIBILITY_SCORE_BANDS.length - 1];
}
