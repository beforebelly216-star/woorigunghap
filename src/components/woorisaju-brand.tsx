import Link from "next/link";

function WoorisajuChartMark() {
  return <svg className="woorisaju-brand__chart" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="2" y="2" width="44" height="44" rx="14" fill="currentColor" opacity=".1" />
    <path d="M11 31.5h26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" opacity=".24" />
    <path d="M13 17v18M21 12v22M29 16v20M37 10v23" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="10" y="21" width="6" height="10" rx="2" fill="#43b581" />
    <rect x="18" y="16" width="6" height="13" rx="2" fill="#8162d6" />
    <rect x="26" y="23" width="6" height="9" rx="2" fill="#ef6a67" />
    <rect x="34" y="14" width="6" height="14" rx="2" fill="#f0ad38" />
  </svg>;
}

export function WoorisajuBrand({ className = "" }: { className?: string }) {
  return <Link href="/" className={`woorisaju-brand ${className}`} aria-label="우리사주 홈">
    <WoorisajuChartMark />
    <span className="woorisaju-brand__wordmark">우리사주</span>
  </Link>;
}
