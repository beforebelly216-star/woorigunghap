import { PolicyPage, PolicySection } from "@/components/policy-page";
import { OPERATING_POLICY, OPERATOR_PUBLIC_INFO, REPORT_RETENTION_MONTHS } from "@/lib/operating-policy";

export default function PrivacyPage() {
  return <PolicyPage title="개인정보처리방침" updatedAt="2026-08-17">
    <PolicySection title="1. 처리하는 정보와 목적">
      <ul><li>리포트 생성: 이름 또는 별칭, 성별, 양력·음력 여부, 생년월일, 출생시간, 윤달 여부, 관계 유형</li><li>결제·복구: 주문 식별자, 결제 식별자, 결제 상태, 결과 접근정보의 해시값</li><li>선택 로그인: 카카오 회원번호, 화면 표시용 이름, 로그인 세션 해시</li></ul>
      <p>이 정보는 주문 처리, 궁합 계산, 유료 리포트 생성·저장·재열람, 결제 검증, 계정 보관함 제공과 고객 문의 대응에 사용합니다.</p>
    </PolicySection>
    <PolicySection title="2. AI 처리 경계">
      <p>이름·별칭과 원본 생년월일시는 AI 서술 생성 단계에 전달하지 않습니다. AI는 서버에서 계산된 익명화 근거를 설명하는 데만 사용합니다.</p>
    </PolicySection>
    <PolicySection title="3. 보유기간과 파기">
      <p>{OPERATING_POLICY.reportRetention}</p><p>따라서 일반 리포트 데이터 보유기간은 구매일로부터 {REPORT_RETENTION_MONTHS}개월을 기본으로 합니다.</p><p>{OPERATING_POLICY.transactionRetention}</p>
      <p>보유 목적이 끝나거나 삭제 요청이 처리되면 복구 또는 재생되지 않도록 삭제하고, 다른 법령에 따라 남겨야 하는 기록은 서비스 이용 데이터와 분리해 보관합니다.</p>
    </PolicySection>
    <PolicySection title="4. 외부 서비스">
      <p>결제 처리를 위해 PortOne 및 연결된 PG사를 이용하고, 선택 로그인 기능을 위해 카카오 로그인을 이용합니다. 각 사업자는 해당 기능 수행에 필요한 범위에서 정보를 처리합니다.</p>
    </PolicySection>
    <PolicySection title="5. 이용자의 권리">
      <p>이용자는 자신의 개인정보에 대해 열람·정정·삭제·처리정지 등을 요청할 수 있습니다. 로그인 회원은 보관함에서 회원탈퇴와 데이터 삭제를 요청할 수 있으며, 비회원은 고객지원 채널을 통해 삭제를 요청할 수 있습니다.</p>
    </PolicySection>
    <PolicySection title="6. 연락처">
      <p>개인정보 관련 문의: {OPERATOR_PUBLIC_INFO.email}</p>
    </PolicySection>
  </PolicyPage>;
}
