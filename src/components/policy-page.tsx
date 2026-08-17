import type { ReactNode } from "react";

export function PolicyPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
  return <main className="policy-page"><article className="policy-shell"><p className="eyebrow">OPERATING POLICY</p><h1>{title}</h1><p className="policy-updated">시행·최종 수정: {updatedAt}</p>{children}</article></main>;
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="policy-section"><h2>{title}</h2>{children}</section>;
}
