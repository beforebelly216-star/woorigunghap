import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { createTossNetworkHandler } from "@/lib/toss-network-handler";
import { getTossNetworkStore } from "@/lib/toss-network-store";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";

export const runtime="nodejs";
export const maxDuration=30;
export const POST=createTossNetworkHandler({authenticate:loadAuthenticatedRequestUser,allowedOrigin:isAllowedTossOrigin,
  enabled:()=>process.env.APPS_IN_TOSS_NETWORK_ENABLED==="true",store:getTossNetworkStore});
