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
} from "@/lib/orders";
import { saveOrderDraft } from "@/lib/order-storage";

type PersonFormState = Omit<PersonBirthInput, "gender"> & { gender: Gender | "" };
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
  isLeapMonth: false,
});

const initialState: FormState = {
  relationshipType: "",
  personA: emptyPerson(),
  personB: emptyPerson(),
};

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
        {value.calendarType === "solar" ? (
          <input
            type="date"
            min="1900-01-01"
            value={value.birthDate}
            onChange={(event) => onChange({ ...value, birthDate: event.target.value })}
          />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="예: 1998-08-15"
            value={value.birthDate}
            onChange={(event) => onChange({ ...value, birthDate: event.target.value })}
          />
        )}
        {value.calendarType === "lunar" ? <small className="field-hint">음력 날짜를 YYYY-MM-DD 형식으로 입력해 주세요.</small> : null}
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
        <input
          type="time"
          value={value.birthTime ?? ""}
          disabled={!value.birthTimeKnown}
          onChange={(event) => onChange({ ...value, birthTime: event.target.value })}
        />
        <label className="check-row">
          <input
            type="checkbox"
            checked={!value.birthTimeKnown}
            onChange={(event) =>
              onChange({
                ...value,
                birthTimeKnown: !event.target.checked,
                birthTime: event.target.checked ? null : "",
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

  function submit(event: FormEvent<HTMLFormElement>) {
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

    const input: OneToOneReportInput = {
      relationshipType: form.relationshipType as RelationshipType,
      personA: { ...form.personA, gender: form.personA.gender as Gender },
      personB: { ...form.personB, gender: form.personB.gender as Gender },
    };
    const result = validateOneToOneReportInput(input);
    setErrors(result.errors);
    if (!result.valid) return;

    setIsContinuing(true);

    if (recoveryPaymentId) {
      try {
        const recovered = createRecoveredOneToOneOrderDraft(input, recoveryPaymentId);
        saveOrderDraft(recovered);
        router.push(`/one-to-one/result?paymentId=${encodeURIComponent(recovered.paymentId)}&recovered=1`);
      } catch {
        setErrors({ form: "기존 결제번호를 복구하지 못했어요. 결과 화면에서 다시 복구를 시작해 주세요." });
        setIsContinuing(false);
      }
      return;
    }

    const order = createOneToOneOrderDraft(input);
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
