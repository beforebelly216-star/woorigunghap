"use client";

import Link from "next/link";

export function PurchasePolicyConsent({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <section className="purchase-policy" aria-label="구매 및 디지털 콘텐츠 제공 동의">
    <label className="purchase-policy-check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>이용약관·개인정보 처리 및 결제 후 디지털 리포트 제공이 즉시 시작될 수 있음을 확인했습니다.</span>
    </label>
    <p>
      결제 전에 <Link href="/terms" target="_blank">이용약관</Link>, <Link href="/privacy" target="_blank">개인정보처리방침</Link>, <Link href="/refund" target="_blank">환불·청약철회 안내</Link>를 확인해 주세요.
    </p>
  </section>;
}
