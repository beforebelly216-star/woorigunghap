export const MANSE_POLICY_VERSION = "manse-policy-v1" as const;
export const MANSE_ENGINE_VERSION = "manseryeok-2.0.0" as const;

/**
 * 우리궁합 MVP 만세력 정책.
 *
 * - 한국 표준시(KST, Asia/Seoul) 기준
 * - 일주 경계는 자정(midnight). 23:00~23:59를 다음 날로 넘기지 않는다.
 * - 진태양시/출생지 경도 보정은 MVP에서 적용하지 않는다.
 * - 출생시간 미상은 시주를 확정하지 않는다. 같은 날짜의 00:00/23:59 결과를 비교해
 *   연주·월주가 경계일 때문에 달라질 수 있는지도 함께 표시한다.
 */
export const MANSE_POLICY = {
  version: MANSE_POLICY_VERSION,
  engineVersion: MANSE_ENGINE_VERSION,
  timezone: "Asia/Seoul",
  utcOffset: "+09:00",
  dayBoundary: "midnight" as const,
  trueSolarTimeApplied: false,
  unknownBirthTime: "omit-hour-and-check-day-boundaries" as const,
} as const;
