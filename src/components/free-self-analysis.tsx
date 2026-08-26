"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import {
  createEmptyPersonBirthForm,
  normalizePersonBirthForm,
  PersonBirthFields,
  type PersonBirthFormState,
} from "@/components/person-birth-fields";
import {
  FREE_SELF_PERSON_STORAGE_KEY,
  type FreeSelfAnalysisResult,
} from "@/lib/free-self-analysis-contract";
import styles from "./free-self-analysis.module.css";

type ApiPayload = {
  analysis?: FreeSelfAnalysisResult;
  error?: string;
  errors?: Record<string, string>;
};

export function FreeSelfAnalysis() {
  const [person, setPerson] = useState<PersonBirthFormState>(createEmptyPersonBirthForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<FreeSelfAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prefillSaved, setPrefillSaved] = useState(true);
  const resultRef = useRef<HTMLElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!person.displayName.trim()) nextErrors["self.displayName"] = "이름 또는 별칭을 입력해 주세요.";
    if (!person.gender) nextErrors["self.gender"] = "성별을 선택해 주세요.";

    const normalized = normalizePersonBirthForm(person, "self");
    Object.assign(nextErrors, normalized.errors);
    if (!normalized.person || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setAnalysis(null);
      return;
    }

    setErrors({});
    setIsLoading(true);
    try {
      const response = await fetch("/api/free/self-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ person: normalized.person }),
      });
      const payload = await response.json().catch(() => null) as ApiPayload | null;
      if (!response.ok || !payload?.analysis) {
        setErrors(payload?.errors ?? { form: payload?.error ?? "무료 분석을 만들지 못했어요. 입력값을 다시 확인해 주세요." });
        setAnalysis(null);
        return;
      }

      let saved = true;
      try {
        window.sessionStorage.setItem(FREE_SELF_PERSON_STORAGE_KEY, JSON.stringify(normalized.person));
      } catch {
        saved = false;
      }
      setPrefillSaved(saved);
      setAnalysis(payload.analysis);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setErrors({ form: "무료 분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요." });
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.shell}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formIntro}>
          <span>내 정보 입력</span>
          <p>정확한 분석을 위해 아래 정보만 입력해 주세요.</p>
        </div>
        {errors.form ? <p className={styles.formError} role="alert">{errors.form}</p> : null}
        <div className={styles.birthFields}>
          <PersonBirthFields
            title="기본 정보"
            prefix="self"
            placeholder="예: 나 또는 별칭"
            value={person}
            errors={errors}
            onChange={(next) => {
              setPerson(next);
              setAnalysis(null);
            }}
          />
        </div>
        <p className={styles.privacyNote}>
          <span aria-hidden="true">✓</span>
          무료 분석을 만들기 위해 사용하며, 1:1 이어보기용 정보는 이 브라우저 세션에만 임시로 보관합니다.
        </p>
        <button
          type="submit"
          className={styles.submit}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? "내 관계 성향 찾는 중..." : "내 관계 성향 보기"}
        </button>
        <p className={styles.submitNote}>무료 결과는 관계 성향 요약이며 결제 없이 확인합니다.</p>
      </form>

      {analysis ? (
        <section ref={resultRef} className={styles.result} aria-labelledby="free-self-result-title">
          <header className={styles.resultHeader}>
            <p className={styles.resultEyebrow}>MY RELATIONSHIP TYPE</p>
            <h2 id="free-self-result-title">{analysis.displayName}님의 관계 캐릭터</h2>
            <span className={styles.pillar}>{analysis.dayPillar}일주 · {analysis.archetypeTitle}</span>
          </header>
          <p className={styles.tagline}>{analysis.tagline}</p>

          <div className={styles.insights}>
            {analysis.insights.map((insight) => (
              <article key={insight.key} className={styles.insight}>
                <span>{insight.label}</span>
                <p>{insight.body}</p>
              </article>
            ))}
          </div>

          {analysis.accuracyNote ? <p className={styles.accuracy}>{analysis.accuracyNote}</p> : null}

          <div className={styles.conversion}>
            <p className={styles.conversionLead}>이제 실제로 궁금한 사람과 붙여 보면, 어디서 잘 맞고 어디서 꼬이는지가 보입니다.</p>
            <Link href="/one-to-one?from=free" className={styles.paidPrimary}>
              궁금한 사람과 1:1 상세 궁합 보기 · 1,000원
            </Link>
            <Link href="/one-to-many" className={styles.paidSecondary}>
              여러 명을 한 번에 비교하기 · 3,000원
            </Link>
            <small>
              {prefillSaved
                ? "1:1로 이동하면 방금 입력한 내 정보를 다시 입력하지 않도록 이 브라우저 세션에만 이어둡니다."
                : "브라우저가 임시 저장을 막고 있어 1:1 이동 시 내 정보를 한 번 더 입력해야 합니다."}
            </small>
          </div>
        </section>
      ) : null}
    </div>
  );
}
