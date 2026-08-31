"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createEmptyPersonBirthForm,
  normalizePersonBirthForm,
  PersonBirthFields,
  type PersonBirthFormState,
} from "@/components/person-birth-fields";
import { FREE_SELF_PERSON_STORAGE_KEY } from "@/lib/free-self-analysis-contract";
import { parseRelationshipNetworkPublic } from "@/lib/relationship-network-contract";
import styles from "@/app/one-to-many/relationship-network.module.css";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function networkTokenFromPath(value: string) {
  const token = value.split("/").filter(Boolean).at(-1) ?? "";
  return TOKEN_PATTERN.test(token) ? token : null;
}

function randomHexToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function RelationshipNetworkCreateForm() {
  const router = useRouter();
  const [person, setPerson] = useState<PersonBirthFormState>(createEmptyPersonBirthForm());
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const createAttemptRef = useRef<{
    token: string;
    ownerToken: string;
    memberToken: string;
    idempotencyKey: string;
  } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    const nextErrors: Record<string, string> = {};
    if (!person.displayName.trim()) nextErrors["person.displayName"] = "이름 또는 별칭을 입력해 주세요.";
    if (!person.gender) nextErrors["person.gender"] = "성별을 선택해 주세요.";
    if (!consent) nextErrors.consent = "공개 범위와 개인정보 보관 안내에 동의해 주세요.";
    const normalized = normalizePersonBirthForm(person, "person");
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.person || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    if (!createAttemptRef.current) {
      createAttemptRef.current = {
        token: randomHexToken(),
        ownerToken: randomHexToken(),
        memberToken: randomHexToken(),
        idempotencyKey: crypto.randomUUID(),
      };
    }
    try {
      const response = await fetch("/api/relationship-networks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ person: normalized.person, consent: true, ...createAttemptRef.current }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const network = parseRelationshipNetworkPublic(payload?.network);
      const url = typeof payload?.url === "string" ? payload.url : "";
      const token = networkTokenFromPath(url);
      const ownerToken = typeof payload?.ownerToken === "string" && TOKEN_PATTERN.test(payload.ownerToken)
        ? payload.ownerToken
        : null;
      const memberToken = typeof payload?.memberToken === "string" && TOKEN_PATTERN.test(payload.memberToken)
        ? payload.memberToken
        : null;
      const memberId = typeof payload?.memberId === "string" ? payload.memberId : null;
      if (!response.ok || !network || !token || !ownerToken || !memberToken || !memberId) {
        const message = typeof payload?.error === "string"
          ? payload.error
          : "인물 네트워크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setErrors({ form: message });
        if (payload?.code === "idempotency_conflict") createAttemptRef.current = null;
        return;
      }

      try {
        window.sessionStorage.setItem(FREE_SELF_PERSON_STORAGE_KEY, JSON.stringify(normalized.person));
      } catch {
        // 1:1 사전 채움은 선택 기능이므로 저장소가 차단돼도 생성 링크는 엽니다.
      }
      const fragment = new URLSearchParams({ ownerToken, memberId, memberToken }).toString();
      createAttemptRef.current = null;
      router.push(`${url}#${fragment}`);
    } catch {
      setErrors({ form: "인물 네트워크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.createForm} onSubmit={submit} noValidate>
      {errors.form ? <p className="field-error form-error-summary" role="alert">{errors.form}</p> : null}
      <section className={styles.formCard}>
        <div className={styles.formHeading}>
          <span>STEP 1</span>
          <h2>내 정보만 입력해 주세요</h2>
          <p>친구들은 공유 링크에서 각자 자기 정보를 직접 입력합니다.</p>
        </div>
        <PersonBirthFields
          title=""
          prefix="person"
          placeholder="예) 지민, 별이, 팀장님"
          value={person}
          errors={errors}
          onChange={(next) => {
            setPerson(next);
            setErrors((current) => ({ ...current, form: "", consent: "" }));
          }}
        />
      </section>

      <label className={styles.consentCard}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            setErrors((current) => ({ ...current, consent: "" }));
          }}
        />
        <span>
          <strong>공개 범위에 동의합니다</strong>
          <small>만 14세 이상이며, 별칭과 모든 참여자 간 궁합 점수·등급이 이 링크를 가진 사람에게 공개되는 것에 동의합니다.</small>
        </span>
      </label>
      <p className={styles.policyLinks}>
        제출 전에 <Link href="/terms" target="_blank" rel="noreferrer">이용약관</Link>과 <Link href="/privacy" target="_blank" rel="noreferrer">개인정보처리방침</Link>을 확인해 주세요.
      </p>
      {errors.consent ? <small className="field-error" role="alert">{errors.consent}</small> : null}

      <aside className={styles.privacyNote}>
        <strong>🔒 생년정보는 화면과 링크에 노출하지 않습니다</strong>
        <p>암호화해 궁합 계산에만 사용하고, 네트워크는 만든 날부터 30일 뒤 자동 만료됩니다. 방장과 참여자는 언제든 정보를 삭제할 수 있습니다.</p>
      </aside>

      <button type="submit" className={styles.primaryButton} disabled={loading}>
        {loading ? "인연 네트워크를 만들고 있어요…" : "무료 네트워크 만들기"}
      </button>
      <p className={styles.formFootnote}>결제 없이 시작 · 최대 12명 · 새 참여자와 모든 사람의 관계를 자동 계산</p>
    </form>
  );
}
