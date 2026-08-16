import { NextRequest, NextResponse } from "next/server";
import { createOneToManyOrderDraft } from "@/lib/orders";
import { parseOneToManyReportInput, validateOneToManyReportInput } from "@/lib/report-input";
import { isServerReportStoreConfigured, saveServerOrderDraft } from "@/lib/server-report-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const input = parseOneToManyReportInput(
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { input?: unknown }).input
      : null,
  );
  if (!input) return NextResponse.json({ error: "1:다 입력값 형식이 올바르지 않습니다." }, { status: 400 });

  const validation = validateOneToManyReportInput(input);
  if (!validation.valid) {
    return NextResponse.json({ error: "비교 입력값을 다시 확인해 주세요.", fieldErrors: validation.errors }, { status: 400 });
  }

  const order = createOneToManyOrderDraft(input);
  try {
    const persisted = await saveServerOrderDraft(order);
    if (!persisted) {
      return NextResponse.json({ error: "1:다 결과 저장소가 아직 연결되지 않았습니다." }, { status: 503 });
    }
    return NextResponse.json({ order, persisted });
  } catch (error) {
    console.error("[woorigunghap:one-to-many-order-store]", error);
    return NextResponse.json({
      error: "1:다 주문을 안전하게 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      serverStorageConfigured: isServerReportStoreConfigured(),
    }, { status: 503 });
  }
}
