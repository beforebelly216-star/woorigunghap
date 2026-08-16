"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CALENDAR_TYPES,
  GENDER_LABELS,
  GENDERS,
  RELATIONSHIP_LABELS,
  RELATIONSHIP_TYPES,
  type Gender,
  type OneToOneReportInput,
  type PersonBirthInput,
  type RelationshipType,
  validateOneToOneReportInput,
} from "@/lib/report-input";
import {
  createOneToOneOrderDraft,
  createRecoveredOneToOneOrderDraft,
  type OneToOneOrderDraft,
} from "@/lib/orders";
import { saveOrderDraft } from "@/lib/order-storage";
import { buildOneToOneResultUrl } from "@/lib/result-access-token";

type Meridiem = "am" | "pm";
type PersonFormState = {
  displayName: string;
  gender: Gender | "";
  calendarType: PersonBirthInput["calendarType"];
  birthDate: string;
  birthTimeKnown: boolean;
  birthTime: string;
  meridiem: Meridiem;
  isLeapMonth: boolean;
};
type FormState = {
  relationshipType: RelationshipType | "";
  personA: PersonFormState;
  personB: PersonFormState;
};

const emptyPerson = (): PersonFormState => ({
  displayName: "",
  gender: "",
  calendarType: "solar",
  birthDate: "",
  birthTimeKnown: true,
  birthTime: "",
  meridiem: "am",
  isLeapMonth: false,
});

const initialState: FormState = {
  relationshipType: "",
  personA: emptyPerson(),
  personB: emptyPerson(),
};

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

function toReportInput(form: FormState) {
  const errors: Record<string, string> = {};

  function normalizePerson(person: PersonFormState, prefix: "personA" | "personB"): PersonBirthInput | null {
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

    if (!birthDate || (person.birthTimeKnown && !birthTime)) return null;
    return {
      displayName: person.displayName,
      gender: person.gender as Gender,
      calendarType: person.calendarType,
      birthDate,
      birthTimeKnown: person.birthTimeKnown,
      birthTime,
      isLeapMonth: person.isLeapMonth,
    };
  }

  const personA = normalizePerson(form.personA, "personA");
  const personB = normalizePerson(form.personB, "personB");
  if (!personA || !personB || !form.relationshipType) return { input: null, errors };

  return {
    input: {
      relationshipType: form.relationshipType as RelationshipType,
      personA,
      personB,
    } satisfies OneToOneReportInput,
    errors,
  };
}

function PersonFields({
  title,
  prefix,
  value,
  errors,
  onChange,
}: {
  title: string;
  prefix: "personA" | "personB";
  value: PersonFormState;
  errors: Record<string, string>;
  onChange: (next: PersonFormState) => void;
}) {
  const error = (field: string) => errors[`${prefix}.${field}`];

  return (
    <fieldset className="person-panel">
      <legend>{title}</legend>

      <label className="field-stack">
        <span>이름 또는 별칭</span>
        <input
          type="text"
          maxLength={20}
          placeholder={prefix === "personA" ? "예: 나" : "예: 상대방"}
          value={value.displayName}
          onChange={(event) => onChange({ ...value, displayName: event.target.value })}
        />
        {error("displayName") ? <small className="field-error">{error("displayName")}</small> : null}
      </label>

      <div className="field-stack">
        <span>성별</span>
        <div className="segmented-control" role="radiogroup" aria-label={`${title} 성별`}>
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
        {error("gender") ? <small className="field-error">{error("gender")}</small> : null}
      </div>

      <div className="field-stack">
        <span>달력 기준</span>
        <div className="segmented-control" role="radiogroup" aria-label={`${title} 달력 기준`}>
          {CALENDAR_TYPES.map((calendarType) => (
            <label key={calendarType} className={value.calendarType === calendarType ? "selected" : ""}>
              <input
                type="radio"
                name={`${prefix}-calendar`}
                value={calendarType}
                checked={value.calendarType === calendarType}
                onChange={() =>
                  onChange({
                    ...value,
                    calendarType,
                    isLeapMonth: calendarType === "solar" ? false : value.isLeapMonth,
                  })
                }
              />
              {calendarType === "solar" ? "양력" : "음력"}
            </label>
          ))}
        </div>
      </div>

      <label className="field-stack">
        <span>생년월일</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          maxLength={8}
          placeholder="예: 19980815"
          value={value.birthDate}
          onChange={(event) => onChange({ ...value, birthDate: numbersOnly(event.target.value, 8) })}
        />
        <small className="field-hint">하이픈 없이 YYYYMMDD 8자리로 입력해 주세요.</small>
        {error("birthDate") ? <small className="field-error">{error("birthDate")}</small> : null}
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
        <span>출생시간</span>
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
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="예: 0930"
            value={value.birthTime}
            disabled={!value.birthTimeKnown}
            onChange={(event) => onChange({ ...value, birthTime: numbersOnly(event.target.value, 4) })}
          />
        </div>
        <small className="field-hint">오전/오후를 고른 뒤 HHMM 4자리로 입력해 주세요. 자정은 오전 1200입니다.</small>
        <label className="check-row">
          <input
            type="checkbox"
            checked={!value.birthTimeKnown}
            onChange={(event) =>
              onChange({
                ...value,
                birthTimeKnown: !event.target.checked,
                birthTime: event.target.checked ? "" : value.birthTime,
              })
            }
          />
          정확한 출생시간을 몰라요
        </label>
        {error("birthTime") ? <small className="field-error">{error("birthTime")}</small> : null}
      </div>
    </fieldset>
  );
}

export function OneToOneForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recoveryPaymentId = searchParams.get("recoverPaymentId");
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isContinuing, setIsContinuing] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsContinuing(false);

    const nextErrors: Record<string, string> = {};
    if (!form.relationshipType) nextErrors.relationshipType = "관계 유형을 선택해 주세요.";
    if (!form.personA.gender) nextErrors["personA.gender"] = "성별을 선택해 주세요.";
    if (!form.personB.gender) nextErrors["personB.gender"] = "성별을 선택해 주세요.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const normalized = toReportInput(form);
    if (Object.keys(normalized.errors).length > 0 || !normalized.input) {
      setErrors({ ...nextErrors, ...normalized.errors });
      return;
    }

    const input = normalized.input;
    const result = validateOneToOneReportInput(input);
    setErrors(result.errors);
    if (!result.valid) return;

    setIsContinuing(true);

    if (recoveryPaymentId) {
      try {
        const recovered = createRecoveredOneToOneOrderDraft(input, recoveryPaymentId);
        saveOrderDraft(recovered);
        router.push(buildOneToOneResultUrl(recovered.paymentId, recovered.resultAccessToken));
      } catch {
        setErrors({ form: "기존 결제번호를 복구하지 못했어요. 결과 화면에서 다시 복구를 시작해 주세요." });
        setIsContinuing(false);
      }
      return;
    }

    let order: OneToOneOrderDraft;
    try {
      const response = await fetch("/api/orders/one-to-one", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const payload = await response.json().catch(() => null) as { order?: OneToOneOrderDraft } | null;
      if (!response.ok || !payload?.order) throw new Error("ORDER_DRAFT_UNAVAILABLE");
      order = payload.order;
    } catch {
      // The original browser-only draft remains a safe checkout fallback when
      // a first database connection is not yet configured or is transiently down.
      order = createOneToOneOrderDraft(input);
    }
    saveOrderDraft(order);
    router.push(`/one-to-one/checkout?paymentId=${encodeURIComponent(order.paymentId)}`);
  }

  return (
    <form className="compatibility-form" onSubmit={submit} noValidate>
      {recoveryPaymentId ? (
        <div className="checkout-state">
          <strong>기존 결제 복구 중</strong>
          <p>결제는 다시 하지 않아요. 아래 두 사람의 정보를 다시 입력하면 기존 결제를 확인한 뒤 결과만 재생성합니다.</p>
        </div>
      ) : null}

      {errors.form ? <p className="field-error">{errors.form}</p> : null}

      <section className="form-section relationship-section">
        <h2>어떤 관계를 보고 싶나요?</h2>
        <div className="relationship-options" role="radiogroup" aria-label="관계 유형">
          {RELATIONSHIP_TYPES.map((relationshipType) => (
            <label key={relationshipType} className={form.relationshipType === relationshipType ? "selected" : ""}>
              <input
                type="radio"
                name="relationshipType"
                value={relationshipType}
                checked={form.relationshipType === relationshipType}
                onChange={() => setForm({ ...form, relationshipType })}
              />
              {RELATIONSHIP_LABELS[relationshipType]}
            </label>
          ))}
        </div>
        {errors.relationshipType ? <small className="field-error">{errors.relationshipType}</small> : null}
      </section>

      <div className="people-grid">
        <PersonFields
          title="첫 번째 사람"
          prefix="personA"
          value={form.personA}
          errors={errors}
          onChange={(personA) => setForm({ ...form, personA })}
        />
        <PersonFields
          title="두 번째 사람"
          prefix="personB"
          value={form.personB}
          errors={errors}
          onChange={(personB) => setForm({ ...form, personB })}
        />
      </div>

      <button type="submit" className="primary-action" disabled={isContinuing}>
        {isContinuing
          ? recoveryPaymentId ? "기존 결제로 결과 복구 중..." : "결제 단계로 이동 중..."
          : recoveryPaymentId ? "결제 없이 결과 다시 생성하기" : "입력 확인하고 계속하기"}
      </button>
    </form>
  );
}
