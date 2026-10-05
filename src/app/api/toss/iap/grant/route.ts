import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { getFullbuyStore } from "@/lib/fullbuy-store";
import { isTossAuthConfigured, tossApiRequest } from "@/lib/toss-auth";
import { createTossIapGrantHandler } from "@/lib/toss-iap-grant-handler";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createTossIapGrantHandler({
  authenticate: loadAuthenticatedRequestUser, allowedOrigin: isAllowedTossOrigin,
  configuration: () => {
    const sku = process.env.APPS_IN_TOSS_ONE_TO_ONE_SKU?.trim();
    if (process.env.APPS_IN_TOSS_IAP_GRANT_ENABLED !== "true" ||
      process.env.APPS_IN_TOSS_FULLBUY_ENABLED !== "true" || !isTossAuthConfigured() || !sku) return null;
    return { sku, amount: Number(process.env.APPS_IN_TOSS_FULLBUY_SKU_AMOUNT) };
  },
  verify: (orderId, userKey) => tossApiRequest("/api-partner/v1/apps-in-toss/order/get-order-status", { orderId }, undefined, userKey),
  store: getFullbuyStore,
});
