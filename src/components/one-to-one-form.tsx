"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { focusFirstInvalidField } from "@/lib/form-accessibility";
import {
  COWORKER_HIERARCHIES,
  COWORKER_HIERARCHY_LABELS,
  MAX_MOST_CURIOUS_LENGTH,
  MAX_RELATIONSHIP_DURATION_MONTHS,
  RELATIONSHIP_LABELS,
  RELATIONSHIP_TYPES,
  type CoworkerHierarchy,
  type OneToOneReportInput,
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

export function OneToOneForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recoveryPaymentId = searchParams.get("recoverPaymentId");
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isContinuing, setIsContinuing] = useState(false);
  const partnerInformationLevel = partnerInformationLevelFromPerson(form.personB);
  const partnerInformationCopy = PARTNER_INFORMATION_LEVEL_COPY[partnerInformationLevel];

  function showErrors(formElement: HTMLFormElement, nextErrors: Record<string, string>) {
    setErrors(nextErrors);
    focusFirstInvalidField(formElement);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsContinuing(false);
    const formElement = event.currentTarget;

    const nextErrors: Record<string, string> = {};
    if (!form.relationshipType) nextErrors.relationshipType = "관계 유형을 선택해 주세요.";
    if (form.relationshipType === "coworker" && !form.coworkerHierarchy) {
      nextErrors.coworkerHierarchy = "두 번째 사람의 직장 내 위치를 선택해 주세요.";
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
    <form className="compatibility-form" onSubmit={submit} noValidate>
      {recoveryPaymentId ? (
        <div className="checkout-state recovery-state" role="status">
          <strong>기존 결제 복구 중</strong>
          <p>결제는 다시 하지 않아요. 결제 당시 입력했던 내용을 다시 입력하면 기존 결제를 확인해 결과를 복구합니다.</p>
        </div>
      ) : null}

      {errors.form ? <p className="field-error form-error-summary" role="alert">{errors.form}</p> : null}

      <section className="form-section relationship-section">
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
        <section className="form-section relationship-context-section">
          <h2>지금 관계를 조금만 알려주세요.</h2>
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
            <small id="relationship-duration-help" className="field-hint">썸·연인·친구·직장동료의 현재 관계 기간을 선택적으로 반영합니다. 최대 {MAX_RELATIONSHIP_DURATION_MONTHS}개월.</small>
            {errors.relationshipDurationMonths ? <small id="relationship-duration-error" className="field-error">{errors.relationshipDurationMonths}</small> : null}
          </label>
        </section>
      ) : null}

      {form.relationshipType === "coworker" ? (
        <section className="form-section relationship-section coworker-hierarchy-section">
          <h2 id="coworker-hierarchy-label">두 번째 사람은 나와 어떤 업무 관계인가요?</h2>
          <p className="field-help">첫 번째 사람 기준으로 선택해 주세요. 같은 사주 조합이어도 보고·피드백·역할 분담 조언이 달라집니다.</p>
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

      <div className="people-grid">
        <PersonBirthFields
          title="첫 번째 사람"
          prefix="personA"
          placeholder="예: 나"
          value={form.personA}
          errors={errors}
          onChange={(personA) => setForm({ ...form, personA })}
        />
        <PersonBirthFields
          title="두 번째 사람"
          prefix="personB"
          placeholder="예: 상대방"
          value={form.personB}
          errors={errors}
          onChange={(personB) => setForm({ ...form, personB })}
        />
      </div>

      <section className="form-section relationship-context-section">
        <h2>가장 궁금한 것 한 가지가 있나요?</h2>
        <p className="section-copy">선택 항목입니다. 계산 근거로 답할 수 있는 범위에서 CH0 또는 관계 전략에 직접 반영합니다.</p>
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

      <div className="form-success" role="status" aria-live="polite">
        <strong>상대 정보 수준 {partnerInformationLevel}</strong>
        <p>{partnerInformationCopy.short}. {partnerInformationCopy.detail}</p>
      </div>

      <button type="submit" className="primary-action" disabled={isContinuing} aria-busy={isContinuing}>
        {isContinuing
          ? recoveryPaymentId ? "기존 결제로 결과 복구 중..." : "결제 단계로 이동 중..."
          : recoveryPaymentId ? "결제 없이 결과 복구하기" : "입력 확인하고 계속하기"}
      </button>
    </form>
  );
}
