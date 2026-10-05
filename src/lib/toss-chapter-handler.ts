import { NextRequest, NextResponse } from "next/server";
import { fullbuyChapterKey, FULLBUY_CHAPTERS, type FullbuyChapter } from "./fullbuy-contract";
import { generateFullbuyChapter } from "./fullbuy-chapter-service";
import type { createFullbuyStore } from "./fullbuy-store-core";
import type { createTossNetworkStore } from "./toss-network-core";
import { TossNetworkError } from "./toss-network-core";
import { tossChapterCompletionGuards } from "./toss-chapter-guards";
import { parseTossShortNarrative } from "./toss-short-narrative";
import type { generateTossShortNarrative } from "./toss-short-narrative";
import type { createTossAiBudget } from "./toss-ai-budget-core";

const headers = { "cache-control": "private, no-store", "referrer-policy": "no-referrer" };
export function createTossChapterHandler(deps: {
  authenticate: (request: NextRequest) => Promise<{ userId: string; provider?: string } | null>;
  allowedOrigin: (origin: string | null) => boolean; enabled: () => boolean; generationEnabled: () => boolean;
  store: () => ReturnType<typeof createFullbuyStore>; network: () => ReturnType<typeof createTossNetworkStore>;
  budget: () => ReturnType<typeof createTossAiBudget>;
  generate: (options: Omit<Parameters<typeof generateTossShortNarrative>[0], "apiKey" | "fetcher">) => ReturnType<typeof generateTossShortNarrative>;
}) {
  return async function POST(request: NextRequest) {
    if (!deps.allowedOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "invalid_origin" }, { status: 403, headers });
    const user = await deps.authenticate(request).catch(() => null);
    if (!user || user.provider !== "toss") return NextResponse.json({ error: "login_required" }, { status: 401, headers });
    if (!deps.enabled()) return NextResponse.json({ error: "fullbuy_not_configured" }, { status: 503, headers });
    let input;
    try {
      const reader = request.body?.getReader(); if (!reader) throw new Error("missing_body");
      try {
        const chunks: Uint8Array[] = []; let size = 0;
        while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
          if (size > 2048) { await reader.cancel(); throw new Error("body_limit"); } chunks.push(value); }
        input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } finally { reader.releaseLock(); }
    } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400, headers }); }
    try {
      const store = deps.store();
      await store.releaseStale(user.userId);
      if (input?.action === "library") return NextResponse.json({ chapters: await store.library(user.userId) }, { headers });
      if (input?.action === "read") return NextResponse.json(await store.read(user.userId, input.chapterKey), { headers });
      if (!["status", "open"].includes(input?.action) || !FULLBUY_CHAPTERS.includes(input.chapter)) return NextResponse.json({ error: "invalid_action" }, { status: 400, headers });
      const chapter = input.chapter as FullbuyChapter;
      const network = deps.network();
      const pair = await network.pair(user.userId, input.networkId, input.memberAId, input.memberBId);
      const key = fullbuyChapterKey(pair.snapshot, chapter);
      const existing = await store.read(user.userId, key);
      if (input.action === "status" || existing.status === "ready" || existing.status === "pending") {
        return NextResponse.json({ ...existing, chapterKey: key, wallet: await store.wallet(user.userId) }, { headers });
      }
      if (!deps.generationEnabled()) return NextResponse.json({ error: "chapter_not_configured" }, { status: 503, headers });
      const budget = deps.budget(); let attemptId = "";
      const response = await generateFullbuyChapter({ store, userId: user.userId, snapshot: pair.snapshot, chapter,
        authorize: async () => {
          const current = await network.pair(user.userId, input.networkId, input.memberAId, input.memberBId);
          if (fullbuyChapterKey(current.snapshot, chapter) !== key) throw new Error("chapter_version_changed");
        },
        completeGuards: tossChapterCompletionGuards(user.userId, pair.snapshot),
        beforeGenerate: async id => { attemptId = id; await budget.reserve(user.userId, id); },
        generate: async signal => {
          const generated = await deps.generate({ result: pair.result, chapter, signal });
          await budget.record(user.userId, attemptId, generated.usage);
          return generated.content;
        },
        validate: content => { parseTossShortNarrative(content, pair.result); return true; },
      });
      // Internal attempt IDs/reserved amounts are never browser credentials.
      return NextResponse.json({ status: response.status, chapterKey: key,
        ...("content" in response ? { content: response.content } : {}), wallet: await store.wallet(user.userId) }, { headers });
    } catch (error) {
      return NextResponse.json({ error: error instanceof TossNetworkError ? error.code : "chapter_unavailable" },
        { status: error instanceof TossNetworkError ? error.status : 409, headers });
    }
  };
}
