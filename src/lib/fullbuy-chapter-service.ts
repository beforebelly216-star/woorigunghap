import { FULLBUY_CHAPTER_COST, fullbuyChapterKey, type FullbuySnapshot, type FullbuyChapter } from "./fullbuy-contract";
import type { createFullbuyStore } from "./fullbuy-store-core";
import type { FullbuyStatement } from "./fullbuy-store-core";

// Internal server worker only. Caller must load/authorize the snapshot and supply
// calculation-grounded quality validation. The public handler supplies account,
// pair authority and completion guards; callers must never accept client snapshots.
export async function generateFullbuyChapter(options: {
  store: ReturnType<typeof createFullbuyStore>; userId: string;
  snapshot: FullbuySnapshot; chapter: FullbuyChapter;
  generate: (signal: AbortSignal) => Promise<string>;
  validate: (content: string) => boolean;
  // Recheck the server-loaded pair/version before spending and before saving.
  authorize?: () => Promise<void>;
  beforeGenerate?: (attemptId: string) => Promise<void>;
  completeGuards?: FullbuyStatement[];
}) {
  const {store,userId,snapshot,chapter,generate,validate} = options;
  const key = fullbuyChapterKey(snapshot,chapter);
  await options.authorize?.();
  await store.releaseStale(userId);
  const reservation = await store.reserve(userId,key);
  if (reservation.status!=="reserved") return reservation;
  const attempt = reservation.attemptId;
  const abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await options.authorize?.();
    await options.beforeGenerate?.(attempt);
    const deadline = new Promise<never>((_,reject) => {
      timer=setTimeout(()=>{abort.abort();reject(new Error("fullbuy_generation_timeout"));},120000);
    });
    const content = await Promise.race([Promise.resolve().then(()=>generate(abort.signal)),deadline]);
    if (typeof content!=="string" || validate(content)!==true) throw new Error("fullbuy_quality_rejected");
    await options.authorize?.();
    const result = await store.complete(userId,key,attempt,content,options.completeGuards);
    return {status:"ready" as const,content:result.content,cost:FULLBUY_CHAPTER_COST};
  } catch {
    // An uncertain completion may already be ready; release never refunds a ready result.
    await store.release(userId,key,attempt);
    throw new Error("fullbuy_generation_failed");
  } finally { if (timer) clearTimeout(timer); abort.abort(); }
}
