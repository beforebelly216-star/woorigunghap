import assert from "node:assert/strict";
import {
  FORBIDDEN_PUBLIC_SHARE_KEYS,
  buildOneToManyPublicShare,
  buildOneToOnePublicShare,
} from "../src/lib/share/public-share-contract";

function assertNoForbiddenKeys(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const key of FORBIDDEN_PUBLIC_SHARE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`\\"${key}\\"`), `public share payload must not expose ${key}`);
  }
}

const oneToOne = buildOneToOnePublicShare({
  relationshipType: "flirting",
  relationshipLabel: "썸",
  headline: "말보다 타이밍이 먼저 맞는 두 사람",
  summary: "서로의 반응을 빠르게 읽지만 확신을 주는 속도에는 차이가 있어요.",
  score: 87.4,
  selfName: "민지",
  partnerName: "준호",
  includeDisplayNames: false,
  archetype: {
    id: "spark",
    label: "첫 단서부터 맞아드는 쌍",
    subtitle: "처음부터 서로의 리듬을 알아보는 궁합",
    clue: "기본 케미가 빠르게 맞물리는 편이에요.",
  },
  strength: { label: "잘 맞는 지점", copy: "대화의 템포가 자연스럽게 이어져요." },
  tuning: { label: "조율 지점", copy: "확신을 주는 속도를 서로 확인해 보세요." },
  paymentId: "payment-secret",
  accessToken: "access-secret",
  birthDate: "2000-01-01",
} as Parameters<typeof buildOneToOnePublicShare>[0] & Record<string, unknown>);

assert.equal(oneToOne.product, "oneToOne");
assert.equal(oneToOne.score, 87);
assert.deepEqual(oneToOne.participants, { self: undefined, partner: undefined });
assert.doesNotMatch(JSON.stringify(oneToOne), /민지|준호|payment-secret|access-secret|2000-01-01/);
assertNoForbiddenKeys(oneToOne);

const namedOneToOne = buildOneToOnePublicShare({
  relationshipType: "lover",
  relationshipLabel: "연인",
  headline: "함께 있을수록 리듬이 선명해지는 두 사람",
  summary: "좋은 점과 조율할 점이 함께 보이는 관계예요.",
  score: 105,
  selfName: "민지",
  partnerName: "준호",
  includeDisplayNames: true,
  archetype: {
    id: "growth",
    label: "천천히 깊어지는 쌍",
    subtitle: "시간을 들일수록 장점이 선명해지는 궁합",
    clue: "여러 강점이 차곡차곡 쌓이는 관계예요.",
  },
});
assert.deepEqual(namedOneToOne.participants, { self: "민지", partner: "준호" });
assert.equal(namedOneToOne.score, 100);

const oneToMany = buildOneToManyPublicShare({
  relationshipType: "friend",
  relationshipLabel: "친구",
  headline: "나와 잘 맞는 사람들의 결이 달라요",
  summary: "편안함, 대화, 회복력에서 각 후보의 강점이 다르게 보여요.",
  referenceName: "나",
  includeDisplayNames: false,
  candidates: [
    { displayName: "A", roleLabel: "가장 편안한 사람", score: 91 },
    { displayName: "B", roleLabel: "말이 잘 통하는 사람", score: 84 },
    { displayName: "C", roleLabel: "의외로 잘 맞는 사람", score: 79 },
    { displayName: "D", roleLabel: "다른 장점이 있는 사람", score: 72 },
  ],
  inputSnapshot: { secret: true },
  narrative: "paid body",
} as Parameters<typeof buildOneToManyPublicShare>[0] & Record<string, unknown>);

assert.equal(oneToMany.product, "oneToMany");
assert.equal(oneToMany.candidates.length, 3, "shared comparison view exposes at most three highlights");
assert.equal(oneToMany.referenceName, undefined);
assert.ok(oneToMany.candidates.every((candidate) => candidate.displayName === undefined));
assert.doesNotMatch(JSON.stringify(oneToMany), /\"A\"|\"B\"|\"C\"|\"D\"|paid body|secret/);
assertNoForbiddenKeys(oneToMany);

console.log("growth public share DTO/privacy contract: PASS");
