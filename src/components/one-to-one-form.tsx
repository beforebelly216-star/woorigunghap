"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { focusFirstInvalidField } from "@/lib/form-accessibility";
import {
  COWORKER_HIERARCHIES,
  COWORKER_HIERARCHY_LABELS,
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
  personA: PersonBirthFormState;
  personB: PersonBirthFormState;
};

const initialState: FormState = {
  relationshipType: "",
  coworkerHierarchy: "",
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

  return {
    input: {
      relationshipType: form.relationshipType,
      coworkerHierarchy: form.relationshipType === "coworker" && form.coworkerHierarchy
        ? form.coworkerHierarchy
        : null,
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
          <p>결제는 다시 하지 않아요. 아래 두 사람의 정보만 다시 입력하면 기존 결제를 확인해 결과를 복구합니다.</p>
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
                })}
              />
              {RELATIONSHIP_LABELS[relationshipType]}
            </label>
          ))}
        </div>
        {errors.relationshipType ? <small id="one-to-one-relationship-error" className="field-error">{errors.relationshipType}</small> : null}
      </section>

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
