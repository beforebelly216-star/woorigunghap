"use client";

import { FormEvent, useState } from "react";
import {
  createEmptyPersonBirthForm,
  normalizePersonBirthForm,
  PersonBirthFields,
  type PersonBirthFormState,
} from "@/components/person-birth-fields";
import { SOULMATE_PERSON_STORAGE_KEY } from "@/lib/soulmate-input-contract";
import styles from "./soulmate-input-form.module.css";

export function SoulmateInputForm() {
  const [person, setPerson] = useState<PersonBirthFormState>(createEmptyPersonBirthForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!person.displayName.trim()) nextErrors["soulmate.displayName"] = "이름 또는 별칭을 입력해 주세요.";
    if (!person.gender) nextErrors["soulmate.gender"] = "성별을 선택해 주세요.";
    const normalized = normalizePersonBirthForm(person, "soulmate");
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.person || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setReady(false);
      return;
    }
    setErrors({});
    try {
      window.sessionStorage.setItem(SOULMATE_PERSON_STORAGE_KEY, JSON.stringify(normalized.person));
    } catch {
      // UI-only 단계이므로 저장 실패가 입력 화면을 막지는 않는다.
    }
    setReady(true);
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
          onChange={(next) => { setPerson(next); setReady(false); }}
        />
      </div>

      <aside className={styles.privacy}>
        <span className={styles.bulb} aria-hidden="true">💡</span>
        <div><strong>입력하신 정보는 안전하게 보호해요</strong><p>천생연분 분석을 위한 입력 UI이며, 결과 계산 로직은 아직 연결하지 않았습니다.</p></div>
        <span className={styles.lock} aria-hidden="true">🔒</span>
      </aside>

      <button type="submit" className={`${styles.submit} primary-action`}>✦ 내 천생연분 보기</button>
      <p className={styles.note}>♢ 무료 결과는 나와 잘 어울리는 사주 팔자 방향을 설명하는 형태로 연결될 예정이에요.</p>

      {ready ? (
        <section className={styles.pending} role="status">
          <strong>입력 UI가 완료됐어요.</strong>
          <p>다음 작업에서 이 사주원국을 기준으로 잘 어울리는 천생연분 사주 팔자 결과 로직을 연결합니다.</p>
        </section>
      ) : null}
    </form>
  );
}
