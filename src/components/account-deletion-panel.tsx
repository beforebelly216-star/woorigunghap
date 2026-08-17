"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountDeletionPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function deleteAccount() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? "탈퇴를 처리하지 못했습니다.");
        return;
      }
      router.replace("/?accountDeleted=1");
      router.refresh();
    } catch {
      setMessage("네트워크 문제로 탈퇴를 처리하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="account-delete-panel">
    <button type="button" className="account-delete-toggle" onClick={() => setOpen((value) => !value)}>{open ? "탈퇴 메뉴 닫기" : "회원탈퇴·데이터 삭제"}</button>
    {open ? <div className="account-delete-box">
      <h2>회원탈퇴</h2>
      <p>탈퇴하면 카카오 계정 연결과 로그인 세션이 삭제되고, 보관함의 리포트 원문·출생정보·재열람 접근정보도 삭제되어 복구할 수 없습니다.</p>
      <p>전자상거래 관련 법령에 따라 보존해야 하는 최소 결제·계약 기록은 별도 목적으로 분리 보관됩니다.</p>
      <label>계속하려면 <strong>탈퇴</strong>라고 입력해 주세요.<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
      <button type="button" className="account-delete-button" disabled={loading || confirmation !== "탈퇴"} onClick={deleteAccount}>{loading ? "처리 중..." : "계정과 리포트 삭제"}</button>
      {message ? <p role="alert">{message}</p> : null}
    </div> : null}
  </section>;
}
