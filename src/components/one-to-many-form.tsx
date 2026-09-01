"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OneToManyOrderDraft } from "@/lib/orders";
import { saveOrderDraft } from "@/lib/order-storage";
import { focusFirstInvalidField } from "@/lib/form-accessibility";
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
  clearPersonBirthFieldError,
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
const STEP_LABELS = ["기본 정보", "후보 정보", "확인"] as const;
const LAST_STEP = STEP_LABELS.length - 1;

function createInitialState(): FormState {
  return {
    relationshipType: "",
    referencePerson: createEmptyPersonBirthForm(),
    candidates: [createEmptyPersonBirthForm(), createEmptyPersonBirthForm()],
  };
}

function toPersonBirthForm(person: PersonBirthInput): PersonBirthFormState {
  return {
    displayName: person.displayName,
    gender: person.gender,
    calendarType: person.calendarType,
    birthDate: person.birthDate.replaceAll("-", ""),
    birthTimeKnown: person.birthTimeKnown,
    birthTime: person.birthTimeKnown && person.birthTime ? person.birthTime.replace(":", "") : "",
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

function personSummary(person: PersonBirthFormState) {
  const date = person.birthDate || "생년월일 미입력";
  const time = person.birthTimeKnown ? (person.birthTime || "시간 미입력") : "시간 모름";
  return `${date} · ${time}`;
}

export function OneToManyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<FormState>(createInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [step, setStep] = useState(0);
  const [activeCandidate, setActiveCandidate] = useState(0);

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

  function showErrors(formElement: HTMLFormElement, nextErrors: Record<string, string>) {
    setErrors(nextErrors);
    focusFirstInvalidField(formElement);
  }

  function validateStep(currentStep: number) {
    const nextErrors: Record<string, string> = {};
    if (currentStep === 0) {
      if (!form.relationshipType) nextErrors.relationshipType = "관계 유형을 선택해 주세요.";
      if (!form.referencePerson.gender) nextErrors["referencePerson.gender"] = "성별을 선택해 주세요.";
      Object.assign(nextErrors, normalizePersonBirthForm(form.referencePerson, "referencePerson").errors);
    }
    if (currentStep === 1) {
      form.candidates.forEach((candidate, index) => {
        if (!candidate.gender) nextErrors[`candidates.${index}.gender`] = "성별을 선택해 주세요.";
        Object.assign(nextErrors, normalizePersonBirthForm(candidate, `candidates.${index}`).errors);
      });
    }
    if (Object.keys(nextErrors).length > 0) {
      if (formRef.current) showErrors(formRef.current, nextErrors);
      else setErrors(nextErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, LAST_STEP));
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  }

  function updateCandidate(index: number, candidate: PersonBirthFormState) {
    setSaved(false);
    setForm((current) => ({
      ...current,
      candidates: current.candidates.map((item, itemIndex) => itemIndex === index ? candidate : item),
    }));
  }

  function setCandidateCount(count: number) {
    const safeCount = Math.max(ONE_TO_MANY_MIN_CANDIDATES, Math.min(ONE_TO_MANY_MAX_CANDIDATES, count));
    setSaved(false);
    setForm((current) => {
      const next = [...current.candidates];
      while (next.length < safeCount) next.push(createEmptyPersonBirthForm());
      return { ...current, candidates: next.slice(0, safeCount) };
    });
    setActiveCandidate((current) => Math.min(current, safeCount - 1));
  }

  function addCandidate() {
    if (form.candidates.length >= ONE_TO_MANY_MAX_CANDIDATES) return;
    setCandidateCount(form.candidates.length + 1);
    setActiveCandidate(form.candidates.length);
  }

  function removeCandidate(index: number) {
    if (form.candidates.length <= ONE_TO_MANY_MIN_CANDIDATES) return;
    setSaved(false);
    setForm((current) => ({
      ...current,
      candidates: current.candidates.filter((_, itemIndex) => itemIndex !== index),
    }));
    setActiveCandidate((current) => Math.max(0, Math.min(current, form.candidates.length - 2)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const formElement = event.currentTarget;

    const nextErrors: Record<string, string> = {};
    if (!form.relationshipType) nextErrors.relationshipType = "관계 유형을 선택해 주세요.";
    if (!form.referencePerson.gender) nextErrors["referencePerson.gender"] = "성별을 선택해 주세요.";
    form.candidates.forEach((candidate, index) => {
      if (!candidate.gender) nextErrors[`candidates.${index}.gender`] = "성별을 선택해 주세요.";
    });

    const normalized = toReportInput(form);
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.input) {
      showErrors(formElement, nextErrors);
      return;
    }

    const result = validateOneToManyReportInput(normalized.input);
    Object.assign(nextErrors, result.errors);
    if (Object.keys(nextErrors).length > 0) {
      showErrors(formElement, nextErrors);
      return;
    }
    setErrors({});

    try {
      window.localStorage.setItem(ONE_TO_MANY_INPUT_DRAFT_KEY, JSON.stringify(normalized.input));
    } catch {
      setErrors({ form: "입력은 확인됐지만 이 브라우저에 임시 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요." });
      return;
    }
    setSaved(true);
    setIsContinuing(true);
    try {
      const response = await fetch("/api/orders/one-to-many", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: normalized.input }),
      });
      const payload = await response.json().catch(() => null) as { order?: OneToManyOrderDraft; error?: string } | null;
      if (!response.ok || !payload?.order) throw new Error(payload?.error ?? "ORDER_DRAFT_UNAVAILABLE");
      saveOrderDraft(payload.order);
      router.push(`/one-to-many/checkout?paymentId=${encodeURIComponent(payload.order.paymentId)}`);
    } catch (error) {
      setErrors({ form: error instanceof Error && !error.message.includes("ORDER_DRAFT")
        ? error.message
        : "안전한 주문 저장소를 확인하지 못했어요. 잠시 후 다시 시도해 주세요." });
      setIsContinuing(false);
    }
  }

  return (
    <form className="compatibility-form one-to-many-v3" onSubmit={submit} noValidate ref={formRef}>
      {errors.form ? <p className="field-error form-error-summary" role="alert">{errors.form}</p> : null}

      <div className="step-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEP_LABELS.length}>
        <div className="step-progress-track">
          {STEP_LABELS.map((label, index) => (
            <span key={label} className={`step-progress-item${index <= step ? " is-active" : ""}${index < step ? " is-done" : ""}`}>
              <span className="step-progress-dot">{index < step ? "✓" : index + 1}</span>
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {step === 0 ? (
        <>
          <section className="v3-intro-card">
            <p className="card-label">1:N 비교 궁합</p>
            <h2>여러 사람과의 궁합을 한 번에 비교해요.</h2>
            <p>관계 유형과 내 정보를 먼저 입력하고, 다음 단계에서 후보를 2~5명 추가합니다.</p>
          </section>

          <section className="form-section relationship-section">
            <h2 id="one-to-many-relationship-label">어떤 관계로 비교할까요?</h2>
            <div className="relationship-options" role="radiogroup" aria-labelledby="one-to-many-relationship-label" aria-invalid={Boolean(errors.relationshipType)}>
              {RELATIONSHIP_TYPES.map((relationshipType) => (
                <label key={relationshipType} className={form.relationshipType === relationshipType ? "selected" : ""}>
                  <input type="radio" name="relationshipType" value={relationshipType} checked={form.relationshipType === relationshipType} onChange={() => { setSaved(false); setForm({ ...form, relationshipType }); }} />
                  {RELATIONSHIP_LABELS[relationshipType]}
                </label>
              ))}
            </div>
            {errors.relationshipType ? <small className="field-error">{errors.relationshipType}</small> : null}
          </section>

          <section className="one-to-many-group" aria-labelledby="reference-person-title">
            <div className="group-heading"><div><p className="card-label">내 정보</p><h2 id="reference-person-title">비교의 기준이 되는 사람</h2></div></div>
            <PersonBirthFields title="내 정보" prefix="referencePerson" placeholder="예: 나" value={form.referencePerson} errors={errors} onChange={(referencePerson, changedField) => {
              setSaved(false);
              setForm((current) => ({ ...current, referencePerson }));
              setErrors((current) => clearPersonBirthFieldError(current, "referencePerson", changedField));
            }} />
          </section>

          <section className="candidate-count-section">
            <div><p className="card-label">비교 인원</p><h2>후보는 몇 명인가요?</h2><p>최소 2명, 최대 5명까지 비교할 수 있어요.</p></div>
            <div className="candidate-count-options" aria-label="후보 수 선택">
              {Array.from({ length: ONE_TO_MANY_MAX_CANDIDATES - ONE_TO_MANY_MIN_CANDIDATES + 1 }, (_, index) => ONE_TO_MANY_MIN_CANDIDATES + index).map((count) => (
                <button key={count} type="button" className={form.candidates.length === count ? "selected" : ""} onClick={() => setCandidateCount(count)}>{count}명</button>
              ))}
            </div>
          </section>

          <div className="step-nav"><button type="button" className="primary-action" onClick={goNext}>다음: 후보 정보 입력하기</button></div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <section className="candidate-stage-head">
            <div><p className="card-label">후보 정보</p><h2>비교할 상대를 입력해 주세요.</h2><p>후보 {form.candidates.length}명을 같은 기준으로 비교합니다.</p></div>
            <span className="candidate-counter">{activeCandidate + 1}/{form.candidates.length}</span>
          </section>

          <div className="candidate-tabs" role="tablist" aria-label="후보 선택">
            {form.candidates.map((candidate, index) => (
              <button key={index} type="button" role="tab" aria-selected={activeCandidate === index} className={activeCandidate === index ? "selected" : ""} onClick={() => setActiveCandidate(index)}>
                <span>후보 {index + 1}</span><small>{candidate.displayName || "미입력"}</small>
              </button>
            ))}
          </div>

          <div className="candidate-editor">
            <div className="candidate-editor-head">
              <strong>후보 {activeCandidate + 1}</strong>
              {form.candidates.length > ONE_TO_MANY_MIN_CANDIDATES ? <button type="button" className="candidate-remove" onClick={() => removeCandidate(activeCandidate)}>삭제</button> : null}
            </div>
            <PersonBirthFields title={`후보 ${activeCandidate + 1} 정보`} prefix={`candidates.${activeCandidate}`} placeholder={`예: 후보 ${activeCandidate + 1}`} value={form.candidates[activeCandidate]} errors={errors} onChange={(next, changedField) => {
              updateCandidate(activeCandidate, next);
              setErrors((current) => clearPersonBirthFieldError(current, `candidates.${activeCandidate}`, changedField));
            }} />
          </div>

          <button type="button" className="secondary-action add-candidate" onClick={addCandidate} disabled={form.candidates.length >= ONE_TO_MANY_MAX_CANDIDATES}>+ 후보 추가 (최대 5명)</button>

          <div className="step-nav"><button type="button" className="secondary-action" onClick={goBack}>이전</button><button type="button" className="primary-action" onClick={goNext}>다음: 입력 정보 확인하기</button></div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <section className="review-head"><p className="card-label">입력 정보 확인</p><h2>이대로 비교 분석을 시작할까요?</h2><p>잘못 입력한 정보가 있으면 해당 항목으로 돌아가 수정할 수 있어요.</p></section>

          <section className="review-block">
            <div className="review-block-head"><div><p className="card-label">관계 유형</p><strong>{form.relationshipType ? RELATIONSHIP_LABELS[form.relationshipType] : "미선택"}</strong></div><button type="button" onClick={() => setStep(0)}>수정</button></div>
          </section>

          <section className="review-block">
            <div className="review-block-head"><div><p className="card-label">내 정보</p><strong>{form.referencePerson.displayName || "나"}</strong><small>{personSummary(form.referencePerson)}</small></div><button type="button" onClick={() => setStep(0)}>수정</button></div>
          </section>

          <section className="review-block">
            <div className="review-block-head"><div><p className="card-label">후보 정보</p><strong>{form.candidates.length}명</strong></div><button type="button" onClick={() => setStep(1)}>수정</button></div>
            <div className="review-candidate-list">
              {form.candidates.map((candidate, index) => <div key={index}><span>후보 {index + 1}</span><strong>{candidate.displayName || `후보 ${index + 1}`}</strong><small>{personSummary(candidate)}</small></div>)}
            </div>
          </section>

          <aside className="analysis-tip"><strong>분석 팁</strong><p>후보를 3명 이상 입력하면 순위와 차이가 더 선명하게 보여요.</p></aside>

          {saved && !isContinuing ? <div className="form-success" role="status" aria-live="polite"><strong>입력 확인 완료</strong><p>기준자 1명과 후보 {form.candidates.length}명의 입력을 확인했어요.</p></div> : null}

          <div className="step-nav"><button type="button" className="secondary-action" onClick={goBack}>이전</button><button type="submit" className="primary-action" disabled={isContinuing} aria-busy={isContinuing}>{isContinuing ? "안전한 결제 단계로 이동 중..." : "1:N 궁합 분석 시작하기 · 3,000원"}</button></div>
        </>
      ) : null}
    </form>
  );
}
