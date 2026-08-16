"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ONE_TO_MANY_MAX_CANDIDATES,
  ONE_TO_MANY_MIN_CANDIDATES,
  RELATIONSHIP_LABELS,
  RELATIONSHIP_TYPES,
  parseOneToManyReportInput,
  type OneToManyReportInput,
  type PersonBirthInput,
  type RelationshipType,
  validateOneToManyReportInput,
} from "@/lib/report-input";
import {
  createEmptyPersonBirthForm,
  normalizePersonBirthForm,
  PersonBirthFields,
  type PersonBirthFormState,
} from "@/components/person-birth-fields";

type FormState = {
  relationshipType: RelationshipType | "";
  referencePerson: PersonBirthFormState;
  candidates: PersonBirthFormState[];
};

const ONE_TO_MANY_INPUT_DRAFT_KEY = "woorigunghap:one-to-many-input:v1";

function createInitialState(): FormState {
  return {
    relationshipType: "",
    referencePerson: createEmptyPersonBirthForm(),
    candidates: [createEmptyPersonBirthForm(), createEmptyPersonBirthForm()],
  };
}

function toPersonBirthForm(person: PersonBirthInput): PersonBirthFormState {
  const [hourText = "", minute = ""] = person.birthTime?.split(":") ?? [];
  const hour = Number(hourText);
  const meridiem = hour >= 12 ? "pm" : "am";
  const twelveHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return {
    displayName: person.displayName,
    gender: person.gender,
    calendarType: person.calendarType,
    birthDate: person.birthDate.replaceAll("-", ""),
    birthTimeKnown: person.birthTimeKnown,
    birthTime: person.birthTimeKnown ? `${String(twelveHour).padStart(2, "0")}${minute}` : "",
    meridiem,
    isLeapMonth: person.isLeapMonth,
  };
}

function toReportInput(form: FormState) {
  const errors: Record<string, string> = {};
  const reference = normalizePersonBirthForm(form.referencePerson, "referencePerson");
  Object.assign(errors, reference.errors);

  const candidates = form.candidates.map((candidate, index) => {
    const normalized = normalizePersonBirthForm(candidate, `candidates.${index}`);
    Object.assign(errors, normalized.errors);
    return normalized.person;
  });

  if (!form.relationshipType || !reference.person || candidates.some((candidate) => !candidate)) {
    return { input: null, errors };
  }

  return {
    input: {
      relationshipType: form.relationshipType,
      referencePerson: reference.person,
      candidates,
    } as OneToManyReportInput,
    errors,
  };
}

export function OneToManyForm() {
  const [form, setForm] = useState<FormState>(createInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const stored = window.localStorage.getItem(ONE_TO_MANY_INPUT_DRAFT_KEY);
      if (!stored) return;
      const parsed = parseOneToManyReportInput(JSON.parse(stored));
      if (!parsed || !validateOneToManyReportInput(parsed).valid) return;
      queueMicrotask(() => {
        if (!active) return;
        setForm({
          relationshipType: parsed.relationshipType,
          referencePerson: toPersonBirthForm(parsed.referencePerson),
          candidates: parsed.candidates.map(toPersonBirthForm),
        });
        setSaved(true);
      });
    } catch {
      window.localStorage.removeItem(ONE_TO_MANY_INPUT_DRAFT_KEY);
    }
    return () => {
      active = false;
    };
  }, []);

  function updateCandidate(index: number, candidate: PersonBirthFormState) {
    setSaved(false);
    setForm((current) => ({
      ...current,
      candidates: current.candidates.map((item, itemIndex) => itemIndex === index ? candidate : item),
    }));
  }

  function addCandidate() {
    setSaved(false);
    setForm((current) => current.candidates.length >= ONE_TO_MANY_MAX_CANDIDATES
      ? current
      : { ...current, candidates: [...current.candidates, createEmptyPersonBirthForm()] });
  }

  function removeCandidate(index: number) {
    setSaved(false);
    setForm((current) => current.candidates.length <= ONE_TO_MANY_MIN_CANDIDATES
      ? current
      : { ...current, candidates: current.candidates.filter((_, itemIndex) => itemIndex !== index) });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    const nextErrors: Record<string, string> = {};
    if (!form.relationshipType) nextErrors.relationshipType = "관계 유형을 선택해 주세요.";
    if (!form.referencePerson.gender) nextErrors["referencePerson.gender"] = "성별을 선택해 주세요.";
    form.candidates.forEach((candidate, index) => {
      if (!candidate.gender) nextErrors[`candidates.${index}.gender`] = "성별을 선택해 주세요.";
    });

    const normalized = toReportInput(form);
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.input) {
      setErrors(nextErrors);
      return;
    }

    const result = validateOneToManyReportInput(normalized.input);
    Object.assign(nextErrors, result.errors);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      window.localStorage.setItem(ONE_TO_MANY_INPUT_DRAFT_KEY, JSON.stringify(normalized.input));
    } catch {
      setErrors({ form: "입력은 확인됐지만 이 브라우저에 임시 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요." });
      return;
    }
    setSaved(true);
  }

  return (
    <form className="compatibility-form" onSubmit={submit} noValidate>
      {errors.form ? <p className="field-error">{errors.form}</p> : null}

      <section className="form-section relationship-section">
        <h2>모두 어떤 관계로 비교할까요?</h2>
        <p className="section-copy">한 번의 비교에서는 모든 후보에게 같은 관계 유형을 적용해요.</p>
        <div className="relationship-options" role="radiogroup" aria-label="관계 유형">
          {RELATIONSHIP_TYPES.map((relationshipType) => (
            <label key={relationshipType} className={form.relationshipType === relationshipType ? "selected" : ""}>
              <input
                type="radio"
                name="relationshipType"
                value={relationshipType}
                checked={form.relationshipType === relationshipType}
                onChange={() => {
                  setSaved(false);
                  setForm({ ...form, relationshipType });
                }}
              />
              {RELATIONSHIP_LABELS[relationshipType]}
            </label>
          ))}
        </div>
        {errors.relationshipType ? <small className="field-error">{errors.relationshipType}</small> : null}
      </section>

      <section className="one-to-many-group" aria-labelledby="reference-person-title">
        <div className="group-heading">
          <div>
            <p className="card-label">기준자</p>
            <h2 id="reference-person-title">비교의 중심이 되는 사람</h2>
          </div>
        </div>
        <PersonBirthFields
          title="기준자 정보"
          prefix="referencePerson"
          placeholder="예: 나"
          value={form.referencePerson}
          errors={errors}
          onChange={(referencePerson) => {
            setSaved(false);
            setForm({ ...form, referencePerson });
          }}
        />
      </section>

      <section className="one-to-many-group" aria-labelledby="candidate-title">
        <div className="group-heading">
          <div>
            <p className="card-label">비교 대상</p>
            <h2 id="candidate-title">후보 {form.candidates.length}명</h2>
            <p>최소 {ONE_TO_MANY_MIN_CANDIDATES}명, 최대 {ONE_TO_MANY_MAX_CANDIDATES}명까지 같은 기준으로 비교해요.</p>
          </div>
          <button
            type="button"
            className="secondary-action"
            onClick={addCandidate}
            disabled={form.candidates.length >= ONE_TO_MANY_MAX_CANDIDATES}
          >
            + 후보 추가
          </button>
        </div>
        {errors.candidates ? <small className="field-error">{errors.candidates}</small> : null}

        <div className="candidate-grid">
          {form.candidates.map((candidate, index) => (
            <div className="candidate-card" key={index}>
              {form.candidates.length > ONE_TO_MANY_MIN_CANDIDATES ? (
                <button
                  type="button"
                  className="candidate-remove"
                  onClick={() => removeCandidate(index)}
                  aria-label={`후보 ${index + 1} 삭제`}
                >
                  삭제
                </button>
              ) : null}
              <PersonBirthFields
                title={`후보 ${index + 1}`}
                prefix={`candidates.${index}`}
                placeholder={`예: 후보 ${index + 1}`}
                value={candidate}
                errors={errors}
                onChange={(next) => updateCandidate(index, next)}
              />
            </div>
          ))}
        </div>
      </section>

      {saved ? (
        <div className="form-success" role="status">
          <strong>Day 13 입력 확인 완료</strong>
          <p>기준자 1명과 후보 {form.candidates.length}명의 입력을 이 브라우저에 임시 저장했어요. 실제 입력 결과는 Day 16 결제 검증 뒤에 연결됩니다.</p>
          <Link href="/one-to-many/result/demo" className="form-preview-link">Day 15 고정 결과 화면 보기 →</Link>
        </div>
      ) : null}

      <button type="submit" className="primary-action">입력 검증하고 임시 저장하기</button>
    </form>
  );
}
