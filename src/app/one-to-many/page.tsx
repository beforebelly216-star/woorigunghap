import Link from "next/link";
import { OneToManyForm } from "@/components/one-to-many-form";
import "../input-reference-v4.css";
import "./one-to-many-foundation.css";
import "./one-to-many-input-v3.css";

export default function OneToManyPage() {
  return (
    <main className="one-to-many-page reference-input-screen one-to-many-reference-page">
      <div className="one-to-many-shell">
        <header className="one-to-many-app-header">
          <Link href="/" aria-label="홈으로 돌아가기">‹</Link>
          <strong>1:N 궁합 입력</strong>
          <span>?</span>
        </header>
        <OneToManyForm />
        <p className="one-to-many-trust">♢ 안전한 분석 · 여러 사람 비교 · 정확한 궁합</p>
      </div>
    </main>
  );
}
