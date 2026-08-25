import Link from "next/link";
import { OneToManyForm } from "@/components/one-to-many-form";
import "./one-to-many-foundation.css";

export default function OneToManyPage() {
  return (
    <main className="one-to-many-page">
      <div className="one-to-many-shell">
        <Link href="/" className="back-link compact">← 홈으로</Link>
        <header className="input-header">
          <p className="eyebrow">1:다 비교 궁합</p>
          <h1>한 사람을 기준으로 여러 관계를 비교해요.</h1>
          <p>
            기준자 1명과 후보 2~5명의 생년월일시를 입력해 주세요. 3,000원 결제가 확인된 뒤 한 번의 AI 해설 생성으로 비교 리포트를 제공합니다.
          </p>
        </header>
        <OneToManyForm />
      </div>
    </main>
  );
}
