import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 신규 1:N은 무료 인연 네트워크로 전환했다. 과거 3,000원 주문의
 * 검증·결과·복구 경로는 유지하되 새 유료 주문은 더 만들지 않는다.
 */
export async function POST() {
  return NextResponse.json({
    error: "1:N 궁합은 무료 인연 네트워크로 바뀌었습니다.",
    code: "ONE_TO_MANY_NOW_FREE",
    url: "/one-to-many",
  }, {
    status: 410,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      "referrer-policy": "no-referrer",
    },
  });
}
