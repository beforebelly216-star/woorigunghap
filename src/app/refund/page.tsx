import { PolicyPage, PolicySection } from "@/components/policy-page";
import { OPERATING_POLICY, OPERATOR_PUBLIC_INFO } from "@/lib/operating-policy";

export default function RefundPage() {
  return <PolicyPage title="환불·청약철회 안내" updatedAt="2026-08-17">
    <PolicySection title="1. 결제 전">
      <p>결제 승인 전에는 언제든 결제를 중단하거나 입력 내용을 수정할 수 있습니다.</p>
    </PolicySection>
    <PolicySection title="2. 결제 후 디지털 콘텐츠 제공">
      <p>우리궁합은 결제가 승인되면 서버가 즉시 궁합 계산과 유료 리포트 생성을 시작하는 디지털 콘텐츠입니다. 결제 화면에서 이용약관·개인정보 처리와 함께 이 즉시 제공 사실을 확인받습니다.</p>
      <p>{OPERATING_POLICY.refundSummary}</p>
    </PolicySection>
    <PolicySection title="3. 환불을 확인하는 경우">
      <ul><li>동일 주문의 중복 결제</li><li>결제는 승인됐으나 서비스 장애로 리포트가 제공되지 않은 경우</li><li>사업자 귀책으로 구매한 상품과 다른 콘텐츠가 제공되는 등 계약 내용대로 이행되지 않은 경우</li></ul>
      <p>개별 결제수단의 승인 취소 시점과 환급 반영 시점은 PG사·카드사 등 결제수단 사업자의 처리 일정에 따라 달라질 수 있습니다.</p>
    </PolicySection>
    <PolicySection title="4. 문의 방법">
      <p>환불 요청 시 결제 식별정보를 확인할 수 있도록 고객지원에 문의해 주세요. 고객지원: {OPERATOR_PUBLIC_INFO.email}</p>
    </PolicySection>
  </PolicyPage>;
}
