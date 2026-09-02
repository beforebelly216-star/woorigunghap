import type { ReactNode } from "react";
import { ZootopiMark, type ZootopiExpression } from "@/components/zootopi-mark";
import styles from "./flow-status-screen.module.css";

export type FlowStatusStep = "login" | "payment" | "report";
export type FlowStatusTone = "working" | "success" | "error";

const STEPS: Array<{ id: FlowStatusStep; label: string }> = [
  { id: "login", label: "로그인 확인" },
  { id: "payment", label: "결제 확인" },
  { id: "report", label: "결과 만들기" },
];

export function FlowStatusScreen({
  activeStep,
  title,
  description,
  detail,
  tone = "working",
  expression = "analyzing",
  actions,
}: {
  activeStep: FlowStatusStep;
  title: string;
  description: string;
  detail?: string;
  tone?: FlowStatusTone;
  expression?: ZootopiExpression;
  actions?: ReactNode;
}) {
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);
  const isBusy = tone === "working";

  return <main className={styles.page} aria-live="polite" aria-busy={isBusy}>
    <section className={styles.card} data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <div className={styles.mascot}><ZootopiMark expression={expression} withBody /></div>
      <span className={styles.brand}>우리사주</span>
      <h1>{title}</h1>
      <p className={styles.description}>{description}</p>

      <ol className={styles.steps} aria-label="결과 확인 진행 단계">
        {STEPS.map((step, index) => {
          const stepState = index < activeIndex || tone === "success" && index <= activeIndex
            ? "complete"
            : index === activeIndex
              ? tone
              : "waiting";
          return <li key={step.id} data-state={stepState} aria-current={index === activeIndex ? "step" : undefined}>
            <span>{stepState === "complete" ? "✓" : index + 1}</span>
            <small>{step.label}</small>
          </li>;
        })}
      </ol>

      {detail ? <p className={styles.detail}>{detail}</p> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  </main>;
}
