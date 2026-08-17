import type { PersonBirthInput } from "@/lib/report-input";

export const PARTNER_INFORMATION_LEVELS = ["A", "B", "C"] as const;
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
    detail: "년·월·일은 확정하고, 시주는 여러 가능한 시나리오를 비교해 불확실성 범위와 함께 해석합니다.",
  },
  C: {
    label: "정보 수준 C · 추정",
    short: "정확한 생년월일 미상",
    detail: "상대 사주를 확정하지 않고 관찰 문항을 바탕으로 기질 후보를 추정하는 별도 경로입니다. 결정론적 1:1 점수와 혼합하지 않습니다.",
  },
};

export function partnerInformationLevelFromPerson(
  person: Pick<PersonBirthInput, "birthTimeKnown">,
): Exclude<PartnerInformationLevel, "C"> {
  return person.birthTimeKnown ? "A" : "B";
}

export function partnerInformationLevelFromFacts(
  facts: { birthTimeKnown: boolean },
): Exclude<PartnerInformationLevel, "C"> {
  return facts.birthTimeKnown ? "A" : "B";
}

export const C_LEVEL_OBSERVATION_QUESTIONS = [
  {
    id: "startsConversation",
    prompt: "처음 만났을 때 먼저 말을 거는 편인가요?",
    axis: "yinYang",
    options: ["먼저 말을 거는 편", "상황에 따라 다름", "상대가 먼저 오길 기다리는 편"],
  },
  {
    id: "replySpeed",
    prompt: "연락 답장 속도는 어떤 편인가요?",
    axis: "element",
    options: ["대체로 즉답", "몇 시간 안에 답장", "하루 이상 걸리는 경우가 많음"],
  },
  {
    id: "emotionExpression",
    prompt: "감정 표현이 겉으로 드러나는 편인가요?",
    axis: "yinYang",
    options: ["잘 드러냄", "상황에 따라 다름", "대체로 숨김"],
  },
  {
    id: "planningStyle",
    prompt: "계획형인가요, 즉흥형인가요?",
    axis: "element",
    options: ["계획형", "둘 다 비슷함", "즉흥형"],
  },
  {
    id: "socialPreference",
    prompt: "사람 많은 자리와 소수의 자리 중 어디를 더 편해하나요?",
    axis: "yinYang",
    options: ["사람 많은 자리", "둘 다 비슷함", "소수의 자리"],
  },
  {
    id: "speechStyle",
    prompt: "말하는 방식은 직설적인가요, 돌려 말하는 편인가요?",
    axis: "element",
    options: ["직설적", "상황에 따라 다름", "돌려 말함"],
  },
  {
    id: "boundaryStyle",
    prompt: "부탁을 받으면 잘 들어주는 편인가요, 선을 긋는 편인가요?",
    axis: "element",
    options: ["잘 들어주는 편", "상황에 따라 다름", "선을 분명히 긋는 편"],
  },
  {
    id: "appearanceStyle",
    prompt: "외모·옷차림은 화려한 편인가요, 단정한 편인가요?",
    axis: "element",
    options: ["화려한 편", "중간", "단정한 편"],
  },
  {
    id: "angerResponse",
    prompt: "화가 났을 때 바로 표현하나요, 침묵하는 편인가요?",
    axis: "yinYang",
    options: ["바로 표현", "상황에 따라 다름", "침묵하는 편"],
  },
  {
    id: "distinctiveBehavior",
    prompt: "나에게 하는 행동 중 가장 특이하거나 기억에 남는 것 한 가지를 적어주세요.",
    axis: "freeText",
    options: null,
  },
] as const;

export type CLevelObservationQuestionId = (typeof C_LEVEL_OBSERVATION_QUESTIONS)[number]["id"];
export type CLevelObservationAnswers = Partial<Record<CLevelObservationQuestionId, string>>;

export type CLevelPartnerContext = {
  informationLevel: "C";
  displayName: string;
  knownBirthYear: number | null;
  zodiacHint: string | null;
  observations: CLevelObservationAnswers;
};

export function validateCLevelObservationAnswers(answers: CLevelObservationAnswers) {
  const errors: Partial<Record<CLevelObservationQuestionId, string>> = {};

  for (const question of C_LEVEL_OBSERVATION_QUESTIONS) {
    const answer = answers[question.id]?.trim() ?? "";
    if (!answer) {
      errors[question.id] = "이 문항에 답해 주세요.";
      continue;
    }

    if (question.id === "distinctiveBehavior") {
      if (answer.length > 100) errors[question.id] = "100자 이하로 입력해 주세요.";
      continue;
    }

    if (question.options && !question.options.includes(answer as never)) {
      errors[question.id] = "제공된 선택지 중 하나를 골라 주세요.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
