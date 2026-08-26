import Link from "next/link";
import { OneToManyForm } from "@/components/one-to-many-form";
import "./one-to-many-foundation.css";
import "./one-to-many-input-v3.css";

export default function OneToManyPage() {
  return (
    <main className="one-to-many-page">
      <div className="one-to-many-shell">
        <Link href="/" className="back-link compact">← 홈으로</Link>
        <header className="input-header">
          <p className="eyebrow">1:N 비교 궁합 · 3단계</p>
          <h1>여러 사람과의 궁합을 한 번에 비교해요.</h1>
          <p>
            기본 정보 → 후보 정보 → 확인 순서로 진행합니다. 후보는 2~5명까지 추가할 수 있고, 출생시간은 24시간제 HHMM으로 입력합니다.
          </p>
        </header>
        <OneToManyForm />
      </div>
    </main>
  );
}
