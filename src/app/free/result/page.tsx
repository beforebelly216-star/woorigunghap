import type { Metadata } from "next";
import SoulmateResultClient from "./soulmate-result-client";
import styles from "./soulmate-result.module.css";

export const metadata: Metadata = {
  title: "내 천생연분 결과 | 주토피",
  description: "내 사주팔자를 바탕으로 잘 맞는 일간과 구체적인 사주 구성을 확인해 봐",
};

export default function FreeSoulmateResultPage() {
  return <main className={styles.page} aria-label="무료 천생연분 결과"><SoulmateResultClient /></main>;
}
