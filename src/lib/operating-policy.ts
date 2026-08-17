export const OPERATING_POLICY_VERSION = "operating-policy-v1" as const;
export const REPORT_RETENTION_MONTHS = 12;

export const OPERATING_POLICY = {
  reportRetention: `유료 리포트의 원본 입력과 생성 결과는 구매일로부터 ${REPORT_RETENTION_MONTHS}개월 동안 재열람 목적으로 보관합니다. 회원탈퇴 또는 삭제 요청이 먼저 발생하면 법령상 별도 보존이 필요한 최소 거래기록을 제외하고 지체 없이 삭제합니다.`,
  transactionRetention: "계약·청약철회, 대금결제 및 재화 등의 공급 기록은 관계 법령에 따라 5년간 별도 보관하고, 소비자 불만·분쟁처리 기록은 3년간 보관합니다.",
  disclaimer: "우리궁합 리포트는 사주 계산 결과를 관계 이해와 대화의 참고자료로 풀어낸 콘텐츠입니다. 의료·법률·재무·심리 진단이나 미래 사건의 확정적 예측을 제공하지 않습니다.",
  aiBoundary: "AI는 서버가 계산한 궁합 근거를 문장으로 설명하는 역할만 하며 점수·순위·결제 여부를 만들거나 변경하지 않습니다.",
  refundSummary: "결제 완료 전에는 언제든 결제를 중단할 수 있습니다. 결제 후 디지털 리포트 제공이 시작된 경우에는 관계 법령상 청약철회가 제한될 수 있습니다. 다만 중복결제, 미제공, 중대한 서비스 장애 등 사업자 귀책 사유가 있는 경우에는 별도로 확인하여 환불 처리합니다.",
  kakaoSummary: "카카오 로그인은 선택 사항입니다. 서비스는 카카오 회원번호와 화면 표시용 이름만 사용하며 이메일·전화번호·카카오 토큰은 저장하지 않습니다.",
} as const;

export const OPERATOR_PUBLIC_INFO = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME || "정식 판매 전 운영자 정보 기재 예정",
  email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL || "정식 판매 전 고객지원 이메일 기재 예정",
  businessRegistrationNumber: process.env.NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER || "정식 판매 전 기재 예정",
  ecommerceRegistrationNumber: process.env.NEXT_PUBLIC_ECOMMERCE_REGISTRATION_NUMBER || "정식 판매 전 기재 예정",
} as const;
