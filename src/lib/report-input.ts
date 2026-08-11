export const RELATIONSHIP_TYPES = ["crush", "flirting", "lover", "friend", "coworker"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  crush: "짝사랑",
  flirting: "썸",
  lover: "연인",
  friend: "친구",
  coworker: "직장동료",
};

export const CALCULATION_PROFILES = ["romance", "friend", "coworker"] as const;
export type CalculationProfile = (typeof CALCULATION_PROFILES)[number];

/**
 * MVP에서는 사용자에게 5개 관계 단계를 보여주되 궁합 점수 엔진은 3개 프로필만 사용한다.
 * 짝사랑/썸/연인의 세부 점수 가중치 분리는 베타 이후 후속 작업으로 미룬다.
 */
export const RELATIONSHIP_CALCULATION_PROFILE: Record<RelationshipType, CalculationProfile> = {
  crush: "romance",
  flirting: "romance",
  lover: "romance",
  friend: "friend",
  coworker: "coworker",
};

export function getRelationshipCalculationProfile(relationshipType: RelationshipType) {
  return RELATIONSHIP_CALCULATION_PROFILE[relationshipType];
}

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "남성",
  female: "여성",
};

export const CALENDAR_TYPES = ["solar", "lunar"] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];

export type PersonBirthInput = {
  displayName: string;
  gender: Gender;
  calendarType: CalendarType;
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string | null;
  isLeapMonth: boolean;
};

export type OneToOneReportInput = {
  relationshipType: RelationshipType;
  personA: PersonBirthInput;
  personB: PersonBirthInput;
};

export type InputFieldErrors = Record<string, string>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseDateParts(value: string) {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function isValidSolarDate(value: string) {
  const parts = parseDateParts(value);
  if (!parts) return false;
  const { year, month, day } = parts;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isValidLunarDateShape(value: string) {
  const parts = parseDateParts(value);
  if (!parts) return false;
  return parts.month >= 1 && parts.month <= 12 && parts.day >= 1 && parts.day <= 30;
}

function validatePerson(person: PersonBirthInput, prefix: "personA" | "personB") {
  const errors: InputFieldErrors = {};
  const name = person.displayName.trim();

  if (!name) errors[`${prefix}.displayName`] = "이름 또는 별칭을 입력해 주세요.";
  if (name.length > 20) errors[`${prefix}.displayName`] = "이름 또는 별칭은 20자 이하로 입력해 주세요.";

  if (!GENDERS.includes(person.gender)) errors[`${prefix}.gender`] = "성별을 선택해 주세요.";
  if (!CALENDAR_TYPES.includes(person.calendarType)) errors[`${prefix}.calendarType`] = "양력 또는 음력을 선택해 주세요.";

  const validBirthDate = person.calendarType === "solar"
    ? isValidSolarDate(person.birthDate)
    : isValidLunarDateShape(person.birthDate);

  if (!validBirthDate) {
    errors[`${prefix}.birthDate`] = person.calendarType === "solar"
      ? "올바른 양력 생년월일을 입력해 주세요."
      : "음력 생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.";
  } else {
    const parts = parseDateParts(person.birthDate)!;
    const today = new Date();
    if (parts.year < 1900) {
      errors[`${prefix}.birthDate`] = "1900년 이후 생년월일을 입력해 주세요.";
    } else if (parts.year > today.getFullYear()) {
      errors[`${prefix}.birthDate`] = "미래 연도는 입력할 수 없어요.";
    } else if (person.calendarType === "solar") {
      const inputDate = new Date(parts.year, parts.month - 1, parts.day);
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (inputDate > todayDate) errors[`${prefix}.birthDate`] = "미래 날짜는 입력할 수 없어요.";
    }
  }

  if (person.birthTimeKnown) {
    if (!person.birthTime || !TIME_PATTERN.test(person.birthTime)) {
      errors[`${prefix}.birthTime`] = "출생시간을 시:분 형식으로 입력해 주세요.";
    }
  }

  if (person.calendarType === "solar" && person.isLeapMonth) {
    errors[`${prefix}.isLeapMonth`] = "윤달은 음력 생일에만 선택할 수 있어요.";
  }

  return errors;
}

export function validateOneToOneReportInput(input: OneToOneReportInput) {
  const errors: InputFieldErrors = {};

  if (!RELATIONSHIP_TYPES.includes(input.relationshipType)) {
    errors.relationshipType = "관계 유형을 선택해 주세요.";
  }

  Object.assign(errors, validatePerson(input.personA, "personA"));
  Object.assign(errors, validatePerson(input.personB, "personB"));

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
