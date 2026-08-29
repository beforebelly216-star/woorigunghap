/**
 * 주토피 주식 테마 — 표시 전용 파생 매핑.
 *
 * `score-scale.ts`의 `COMPATIBILITY_SCORE_BANDS`(min/max, 계산 임계치)는 절대 바꾸지 않는다.
 * 이 파일은 그 위에 "주식 테마 라벨/캔들스틱 모양"만 얹는 순수 표시 레이어다.
 * 참고: docs/zootopi-stock-theme-work-order-v1.md §6, §13
 */
import { getCompatibilityScoreBand } from "./score-scale";

/** §6 점수 등급 카피 매핑 — 기존 label과 1:1 대응하는 주식 테마 표현. 임계치는 score-scale.ts를 그대로 따른다. */
const STOCK_BADGE_BY_LABEL: Record<string, string> = {
  "최상급 궁합": "상한가",
  "아주 잘 맞는 궁합": "급등세",
  "상당히 잘 맞는 궁합": "강한 우상향",
  "잘 맞는 궁합": "우상향",
  "좋은 궁합": "완만한 우상향",
  "무난하게 잘 맞는 궁합": "박스권 상단",
  "조율하면 좋아지는 궁합": "박스권",
  "차이가 있는 궁합": "조정 국면",
  "조율이 많이 필요한 궁합": "변동성 구간",
  "서로 다른 점이 큰 궁합": "리밸런싱 필요 구간",
};

export function getStockBadge(score: number): string {
  const band = getCompatibilityScoreBand(score);
  return STOCK_BADGE_BY_LABEL[band.label] ?? band.shortLabel;
}

/**
 * 주토피 반말 캡션(§4.8) — 종합점수 헤더 옆에 붙는 짧은 코멘트.
 * 예외 없이 반말만 쓴다. 카피는 항상 현재형이며 미래 시제 예측 문장을 만들지 않는다(§3, §11).
 */
export function getZootopiScoreCaption(score: number): string {
  if (score >= 95) return "와 이거, 완전 상한가인데?";
  if (score >= 85) return "오, 이 조합 꽤 잘나가는데?";
  if (score >= 70) return "전체적으로 우상향이야, 분위기 괜찮아.";
  if (score >= 55) return "지금은 박스권이긴 한데, 흐름 볼만해.";
  return "지금은 좀 조정 국면이긴 한데, 나쁘다는 뜻은 아니야. 맞출 지점이 있다는 거지.";
}

export type CandleTone = "up" | "flat";

export type CandleTier = {
  /** §13 5단계 캔들 배지 텍스트 (캔들 형태 자체에 붙는 짧은 라벨, §6의 상세 10단계 배지와는 별개) */
  shapeLabel: string;
  bodyRatio: number; // 0~1, 캔들 몸통 길이 비율
  wickRatio: number; // 0~1, 위/아래 꼬리 길이 비율(몸통 대비)
  tone: CandleTone;
  /** true면 보합/도지 — 몸통 대신 십자형으로 렌더링 */
  isDoji: boolean;
};

/**
 * §13 핵심 원칙: 항상 양봉만 나오지 않도록 몸통 크기를 실제로 차등화하되,
 * 이 제품 점수 밴드(45~100)는 "나쁜 관계" 판정을 하지 않으므로 음봉(파랑/하락)은 절대 쓰지 않는다.
 * 45~54점은 보합형(도지)으로 정직한 편차를 표현한다.
 */
export function getCandleTier(score: number): CandleTier {
  if (score >= 95) return { shapeLabel: "상한가", bodyRatio: 1, wickRatio: .12, tone: "up", isDoji: false };
  if (score >= 85) return { shapeLabel: "급등세", bodyRatio: .76, wickRatio: .2, tone: "up", isDoji: false };
  if (score >= 70) return { shapeLabel: "우상향", bodyRatio: .54, wickRatio: .3, tone: "up", isDoji: false };
  if (score >= 55) return { shapeLabel: "박스권", bodyRatio: .28, wickRatio: .55, tone: "up", isDoji: false };
  return { shapeLabel: "조정 국면", bodyRatio: .06, wickRatio: .4, tone: "flat", isDoji: true };
}

/** §12.1 주가형 히트맵 5단계 램프에서 점수(0~100)에 대응하는 CSS 변수를 고른다. */
export function getHeatToken(score: number): string {
  const clamped = Math.min(100, Math.max(0, score));
  if (clamped >= 85) return "var(--zootopi-heat-5)";
  if (clamped >= 70) return "var(--zootopi-heat-4)";
  if (clamped >= 55) return "var(--zootopi-heat-3)";
  if (clamped >= 40) return "var(--zootopi-heat-2)";
  return "var(--zootopi-heat-1)";
}
