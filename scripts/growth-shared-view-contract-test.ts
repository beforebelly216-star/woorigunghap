import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FORBIDDEN_PUBLIC_SHARE_KEYS,
  buildOneToManyPublicShare,
  buildOneToOnePublicShare,
  parsePublicSharePayload,
} from "../src/lib/share/public-share-contract";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const oneToOne = buildOneToOnePublicShare({
  relationshipType: "lover",
  relationshipLabel: "연인",
  headline: "같이 있을수록 호흡이 보이는 관계",
  summary: "공유 화면에는 결제 결과 전체가 아니라 관계 핵심만 남겨요.",
  score: 87,
  selfName: "나",
  partnerName: "상대",
  includeDisplayNames: true,
  archetype: {
    id: "spark",
    label: "템포가 빠르게 맞는 조합",
    subtitle: "대화와 반응 속도에서 장점이 보여요.",
    clue: "속도가 빠를수록 중요한 기준은 한 번 더 확인해 보세요.",
  },
  strength: { label: "잘 맞는 지점", copy: "대화·반응 템포" },
  tuning: { label: "맞추면 더 좋은 지점", copy: "말의 속도와 결정 기준" },
});

const parsedOneToOne = parsePublicSharePayload({ ...oneToOne, paymentId: "must-not-survive", resultAccessToken: "must-not-survive", birthDate: "19900101" });
assert.ok(parsedOneToOne && parsedOneToOne.product === "oneToOne");
const oneSerialized = JSON.stringify(parsedOneToOne);
for (const key of FORBIDDEN_PUBLIC_SHARE_KEYS) assert.ok(!oneSerialized.includes(`\"${key}\"`), `public DTO must remove forbidden key: ${key}`);

const oneToMany = buildOneToManyPublicShare({
  relationshipType: "friend",
  relationshipLabel: "친구",
  headline: "편한 장면이 사람마다 다르게 나왔어요",
  summary: "역할형 핵심 결과 세 개까지만 공개해요.",
  includeDisplayNames: false,
  candidates: [
    { displayName: "A", roleLabel: "가장 편한 사람", score: 84 },
    { displayName: "B", roleLabel: "말이 잘 통하는 사람", score: 81 },
    { displayName: "C", roleLabel: "장기관계 리듬이 좋은 사람", score: 79 },
  ],
});
assert.ok(parsePublicSharePayload(oneToMany)?.product === "oneToMany");
assert.equal(oneToMany.candidates[0]?.displayName, undefined, "1:N names remain opt-in");
assert.equal(parsePublicSharePayload({ ...oneToMany, candidates: [] }), null, "empty public comparison is rejected");
assert.equal(parsePublicSharePayload({ ...oneToOne, product: "unknown" }), null, "unknown products are rejected");

const store = source("src/lib/share/public-share-store.ts");
assert.match(store, /token_hash TEXT PRIMARY KEY/);
assert.match(store, /hashOpaqueToken\(token\)/);
assert.match(store, /source_payment_id TEXT NOT NULL/);
assert.match(store, /ensurePublicShareStoreSchema/);
assert.ok(!store.includes("access_token"), "public share store must not persist paid access tokens");

const createRoute = source("src/app/api/share/route.ts");
assert.match(createRoute, /hasServerOrderAccess/);
assert.match(createRoute, /loadOwnedAccountReport/);
assert.match(createRoute, /loadAuthenticatedRequestUser/);
assert.match(createRoute, /parsePublicSharePayload/);
assert.match(createRoute, /createPublicShare/);
assert.ok(!createRoute.includes("inputSnapshot"), "share creation API must not accept raw birth input");

const readRoute = source("src/app/api/share/[token]/route.ts");
assert.match(readRoute, /loadPublicShare/);
assert.ok(!readRoute.includes("loadAuthenticatedRequestUser"), "Shared View read remains public");
assert.ok(!readRoute.includes("hasServerOrderAccess"), "public read must not expose paid-result auth flow");

const sharedView = source("src/app/share/[token]/page.tsx");
const sharedActions = source("src/app/share/[token]/shared-view-actions.tsx");
const sharedCss = source("src/app/share/[token]/shared-view.module.css");
assert.match(sharedView, /loadPublicShare/);
assert.match(sharedView, /SharedViewActions/);
assert.match(sharedActions, /나도 1:1 궁합 보기/);
assert.match(sharedActions, /나도 1:다 비교해보기/);
assert.ok(!sharedView.includes("paymentId"));
assert.ok(!sharedView.includes("accessToken"));
assert.ok(!sharedView.includes("birthDate"));
assert.match(sharedCss, /var\(--saju-bg-base\)/);
assert.match(sharedCss, /var\(--saju-action\)/);
assert.match(sharedCss, /width:\s*min\(100%,\s*720px\)/);
assert.doesNotMatch(sharedCss, /radial-gradient|linear-gradient|#8b7bc7|#b8a9e8/i);
assert.doesNotMatch(sharedCss, /max-width:\s*99999px/);

const client = source("src/lib/share/public-share-client.ts");
assert.match(client, /fetch\("\/api\/share"/);
assert.match(client, /window\.location\.search/);
assert.ok(!client.includes("/share?paymentId="), "paid identifiers must not be embedded into public URLs");

const accountStore = source("src/lib/account-report-store.ts");
assert.match(accountStore, /ensurePublicShareStoreSchema/);
assert.match(accountStore, /DELETE FROM woorigunghap_public_shares shares/);
assert.match(accountStore, /shares\.source_payment_id IN \(SELECT payment_id FROM owned\)/);

const shareFiles = [
  ["src/app/one-to-one/result/compatibility-share-card.tsx", "src/app/one-to-one/result/compatibility-share-card.module.css"],
  ["src/components/one-to-many-share-card.tsx", "src/components/one-to-many-share-card.module.css"],
] as const;
for (const [cardPath, cssPath] of shareFiles) {
  const card = source(cardPath);
  const css = source(cssPath);
  assert.match(card, /createPublicShareUrl/);
  assert.match(card, /canvas\.width = 1080/);
  assert.match(card, /canvas\.height = 1920/);
  assert.match(card, /#F7F7F4/);
  assert.match(card, /#222226/);
  assert.ok(!card.includes("const safeUrl = `${window.location.origin}/`"), `${cardPath} must no longer share the home URL`);
  assert.match(card, /Shared View/);
  assert.doesNotMatch(card, /#8B7BC7|#B8A9E8|createLinearGradient/);
  assert.match(css, /aspect-ratio:\s*9 \/ 16/);
  assert.match(css, /var\(--saju-action\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|var\(--saju-shadow\)|#8B7BC7|#B8A9E8/i);
}

console.log("Growth P4 Shared View contract OK: privacy boundary, Foundation v2 Shared View, neutral 9:16 card export, CTA, and opaque public URL.");
