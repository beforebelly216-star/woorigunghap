import Link from "next/link";
import { OneToManyForm } from "@/components/one-to-many-form";

export default function OneToManyPage() {
  return (
    <main className="input-page">
      <div className="input-shell">
        <Link href="/" className="back-link compact">← 홈으로</Link>
        <header className="input-header">
          <p className="eyebrow">1:다 비교 궁합 · 입력 베타</p>
          <h1>한 사람을 기준으로 여러 관계를 비교해요.</h1>
          <p>
            기준자 1명과 후보 2~5명의 생년월일시를 입력해 주세요. 입력 검증·임시 저장 후 Day 15 고정 결과 화면을 확인할 수 있습니다.
          </p>
        </header>
        <OneToManyForm />
      </div>
    </main>
  );
}
