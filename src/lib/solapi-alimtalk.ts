import "server-only";

import { createHmac, randomBytes } from "node:crypto";

const SOLAPI_SEND_ENDPOINT = "https://api.solapi.com/messages/v4/send-many/detail";

type SolapiConfig = {
  apiKey: string;
  apiSecret: string;
  pfId: string;
  templateId: string;
};

export class KakaoChannelNotificationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "KakaoChannelNotificationError";
  }
}

function getConfig(): SolapiConfig | null {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const pfId = process.env.SOLAPI_KAKAO_PF_ID?.trim();
  const templateId = process.env.SOLAPI_KAKAO_TEMPLATE_ID?.trim();
  if (!apiKey || !apiSecret || !pfId || !templateId) return null;
  return { apiKey, apiSecret, pfId, templateId };
}

export function isKakaoChannelNotificationConfigured() {
  return getConfig() !== null;
}

function createAuthorizationHeader(config: SolapiConfig) {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", config.apiSecret)
    .update(`${date}${salt}`)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${config.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export async function sendKakaoChannelReportCompleted(phoneNumber: string) {
  const config = getConfig();
  if (!config) throw new KakaoChannelNotificationError("provider_not_configured");

  const response = await fetch(SOLAPI_SEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: createAuthorizationHeader(config),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messages: [{
        to: phoneNumber,
        type: "ATA",
        kakaoOptions: {
          pfId: config.pfId,
          templateId: config.templateId,
          disableSms: true,
        },
      }],
      strict: true,
      allowDuplicates: false,
      showMessageList: true,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const errorCode = typeof payload?.errorCode === "string" ? payload.errorCode : `http_${response.status}`;
    throw new KakaoChannelNotificationError(`provider_${errorCode}`);
  }

  const failedMessageList = Array.isArray(payload?.failedMessageList) ? payload.failedMessageList : [];
  if (failedMessageList.length > 0) throw new KakaoChannelNotificationError("provider_message_rejected");
  return true;
}
