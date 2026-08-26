"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { focusFirstInvalidField } from "@/lib/form-accessibility";
import {
  COWORKER_HIERARCHIES,
  COWORKER_HIERARCHY_LABELS,
  GENDER_LABELS,
  MAX_MOST_CURIOUS_LENGTH,
  MAX_RELATIONSHIP_DURATION_MONTHS,
  RELATIONSHIP_LABELS,
  RELATIONSHIP_TYPES,
  type CoworkerHierarchy,
  type OneToOneReportInput,
  type PersonBirthInput,
  type RelationshipType,
  validateOneToOneReportInput,
} from "@/lib/report-input";
import {
  createEmptyPersonBirthForm,
  normalizePersonBirthForm,
  PersonBirthFields,
  type PersonBirthFormState,
} from "@/components/person-birth-fields";
import {
  FREE_SELF_PERSON_STORAGE_KEY,
  parseFreeSelfPerson,
} from "@/lib/free-self-analysis-contract";
import {
  createOneToOneOrderDraft,
  createRecoveredOneToOneOrderDraft,
  type OneToOneOrderDraft,
} from "@/lib/orders";
import { saveOrderDraft } from "@/lib/order-storage";
import { buildOneToOneResultUrl } from "@/lib/result-access-token";
import {
  PARTNER_INFORMATION_LEVEL_COPY,
  partnerInformationLevelFromPerson,
} from "@/lib/partner-information-level";
import { ZootopiMark } from "@/components/zootopi-mark";

type FormState = {
  relationshipType: RelationshipType | "";
  coworkerHierarchy: CoworkerHierarchy | "";
  relationshipDurationMonths: string;
  mostCurious: string;
  personA: PersonBirthFormState;
  personB: PersonBirthFormState;
};

const initialState: FormState = {
  relationshipType: "",
  coworkerHierarchy: "",
  relationshipDurationMonths: "",
  mostCurious: "",
  personA: createEmptyPersonBirthForm(),
  personB: createEmptyPersonBirthForm(),
};

const STEP_LABELS = ["내 정보", "상대방 정보", "확인"] as const;
const LAST_STEP = STEP_LABELS.length - 1;

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
  const personA = normalizePersonBirthForm(form.personA, "personA");
  const personB = normalizePersonBirthForm(form.personB, "personB");
  const errors = { ...personA.errors, ...personB.errors };

  if (!personA.person || !personB.person || !form.relationshipType) {
    return { input: null, errors };
  }

  const duration = form.relationshipType === "crush" || !form.relationshipDurationMonths
    ? null
    : Number(form.relationshipDurationMonths);

  return {
    input: {
      relationshipType: form.relationshipType,
      coworkerHierarchy: form.relationshipType === "coworker" && form.coworkerHierarchy
        ? form.coworkerHierarchy
        : null,
      relationshipDurationMonths: duration,
      mostCurious: form.mostCurious.trim() || null,
      personA: personA.person,
      personB: personB.person,
    } satisfies OneToOneReportInput,
    errors,
  };
}

function displayBirthDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value || "미입력";
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6, 8)}`;
}

function displayBirthTime(person: PersonBirthFormState) {
  if (!person.birthTimeKnown) return "모름";
  return person.birthTime || "미입력";
}

function PersonSummary({ title, person, onEdit }: { title: string; person: PersonBirthFormState; onEdit: () => void }) {
  return (
    <article className="v3-review-card">
      <div className="v3-review-card-head">
        <strong>{title}</strong>
        <button type="button" onClick={onEdit}>수정</button>
      </div>
      <dl>
        <div><dt>이름 또는 별칭</dt><dd>{person.displayName || "미입력"}</dd></div>
        <div><dt>성별</dt><dd>{person.gender ? GENDER_LABELS[person.gender] : "미입력"}</dd></div>
        <div><dt>달력</dt><dd>{person.calendarType === "solar" ? "양력" : person.isLeapMonth ? "음력 · 윤달" : "음력"}</dd></div>
        <div><dt>생년월일</dt><dd>{displayBirthDate(person.birthDate)}</dd></div>
        <div><dt>출생시간</dt><dd>{displayBirthTime(person)}</dd></div>
      </dl>
    </article>
  );
}

export function OneToOneFormV3() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recoveryPaymentId = searchParams.get("recoverPaymentId");
  const fromFree = searchParams.get("from") === "free";
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isContinuing, setIsContinuing] = useState(false);
  const [freePrefilled, setFreePrefilled] = useState(false);
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const partnerInformationLevel = partnerInformationLevelFromPerson(form.personB);
  const partnerInformationCopy = PARTNER_INFORMATION_LEVEL_COPY[partnerInformationLevel];

  useEffect(() => {
    let active = true;
    if (!fromFree || recoveryPaymentId) return;

    try {
      const stored = window.sessionStorage.getItem(FREE_SELF_PERSON_STORAGE_KEY);
      if (!stored) return;
      const parsed = parseFreeSelfPerson(JSON.parse(stored));
      if (!parsed) return;
      queueMicrotask(() => {
        if (!active) return;
        setForm((current) => ({ ...current, personA: toPersonBirthForm(parsed) }));
        setFreePrefilled(true);
      });
    } catch {
      window.sessionStorage.removeItem(FREE_SELF_PERSON_STORAGE_KEY);
    }

    return () => {
      active = false;
    };
  }, [fromFree, recoveryPaymentId]);

  function showErrors(formElement: HTMLFormElement, nextErrors: Record<string, string>) {
    setErrors(nextErrors);
    focusFirstInvalidField(formElement);
  }

  function validateStep(currentStep: number): boolean {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!form.relationshipType) nextErrors.relationshipType = "관계 유형을 선택해 주세요.";
      if (form.relationshipType === "coworker" && !form.coworkerHierarchy) {
        nextErrors.coworkerHierarchy = "상대방의 직장 내 위치를 선택해 주세요.";
      }
      if (!form.personA.gender) nextErrors["personA.gender"] = "성별을 선택해 주세요.";
      Object.assign(nextErrors, normalizePersonBirthForm(form.personA, "personA").errors);
    } else if (currentStep === 1) {
      if (!form.personB.gender) nextErrors["personB.gender"] = "성별을 선택해 주세요.";
      Object.assign(nextErrors, normalizePersonBirthForm(form.personB, "personB").errors);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsContinuing(false);
    const formElement = event.currentTarget;

    const nextErrors: Record<string, string> = {};
    if (!form.relationshipType) nextErrors.relationshipType = "관계 유형을 선택해 주세요.";
    if (form.relationshipType === "coworker" && !form.coworkerHierarchy) {
      nextErrors.coworkerHierarchy = "상대방의 직장 내 위치를 선택해 주세요.";
    }
    if (!form.personA.gender) nextErrors["personA.gender"] = "성별을 선택해 주세요.";
    if (!form.personB.gender) nextErrors["personB.gender"] = "성별을 선택해 주세요.";

    const normalized = toReportInput(form);
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.input || Object.keys(nextErrors).length > 0) {
      showErrors(formElement, nextErrors);
      return;
    }

    const input = normalized.input;
    const result = validateOneToOneReportInput(input, { requireCoworkerHierarchy: true });
    if (!result.valid) {
      showErrors(formElement, result.errors);
      return;
    }

    setErrors({});
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
      order = createOneToOneOrderDraft(input);
    }

    saveOrderDraft(order);
    router.push(`/one-to-one/checkout?paymentId=${encodeURIComponent(order.paymentId)}`);
  }

  return (
    <form className="compatibility-form v3-one-to-one-form" onSubmit={submit} noValidate ref={formRef}>
      {recoveryPaymentId ? (
        <div className="checkout-state recovery-state" role="status">
          <strong>기존 결제 복구 중</strong>
          <p>결제는 다시 하지 않습니다. 결제 당시 정보를 확인해 기존 결과를 복구합니다.</p>
        </div>
      ) : null}

      {freePrefilled ? (
        <div className="form-success" role="status">
          <strong>무료 분석에서 입력한 내 정보를 이어왔습니다.</strong>
          <p>내 정보는 미리 채워두었습니다. 관계와 상대방 정보만 이어서 확인해 주세요.</p>
        </div>
      ) : null}

      {errors.form ? <p className="field-error form-error-summary" role="alert">{errors.form}</p> : null}

      <div className="step-progress v3-step-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEP_LABELS.length}>
        <ol className="v3-step-list">
          {STEP_LABELS.map((label, index) => (
            <li key={label} className={index <= step ? "is-active" : ""} aria-current={index === step ? "step" : undefined}>
              <span>{index < step ? "✓" : index + 1}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>
      </div>

      {step === 0 ? (
        <>
          <div className="v3-guide-card">
            <div>
              <strong>먼저, 내 정보와 관계를 알려주세요.</strong>
              <p>무료 분석에서 넘어왔다면 내 정보가 자동으로 채워져 있습니다.</p>
            </div>
            <ZootopiMark expression="smile" withBody />
          </div>

          <section className="form-section relationship-section v3-card-section">
            <h2 id="one-to-one-relationship-label">어떤 관계를 보고 싶나요?</h2>
            <div
              className="relationship-options"
              role="radiogroup"
              aria-labelledby="one-to-one-relationship-label"
              aria-invalid={Boolean(errors.relationshipType)}
              aria-describedby={errors.relationshipType ? "one-to-one-relationship-error" : undefined}
            >
              {RELATIONSHIP_TYPES.map((relationshipType) => (
                <label key={relationshipType} className={form.relationshipType === relationshipType ? "selected" : ""}>
                  <input
                    type="radio"
                    name="relationshipType"
                    value={relationshipType}
                    checked={form.relationshipType === relationshipType}
                    onChange={() => setForm({
                      ...form,
                      relationshipType,
                      coworkerHierarchy: relationshipType === "coworker" ? form.coworkerHierarchy : "",
                      relationshipDurationMonths: relationshipType === "crush" ? "" : form.relationshipDurationMonths,
                    })}
                  />
                  {RELATIONSHIP_LABELS[relationshipType]}
                </label>
              ))}
            </div>
            {errors.relationshipType ? <small id="one-to-one-relationship-error" className="field-error">{errors.relationshipType}</small> : null}
          </section>

          {form.relationshipType && form.relationshipType !== "crush" ? (
            <section className="form-section relationship-context-section v3-compact-section">
              <label className="field-stack" htmlFor="relationshipDurationMonths">
                <span>관계 기간 (개월, 선택)</span>
                <input
                  id="relationshipDurationMonths"
                  name="relationshipDurationMonths"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="예: 8"
                  value={form.relationshipDurationMonths}
                  aria-invalid={Boolean(errors.relationshipDurationMonths)}
                  aria-describedby={errors.relationshipDurationMonths ? "relationship-duration-error" : "relationship-duration-help"}
                  onChange={(event) => setForm({
                    ...form,
                    relationshipDurationMonths: event.target.value.replace(/\D/g, "").slice(0, 4),
                  })}
                />
                <small id="relationship-duration-help" className="field-hint">현재 관계 기간을 선택적으로 반영합니다. 최대 {MAX_RELATIONSHIP_DURATION_MONTHS}개월.</small>
                {errors.relationshipDurationMonths ? <small id="relationship-duration-error" className="field-error">{errors.relationshipDurationMonths}</small> : null}
              </label>
            </section>
          ) : null}

          {form.relationshipType === "coworker" ? (
            <section className="form-section relationship-section coworker-hierarchy-section v3-compact-section">
              <h2 id="coworker-hierarchy-label">상대방과의 업무 관계</h2>
              <div
                className="relationship-options"
                role="radiogroup"
                aria-labelledby="coworker-hierarchy-label"
                aria-invalid={Boolean(errors.coworkerHierarchy)}
                aria-describedby={errors.coworkerHierarchy ? "coworker-hierarchy-error" : undefined}
              >
                {COWORKER_HIERARCHIES.map((hierarchy) => (
                  <label key={hierarchy} className={form.coworkerHierarchy === hierarchy ? "selected" : ""}>
                    <input
                      type="radio"
                      name="coworkerHierarchy"
                      value={hierarchy}
                      checked={form.coworkerHierarchy === hierarchy}
                      onChange={() => setForm({ ...form, coworkerHierarchy: hierarchy })}
                    />
                    {COWORKER_HIERARCHY_LABELS[hierarchy]}
                  </label>
                ))}
              </div>
              {errors.coworkerHierarchy ? <small id="coworker-hierarchy-error" className="field-error">{errors.coworkerHierarchy}</small> : null}
            </section>
          ) : null}

          <div className="people-grid people-grid-single v3-person-card">
            <PersonBirthFields
              title="나"
              prefix="personA"
              placeholder="예: 나 또는 별칭"
              value={form.personA}
              errors={errors}
              onChange={(personA) => setForm({ ...form, personA })}
            />
          </div>

          <div className="step-nav v3-step-nav">
            <button type="button" className="primary-action" onClick={goNext}>다음 · 상대방 정보 입력하기 →</button>
          </div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <div className="v3-guide-card">
            <div>
              <strong>이제 상대방 정보를 입력해 주세요.</strong>
              <p>출생시간을 몰라도 분석은 가능합니다. 아는 만큼만 정확하게 입력해 주세요.</p>
            </div>
            <ZootopiMark expression="idea" withBody />
          </div>

          <div className="people-grid people-grid-single v3-person-card">
            <PersonBirthFields
              title="상대방"
              prefix="personB"
              placeholder="예: 상대방 또는 별칭"
              value={form.personB}
              errors={errors}
              onChange={(personB) => setForm({ ...form, personB })}
            />
          </div>

          <div className="step-nav v3-step-nav">
            <button type="button" className="secondary-action" onClick={goBack}>이전</button>
            <button type="button" className="primary-action" onClick={goNext}>다음 · 입력 정보 확인하기 →</button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className="v3-guide-card v3-guide-card-confirm">
            <div>
              <strong>입력한 정보를 마지막으로 확인해 주세요.</strong>
              <p>문제가 없으면 결제 단계로 이동합니다. 아직 유료 AI 생성은 시작하지 않습니다.</p>
            </div>
            <ZootopiMark expression="smile" withBody />
          </div>

          <section className="v3-review-section" aria-label="입력 정보 확인">
            <div className="v3-relationship-summary">
              <span>관계</span>
              <strong>{form.relationshipType ? RELATIONSHIP_LABELS[form.relationshipType] : "미선택"}</strong>
            </div>
            <PersonSummary title="나" person={form.personA} onEdit={() => setStep(0)} />
            <PersonSummary title="상대방" person={form.personB} onEdit={() => setStep(1)} />
          </section>

          <section className="form-section relationship-context-section v3-card-section">
            <h2>가장 궁금한 것 한 가지가 있나요?</h2>
            <p className="section-copy">선택 항목입니다. 계산 근거로 답할 수 있는 범위에서 상세 리포트에 반영합니다.</p>
            <label className="field-stack" htmlFor="mostCurious">
              <span>가장 궁금한 점</span>
              <textarea
                id="mostCurious"
                name="mostCurious"
                className="relationship-context-textarea"
                maxLength={MAX_MOST_CURIOUS_LENGTH}
                placeholder="예: 싸운 뒤 누가 먼저 어떻게 대화를 시작하는 게 좋을까요?"
                value={form.mostCurious}
                aria-invalid={Boolean(errors.mostCurious)}
                aria-describedby={errors.mostCurious ? "most-curious-error" : "most-curious-help"}
                onChange={(event) => setForm({ ...form, mostCurious: event.target.value })}
              />
              <div className="relationship-context-meta">
                <small id="most-curious-help" className="field-hint">이름·연락처 같은 민감정보는 적지 않아도 됩니다.</small>
                <small aria-label="입력 글자 수">{form.mostCurious.length}/{MAX_MOST_CURIOUS_LENGTH}</small>
              </div>
              {errors.mostCurious ? <small id="most-curious-error" className="field-error">{errors.mostCurious}</small> : null}
            </label>
          </section>

          <div className="form-success v3-info-level" role="status" aria-live="polite">
            <strong>상대 정보 수준 {partnerInformationLevel}</strong>
            <p>{partnerInformationCopy.short}. {partnerInformationCopy.detail}</p>
          </div>

          <div className="step-nav v3-step-nav">
            <button type="button" className="secondary-action" onClick={goBack}>이전</button>
            <button type="submit" className="primary-action" disabled={isContinuing} aria-busy={isContinuing}>
              {isContinuing
                ? recoveryPaymentId ? "기존 결제로 결과 복구 중..." : "결제 단계로 이동 중..."
                : recoveryPaymentId ? "결제 없이 결과 복구하기" : "입력 확인하고 결제 단계로 →"}
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
