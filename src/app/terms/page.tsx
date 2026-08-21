import { PolicyPage, PolicySection } from "@/components/policy-page";
import { OPERATING_POLICY, OPERATOR_PUBLIC_INFO } from "@/lib/operating-policy";

export default function TermsPage() {
  return <PolicyPage title="이용약관" updatedAt="2026-08-21">
    <PolicySection title="1. 서비스와 상품">
      <p>우리사주는 사용자가 입력한 생년월일시와 관계 유형을 바탕으로 1:1 궁합 리포트와 1:다 비교 리포트를 제공하는 디지털 콘텐츠 서비스입니다.</p>
      <p>1:1 상품은 1,000원, 1:다 상품은 3,000원이며 결제 승인과 서버 검증이 완료된 뒤 계산과 리포트 생성이 시작됩니다.</p>
    </PolicySection>
    <PolicySection title="2. 이용 조건과 책임 범위">
      <p>{OPERATING_POLICY.disclaimer}</p><p>{OPERATING_POLICY.aiBoundary}</p>
      <p>사용자는 타인의 정보를 입력할 때 해당 정보를 서비스에 입력·처리할 정당한 권한 또는 동의를 확보해야 합니다.</p>
    </PolicySection>
    <PolicySection title="3. 결제·공급·재열람">
      <p>결제는 PortOne을 통해 연결된 전자결제수단으로 진행되며, 서버에서 상품·금액·승인 상태를 재검증합니다.</p>
      <p>완료된 결과는 복구키 또는 로그인 계정 보관함에서 재열람할 수 있습니다. 저장된 구매 결과를 다시 열 때 점수 계산이나 AI 생성을 다시 수행하지 않습니다.</p>
    </PolicySection>
    <PolicySection title="4. 청약철회·환불">
      <p>{OPERATING_POLICY.refundSummary}</p><p>상세 조건은 환불·청약철회 안내를 따릅니다.</p>
    </PolicySection>
    <PolicySection title="5. 계정과 탈퇴">
      <p>카카오 로그인은 선택 사항입니다. 회원은 보관함에서 저장된 구매 결과를 확인할 수 있으며 탈퇴를 요청할 수 있습니다.</p>
      <p>탈퇴 시 계정 식별정보·세션·리포트 원문과 재열람용 접근정보는 삭제하고, 법령상 보존 의무가 있는 최소 거래기록은 별도 목적에 한해 보존합니다.</p>
    </PolicySection>
    <PolicySection title="6. 운영자 정보">
      <p>운영자: {OPERATOR_PUBLIC_INFO.name}</p><p>고객지원: {OPERATOR_PUBLIC_INFO.email}</p><p>사업자등록번호: {OPERATOR_PUBLIC_INFO.businessRegistrationNumber}</p><p>통신판매업 신고번호: {OPERATOR_PUBLIC_INFO.ecommerceRegistrationNumber}</p>
    </PolicySection>
  </PolicyPage>;
}
