"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearPersonBirthFieldError,
  createEmptyPersonBirthForm,
  normalizePersonBirthForm,
  PersonBirthFields,
  type PersonBirthFormState,
} from "@/components/person-birth-fields";
import { SOULMATE_PERSON_STORAGE_KEY } from "@/lib/soulmate-input-contract";
import {
  parseSoulmateResult,
  SOULMATE_RESULT_STORAGE_KEY,
} from "@/lib/soulmate-result-contract";
import styles from "./soulmate-input-form.module.css";

export function SoulmateInputForm() {
  const router = useRouter();
  const [person, setPerson] = useState<PersonBirthFormState>(createEmptyPersonBirthForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const nextErrors: Record<string, string> = {};
    if (!person.displayName.trim()) nextErrors["soulmate.displayName"] = "이름 또는 별칭을 입력해 주세요.";
    if (!person.gender) nextErrors["soulmate.gender"] = "성별을 선택해 주세요.";
    const normalized = normalizePersonBirthForm(person, "soulmate");
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.person || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      window.sessionStorage.setItem(SOULMATE_PERSON_STORAGE_KEY, JSON.stringify(normalized.person));
      const response = await fetch("/api/free/soulmate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ person: normalized.person }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      const result = parseSoulmateResult(payload);
      if (!response.ok || !result) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "천생연분 결과를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setErrors({ form: message });
        return;
      }
      window.sessionStorage.setItem(SOULMATE_RESULT_STORAGE_KEY, JSON.stringify(result));
      router.push("/free/result");
    } catch {
      setErrors({ form: "천생연분 결과를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {errors.form ? <p className="field-error form-error-summary" role="alert">{errors.form}</p> : null}
      <div className={styles.card}>
        <PersonBirthFields
          title=""
          prefix="soulmate"
          placeholder="예) 지민, 나연, 별이"
          value={person}
          errors={errors}
          onChange={(next, changedField) => {
            setPerson(next);
            setErrors((current) => clearPersonBirthFieldError(current, "soulmate", changedField));
          }}
        />
      </div>

      <aside className={styles.privacy}>
        <span className={styles.bulb} aria-hidden="true">💡</span>
        <div><strong>입력하신 정보는 안전하게 보호해요</strong><p>무료 천생연분은 서버의 사주 계산 로직으로 분석하며, 유료 결제나 외부 AI 호출 없이 결과를 확인할 수 있어요.</p></div>
        <span className={styles.lock} aria-hidden="true">🔒</span>
      </aside>

      <button type="submit" className={`${styles.submit} primary-action`} disabled={loading}>
        {loading ? "✦ 내 사주와 맞는 일간을 찾고 있어요…" : "✦ 내 천생연분 보기"}
      </button>
      <p className={styles.note}>♢ 내 사주팔자와 오행·음양·일간 관계를 바탕으로 잘 맞는 사주 방향을 보여드려요.</p>
    </form>
  );
}
