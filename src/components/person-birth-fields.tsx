"use client";

import {
  CALENDAR_TYPES,
  GENDER_LABELS,
  GENDERS,
  type Gender,
  type PersonBirthInput,
} from "@/lib/report-input";
import { ariaDescribedBy, formFieldId } from "@/lib/form-accessibility";

type Meridiem = "am" | "pm";

export type PersonBirthFormState = {
  displayName: string;
  gender: Gender | "";
  calendarType: PersonBirthInput["calendarType"];
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string;
  meridiem: Meridiem;
  isLeapMonth: boolean;
};

export function createEmptyPersonBirthForm(): PersonBirthFormState {
  return {
    displayName: "",
    gender: "",
    calendarType: "solar",
    birthDate: "",
    birthTimeKnown: true,
    birthTime: "",
    meridiem: "am",
    isLeapMonth: false,
  };
}

function numbersOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function toIsoBirthDate(value: string) {
  if (!/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function toTwentyFourHourTime(value: string, meridiem: Meridiem) {
  if (!/^\d{4}$/.test(value)) return null;
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(2, 4));
  if (hour < 1 || hour > 12 || minute > 59) return null;

  const normalizedHour = meridiem === "am"
    ? hour === 12 ? 0 : hour
    : hour === 12 ? 12 : hour + 12;
  return `${String(normalizedHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizePersonBirthForm(
  person: PersonBirthFormState,
  prefix: string,
): { person: PersonBirthInput | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const birthDate = toIsoBirthDate(person.birthDate);
  if (!birthDate) {
    errors[`${prefix}.birthDate`] = "생년월일 8자리를 YYYYMMDD 형식으로 다시 입력해 주세요.";
  }

  const birthTime = person.birthTimeKnown
    ? toTwentyFourHourTime(person.birthTime, person.meridiem)
    : null;
  if (person.birthTimeKnown && !birthTime) {
    errors[`${prefix}.birthTime`] = "오전/오후를 고르고 시간을 HHMM 형식으로 다시 입력해 주세요. (예: 오전 0930)";
  }

  if (!birthDate || (person.birthTimeKnown && !birthTime)) return { person: null, errors };

  return {
    person: {
      displayName: person.displayName,
      gender: person.gender as Gender,
      calendarType: person.calendarType,
      birthDate,
      birthTimeKnown: person.birthTimeKnown,
      birthTime,
      isLeapMonth: person.isLeapMonth,
    },
    errors,
  };
}

export function PersonBirthFields({
  title,
  prefix,
  placeholder,
  value,
  errors,
  onChange,
}: {
  title: string;
  prefix: string;
  placeholder: string;
  value: PersonBirthFormState;
  errors: Record<string, string>;
  onChange: (next: PersonBirthFormState) => void;
}) {
  const error = (field: string) => errors[`${prefix}.${field}`];
  const id = (field: string, suffix?: string) => formFieldId(prefix, field, suffix);
  const birthDateError = error("birthDate");
  const birthTimeError = error("birthTime");
  const genderError = error("gender");
  const displayNameError = error("displayName");

  return (
    <fieldset className="person-panel">
      <legend>{title}</legend>

      <label className="field-stack" htmlFor={id("displayName")}>
        <span>이름 또는 별칭</span>
        <input
          id={id("displayName")}
          type="text"
          maxLength={20}
          placeholder={placeholder}
          value={value.displayName}
          aria-invalid={Boolean(displayNameError)}
          aria-describedby={displayNameError ? id("displayName", "error") : undefined}
          onChange={(event) => onChange({ ...value, displayName: event.target.value })}
        />
        {displayNameError ? <small id={id("displayName", "error")} className="field-error">{displayNameError}</small> : null}
      </label>

      <div className="field-stack">
        <span id={id("gender", "label")}>성별</span>
        <div
          className="segmented-control"
          role="radiogroup"
          aria-labelledby={id("gender", "label")}
          aria-invalid={Boolean(genderError)}
          aria-describedby={genderError ? id("gender", "error") : undefined}
        >
          {GENDERS.map((gender) => (
            <label key={gender} className={value.gender === gender ? "selected" : ""}>
              <input
                type="radio"
                name={`${prefix}-gender`}
                value={gender}
                checked={value.gender === gender}
                onChange={() => onChange({ ...value, gender })}
              />
              {GENDER_LABELS[gender]}
            </label>
          ))}
        </div>
        {genderError ? <small id={id("gender", "error")} className="field-error">{genderError}</small> : null}
      </div>

      <div className="field-stack">
        <span id={id("calendar", "label")}>달력 기준</span>
        <div className="segmented-control" role="radiogroup" aria-labelledby={id("calendar", "label")}>
          {CALENDAR_TYPES.map((calendarType) => (
            <label key={calendarType} className={value.calendarType === calendarType ? "selected" : ""}>
              <input
                type="radio"
                name={`${prefix}-calendar`}
                value={calendarType}
                checked={value.calendarType === calendarType}
                onChange={() => onChange({
                  ...value,
                  calendarType,
                  isLeapMonth: calendarType === "solar" ? false : value.isLeapMonth,
                })}
              />
              {calendarType === "solar" ? "양력" : "음력"}
            </label>
          ))}
        </div>
      </div>

      <label className="field-stack" htmlFor={id("birthDate")}>
        <span>생년월일</span>
        <input
          id={id("birthDate")}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          enterKeyHint="next"
          maxLength={8}
          placeholder="예: 19980815"
          value={value.birthDate}
          aria-invalid={Boolean(birthDateError)}
          aria-describedby={ariaDescribedBy(id("birthDate", "hint"), birthDateError && id("birthDate", "error"))}
          onChange={(event) => onChange({ ...value, birthDate: numbersOnly(event.target.value, 8) })}
        />
        <small id={id("birthDate", "hint")} className="field-hint">하이픈 없이 YYYYMMDD 8자리로 입력해 주세요.</small>
        {birthDateError ? <small id={id("birthDate", "error")} className="field-error">{birthDateError}</small> : null}
      </label>

      {value.calendarType === "lunar" ? (
        <label className="check-row">
          <input
            type="checkbox"
            checked={value.isLeapMonth}
            onChange={(event) => onChange({ ...value, isLeapMonth: event.target.checked })}
          />
          윤달 생일이에요
        </label>
      ) : null}

      <div className="field-stack">
        <span id={id("birthTime", "label")}>출생시간</span>
        <div className="time-input-row">
          <div className="segmented-control" role="radiogroup" aria-label={`${title} 출생시간 오전 또는 오후`}>
            {(["am", "pm"] as const).map((meridiem) => (
              <label key={meridiem} className={value.meridiem === meridiem ? "selected" : ""}>
                <input
                  type="radio"
                  name={`${prefix}-meridiem`}
                  checked={value.meridiem === meridiem}
                  disabled={!value.birthTimeKnown}
                  onChange={() => onChange({ ...value, meridiem })}
                />
                {meridiem === "am" ? "오전" : "오후"}
              </label>
            ))}
          </div>
          <input
            id={id("birthTime")}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            enterKeyHint="next"
            maxLength={4}
            placeholder="예: 0930"
            value={value.birthTime}
            disabled={!value.birthTimeKnown}
            aria-labelledby={id("birthTime", "label")}
            aria-invalid={Boolean(birthTimeError)}
            aria-describedby={ariaDescribedBy(id("birthTime", "hint"), birthTimeError && id("birthTime", "error"))}
            onChange={(event) => onChange({ ...value, birthTime: numbersOnly(event.target.value, 4) })}
          />
        </div>
        <small id={id("birthTime", "hint")} className="field-hint">오전/오후를 고른 뒤 HHMM 4자리로 입력해 주세요. 자정은 오전 1200입니다.</small>
        <label className="check-row">
          <input
            type="checkbox"
            checked={!value.birthTimeKnown}
            onChange={(event) => onChange({
              ...value,
              birthTimeKnown: !event.target.checked,
              birthTime: event.target.checked ? "" : value.birthTime,
            })}
          />
          정확한 출생시간을 몰라요
        </label>
        {birthTimeError ? <small id={id("birthTime", "error")} className="field-error">{birthTimeError}</small> : null}
      </div>
    </fieldset>
  );
}
