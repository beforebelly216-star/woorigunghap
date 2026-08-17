import type { PersonBirthInput } from "@/lib/report-input";

export const PARTNER_INFORMATION_LEVELS = ["A", "B"] as const;
export type PartnerInformationLevel = (typeof PARTNER_INFORMATION_LEVELS)[number];

export const PARTNER_INFORMATION_LEVEL_COPY: Record<PartnerInformationLevel, {
  label: string;
  short: string;
  detail: string;
}> = {
  A: {
    label: "정보 수준 A · 완전",
    short: "생년월일과 출생시간 확인",
    detail: "년·월·일·시 네 기둥을 모두 사용해 해석합니다.",
  },
  B: {
    label: "정보 수준 B · 부분",
    short: "생년월일 확인 · 출생시간 미상",
    detail: "년·월·일은 확정하고, 시주는 하루의 대표 시간대 시나리오를 모두 비교해 점수 범위와 해석 불확실성을 함께 표시합니다.",
  },
};

export function partnerInformationLevelFromPerson(
  person: Pick<PersonBirthInput, "birthTimeKnown">,
): PartnerInformationLevel {
  return person.birthTimeKnown ? "A" : "B";
}

export function partnerInformationLevelFromFacts(
  facts: { birthTimeKnown: boolean },
): PartnerInformationLevel {
  return facts.birthTimeKnown ? "A" : "B";
}
