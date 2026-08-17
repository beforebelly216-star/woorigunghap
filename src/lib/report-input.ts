export const RELATIONSHIP_TYPES = ["crush", "flirting", "lover", "friend", "coworker"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  crush: "짝사랑",
  flirting: "썸",
  lover: "연인",
  friend: "친구",
  coworker: "직장동료",
};

export const COWORKER_HIERARCHIES = ["boss", "peer", "subordinate"] as const;
export type CoworkerHierarchy = (typeof COWORKER_HIERARCHIES)[number];

/** 두 번째 사람(personB)이 첫 번째 사람(personA) 기준으로 어떤 위치인지 나타낸다. */
export const COWORKER_HIERARCHY_LABELS: Record<CoworkerHierarchy, string> = {
  boss: "상대가 내 상사",
  peer: "동급 동료",
  subordinate: "상대가 내 부하",
};

export const MAX_RELATIONSHIP_DURATION_MONTHS = 1200;
export const MAX_MOST_CURIOUS_LENGTH = 200;

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
  /**
   * 두 번째 사람(personB)의 첫 번째 사람(personA) 대비 직장 위계.
   * 기존 저장 주문과의 하위호환을 위해 optional이며, 새 coworker 주문은 폼/주문 API에서 필수 검증한다.
   */
  coworkerHierarchy?: CoworkerHierarchy | null;
  /** 썸·연인·친구·직장동료의 현재 관계 기간. 기준문서에 따라 개월 단위로 저장한다. */
  relationshipDurationMonths?: number | null;
  /** 사용자가 가장 궁금한 한 가지. 선택값이며 최대 200자다. */
  mostCurious?: string | null;
  personA: PersonBirthInput;
  personB: PersonBirthInput;
};

export const ONE_TO_MANY_MIN_CANDIDATES = 2;
export const ONE_TO_MANY_MAX_CANDIDATES = 5;

export type OneToManyReportInput = {
  relationshipType: RelationshipType;
  referencePerson: PersonBirthInput;
  candidates: PersonBirthInput[];
};

function parsePersonBirthInput(person: unknown): PersonBirthInput | null {
  if (!person || typeof person !== "object" || Array.isArray(person)) return null;
  const item = person as Record<string, unknown>;
  if (
    typeof item.displayName !== "string"
    || !GENDERS.includes(item.gender as Gender)
    || !CALENDAR_TYPES.includes(item.calendarType as CalendarType)
    || typeof item.birthDate !== "string"
    || typeof item.birthTimeKnown !== "boolean"
    || !(typeof item.birthTime === "string" || item.birthTime === null)
    || typeof item.isLeapMonth !== "boolean"
  ) return null;
  return item as PersonBirthInput;
}

/**
 * Accept an untrusted JSON candidate only after checking the complete input
 * shape. Route handlers use this before the detailed validation below so a
 * malformed request cannot reach date or string operations.
 */
export function parseOneToOneReportInput(value: unknown): OneToOneReportInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;

  if (!RELATIONSHIP_TYPES.includes(candidate.relationshipType as RelationshipType)) return null;
  const hierarchy = candidate.coworkerHierarchy;
  if (
    hierarchy !== undefined
    && hierarchy !== null
    && !COWORKER_HIERARCHIES.includes(hierarchy as CoworkerHierarchy)
  ) return null;

  const rawDuration = candidate.relationshipDurationMonths;
  if (
    rawDuration !== undefined
    && rawDuration !== null
    && (typeof rawDuration !== "number" || !Number.isFinite(rawDuration))
  ) return null;

  const rawMostCurious = candidate.mostCurious;
  if (
    rawMostCurious !== undefined
    && rawMostCurious !== null
    && typeof rawMostCurious !== "string"
  ) return null;

  const personA = parsePersonBirthInput(candidate.personA);
  const personB = parsePersonBirthInput(candidate.personB);
  return personA && personB
    ? {
        relationshipType: candidate.relationshipType as RelationshipType,
        coworkerHierarchy: hierarchy == null ? null : hierarchy as CoworkerHierarchy,
        relationshipDurationMonths: rawDuration == null ? null : rawDuration,
        mostCurious: rawMostCurious == null ? null : rawMostCurious.trim() || null,
        personA,
        personB,
      }
    : null;
}

export function parseOneToManyReportInput(value: unknown): OneToManyReportInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (!RELATIONSHIP_TYPES.includes(candidate.relationshipType as RelationshipType)) return null;
  if (!Array.isArray(candidate.candidates)) return null;

  const referencePerson = parsePersonBirthInput(candidate.referencePerson);
  const candidates = candidate.candidates.map(parsePersonBirthInput);
  if (!referencePerson || candidates.some((person) => !person)) return null;

  return {
    relationshipType: candidate.relationshipType as RelationshipType,
    referencePerson,
    candidates: candidates as PersonBirthInput[],
  };
}

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

function validatePerson(person: PersonBirthInput, prefix: string) {
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

export function validateOneToOneReportInput(
  input: OneToOneReportInput,
  options: { requireCoworkerHierarchy?: boolean } = {},
) {
  const errors: InputFieldErrors = {};

  if (!RELATIONSHIP_TYPES.includes(input.relationshipType)) {
    errors.relationshipType = "관계 유형을 선택해 주세요.";
  }

  if (
    input.coworkerHierarchy != null
    && !COWORKER_HIERARCHIES.includes(input.coworkerHierarchy)
  ) {
    errors.coworkerHierarchy = "직장동료 관계의 위치를 다시 선택해 주세요.";
  }
  if (
    options.requireCoworkerHierarchy
    && input.relationshipType === "coworker"
    && !input.coworkerHierarchy
  ) {
    errors.coworkerHierarchy = "두 번째 사람의 직장 내 위치를 선택해 주세요.";
  }
  if (input.relationshipType !== "coworker" && input.coworkerHierarchy) {
    errors.coworkerHierarchy = "직장 내 위치는 직장동료 궁합에서만 선택할 수 있어요.";
  }

  if (input.relationshipDurationMonths != null) {
    if (
      !Number.isInteger(input.relationshipDurationMonths)
      || input.relationshipDurationMonths < 0
      || input.relationshipDurationMonths > MAX_RELATIONSHIP_DURATION_MONTHS
    ) {
      errors.relationshipDurationMonths = `관계 기간은 0~${MAX_RELATIONSHIP_DURATION_MONTHS}개월 사이의 숫자로 입력해 주세요.`;
    } else if (input.relationshipType === "crush") {
      errors.relationshipDurationMonths = "짝사랑은 관계 기간 대신 현재 관계 단계만 반영합니다.";
    }
  }

  if (input.mostCurious != null && input.mostCurious.trim().length > MAX_MOST_CURIOUS_LENGTH) {
    errors.mostCurious = `가장 궁금한 점은 ${MAX_MOST_CURIOUS_LENGTH}자 이하로 입력해 주세요.`;
  }

  Object.assign(errors, validatePerson(input.personA, "personA"));
  Object.assign(errors, validatePerson(input.personB, "personB"));

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateOneToManyReportInput(input: OneToManyReportInput) {
  const errors: InputFieldErrors = {};

  if (!RELATIONSHIP_TYPES.includes(input.relationshipType)) {
    errors.relationshipType = "관계 유형을 선택해 주세요.";
  }

  if (
    input.candidates.length < ONE_TO_MANY_MIN_CANDIDATES
    || input.candidates.length > ONE_TO_MANY_MAX_CANDIDATES
  ) {
    errors.candidates = `비교 대상은 ${ONE_TO_MANY_MIN_CANDIDATES}명부터 ${ONE_TO_MANY_MAX_CANDIDATES}명까지 입력해 주세요.`;
  }

  Object.assign(errors, validatePerson(input.referencePerson, "referencePerson"));
  input.candidates.forEach((person, index) => {
    Object.assign(errors, validatePerson(person, `candidates.${index}`));
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
