import { NextRequest, NextResponse } from "next/server";
import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import {
  disableKakaoChannelNotification,
  saveKakaoChannelNotificationTarget,
} from "@/lib/kakao-channel-notification-store";
import { isKakaoChannelNotificationConfigured } from "@/lib/solapi-alimtalk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "cache-control": "private, no-store, max-age=0",
  "referrer-policy": "no-referrer",
};

export async function POST(request: NextRequest) {
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: privateHeaders });

  const payload = await request.json().catch(() => null) as { phoneNumber?: unknown; consent?: unknown } | null;
  if (payload?.consent !== true || typeof payload.phoneNumber !== "string") {
    return NextResponse.json({ error: "완료 알림 수신 동의와 휴대전화 번호를 확인해 주세요." }, { status: 400, headers: privateHeaders });
  }
  if (!isKakaoChannelNotificationConfigured()) {
    return NextResponse.json({ error: "카카오톡 채널 알림톡 운영 설정이 아직 완료되지 않았습니다." }, { status: 503, headers: privateHeaders });
  }

  try {
    const saved = await saveKakaoChannelNotificationTarget(user.userId, payload.phoneNumber);
    return NextResponse.json(saved, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_notification_phone") {
      return NextResponse.json({ error: "010으로 시작하는 휴대전화 번호를 확인해 주세요." }, { status: 400, headers: privateHeaders });
    }
    console.error("[woorigunghap:kakao-channel-notify-save]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "완료 알림 설정을 저장하지 못했습니다." }, { status: 503, headers: privateHeaders });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await loadAuthenticatedRequestUser(request).catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: privateHeaders });
  try {
    await disableKakaoChannelNotification(user.userId);
    return NextResponse.json({ enabled: false }, { headers: privateHeaders });
  } catch (error) {
    console.error("[woorigunghap:kakao-channel-notify-disable]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "완료 알림 설정을 해제하지 못했습니다." }, { status: 503, headers: privateHeaders });
  }
}
