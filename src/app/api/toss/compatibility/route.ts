import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";
import { createTossBasicHandler } from "@/lib/toss-basic-handler";

export const runtime="nodejs";
export const POST=createTossBasicHandler({
  authenticate:loadAuthenticatedRequestUser,
  allowedOrigin:isAllowedTossOrigin,
  enabled:()=>process.env.APPS_IN_TOSS_FREE_CALC_ENABLED==="true",
});