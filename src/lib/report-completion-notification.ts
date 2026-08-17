import "server-only";

import { findAccountReportOwnerUserId } from "@/lib/account-report-store";
import {
  getKakaoAuthConfig,
  refreshKakaoAccessToken,
  sendKakaoMemo,
} from "@/lib/kakao-auth";
import {
  loadKakaoMessagingTokens,
  updateKakaoAccessToken,
} from "@/lib/kakao-token-store";

function appBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function resolveAccessToken(userId: string) {
  const stored = await loadKakaoMessagingTokens(userId);
  if (!stored) return null;
  if (stored.accessExpiresAt.getTime() > Date.now() + 60_000) return stored.accessToken;
  if (
    !stored.refreshToken
    || (stored.refreshExpiresAt && stored.refreshExpiresAt.getTime() <= Date.now() + 60_000)
  ) return null;
  const config = getKakaoAuthConfig();
  if (!config) return null;
  const refreshed = await refreshKakaoAccessToken(config, stored.refreshToken);
  await updateKakaoAccessToken(
    userId,
    refreshed.accessToken,
    refreshed.expiresInSeconds,
    refreshed.refreshToken,
    refreshed.refreshTokenExpiresInSeconds,
  );
  return refreshed.accessToken;
}

export async function notifyReportCompleted(paymentId: string) {
  try {
    const userId = await findAccountReportOwnerUserId(paymentId);
    if (!userId) return false;
    const accessToken = await resolveAccessToken(userId);
    const origin = appBaseUrl();
    if (!accessToken || !origin) return false;
    const url = `${origin}/account/reports`;
    await sendKakaoMemo(
      accessToken,
      "우리궁합 결과 생성이 완료됐어요. 보관함에서 구매한 결과를 확인해 보세요.",
      url,
    );
    return true;
  } catch (error) {
    console.error("[woorigunghap:kakao-completion-notification]", error);
    return false;
  }
}
