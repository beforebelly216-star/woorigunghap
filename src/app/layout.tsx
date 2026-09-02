import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MandatoryAuthGate } from "@/components/mandatory-auth-gate";
import "./globals.css";
import "./report-theme.css";
import "./app-theme-v4.css";
import "../components/zootopi-mark.css";

export const metadata: Metadata = {
  title: "주토피 | 관계 궁합 리포트",
  description: "생년월일시와 관계 유형을 바탕으로 연인, 친구, 직장동료의 관계 궁합을 풀어주는 주토피 리포트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="site-content"><MandatoryAuthGate>{children}</MandatoryAuthGate></div>
        <SiteFooter />
      </body>
    </html>
  );
}
