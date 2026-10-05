import { loadAuthenticatedRequestUser } from "@/lib/auth-request";
import { getFullbuyStore } from "@/lib/fullbuy-store";
import { getTossAiBudget } from "@/lib/toss-ai-budget";
import { createTossChapterHandler } from "@/lib/toss-chapter-handler";
import { getTossNetworkStore } from "@/lib/toss-network-store";
import { isAllowedTossOrigin } from "@/lib/toss-session-policy";
import { generateTossShortNarrative } from "@/lib/toss-short-narrative";

export const runtime = "nodejs";
export const maxDuration = 120;
export const POST = createTossChapterHandler({
  authenticate: loadAuthenticatedRequestUser, allowedOrigin: isAllowedTossOrigin,
  enabled: () => process.env.APPS_IN_TOSS_FULLBUY_ENABLED === "true",
  generationEnabled: () => process.env.APPS_IN_TOSS_SHORT_AI_ENABLED === "true" &&
    process.env.APPS_IN_TOSS_NETWORK_ENABLED === "true" && Boolean(process.env.ANTHROPIC_API_KEY),
  store: getFullbuyStore, network: getTossNetworkStore, budget: getTossAiBudget,
  generate: options => generateTossShortNarrative({ ...options, apiKey: process.env.ANTHROPIC_API_KEY ?? "" }),
});
