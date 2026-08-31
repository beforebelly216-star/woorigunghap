import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateOneToOneCompatibility } from "../src/lib/compatibility/engine";
import {
  getRelationshipNetworkGrade,
  parseRelationshipNetworkPublic,
  RELATIONSHIP_NETWORK_GRADE_COPY,
  RELATIONSHIP_NETWORK_GRADES,
  RELATIONSHIP_NETWORK_MEMBER_LIMIT,
  RELATIONSHIP_NETWORK_VERSION,
  relationshipNetworkPairKey,
} from "../src/lib/relationship-network-contract";
import type { PersonBirthInput } from "../src/lib/report-input";

const gradeBoundaries = [
  [30, "E"], [49, "E"],
  [50, "D"], [59, "D"],
  [60, "C"], [69, "C"],
  [70, "B"], [79, "B"],
  [80, "A"], [89, "A"],
  [90, "S"], [100, "S"],
] as const;

for (const [score, expected] of gradeBoundaries) {
  assert.equal(getRelationshipNetworkGrade(score), expected, `${score}점 등급은 ${expected}여야 합니다.`);
}
for (let score = 30; score <= 100; score += 1) {
  const grade = getRelationshipNetworkGrade(score);
  assert.ok(RELATIONSHIP_NETWORK_GRADES.includes(grade));
  const range = RELATIONSHIP_NETWORK_GRADE_COPY[grade];
  assert.ok(score >= range.min && score <= range.max, `${score}점이 ${grade}등급 범위를 벗어났습니다.`);
}
assert.equal(RELATIONSHIP_NETWORK_MEMBER_LIMIT, 12, "초기 공개 네트워크는 계산량 보호를 위해 12명으로 제한합니다.");

function person(
  displayName: string,
  gender: PersonBirthInput["gender"],
  birthDate: string,
  birthTime: string,
): PersonBirthInput {
  return {
    displayName,
    gender,
    calendarType: "solar",
    birthDate,
    birthTimeKnown: true,
    birthTime,
    isLeapMonth: false,
  };
}

const sResult = calculateOneToOneCompatibility({
  relationshipType: "friend",
  personA: person("S-A", "male", "1982-10-21", "20:30"),
  personB: person("S-B", "female", "1988-01-01", "12:30"),
}, { timingBaseYear: 2026 });
assert.equal(sResult.score, 91);
assert.equal(getRelationshipNetworkGrade(sResult.score), "S", "실제 결정론 계산에서 S등급이 도달 가능해야 합니다.");

const eResult = calculateOneToOneCompatibility({
  relationshipType: "friend",
  personA: person("E-A", "male", "1978-10-17", "12:30"),
  personB: person("E-B", "female", "1966-12-25", "12:30"),
}, { timingBaseYear: 2026 });
assert.equal(eResult.score, 43);
assert.equal(getRelationshipNetworkGrade(eResult.score), "E", "실제 결정론 계산에서 E등급이 도달 가능해야 합니다.");

const memberIds = ["member-a", "member-b", "member-c", "member-d"];
const pairKeys = new Set<string>();
for (let left = 0; left < memberIds.length; left += 1) {
  for (let right = left + 1; right < memberIds.length; right += 1) {
    pairKeys.add(relationshipNetworkPairKey(memberIds[left], memberIds[right]));
  }
}
assert.equal(pairKeys.size, memberIds.length * (memberIds.length - 1) / 2, "N명은 N(N-1)/2개의 중복 없는 관계를 가져야 합니다.");
assert.equal(relationshipNetworkPairKey("z", "a"), relationshipNetworkPairKey("a", "z"), "관계 키는 A/B 순서와 무관해야 합니다.");

const parsed = parseRelationshipNetworkPublic({
  version: RELATIONSHIP_NETWORK_VERSION,
  hostMemberId: "member-a",
  memberLimit: 12,
  memberCount: 2,
  graphVersion: 2,
  isOpen: true,
  createdAt: "private-timestamp",
  members: [
    { id: "member-a", displayName: "방장", isHost: true, birthDate: "1982-10-21" },
    { id: "member-b", displayName: "친구", isHost: false },
  ],
  edges: [{
    memberAId: "member-a",
    memberBId: "member-b",
    score: 91,
    grade: "S",
    scoreRange: { min: 91, max: 91 },
    strengths: ["대화 템포"],
    adjustments: ["생활 리듬"],
    calculationVersion: "engine/scoring/grade",
  }],
});
assert.ok(parsed);
const publicPayload = JSON.stringify(parsed);
for (const privateField of ["birthDate", "birthTime", "gender", "calendarType", "birth_ciphertext", "createdAt", "rawTotal", "representativeEvidence"]) {
  assert.equal(publicPayload.includes(privateField), false, `공개 네트워크에 ${privateField}가 포함되면 안 됩니다.`);
}

const homeSource = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
const idealIndex = homeSource.indexOf("이상형 찾기");
const networkIndex = homeSource.indexOf("1:N 궁합 보기");
const paidIndex = homeSource.indexOf("1:1 궁합 보기");
assert.ok(idealIndex >= 0 && idealIndex < networkIndex && networkIndex < paidIndex, "홈 카드는 이상형 → 1:N → 1:1 순서여야 합니다.");
assert.ok(homeSource.includes("1:N 무료"));

const networkPageSource = readFileSync(join(process.cwd(), "src/app/one-to-many/page.tsx"), "utf8");
assert.ok(networkPageSource.includes("RelationshipNetworkCreateForm"));
assert.equal(networkPageSource.includes("OneToManyForm"), false, "신규 1:N 진입은 과거 유료 폼을 렌더하지 않아야 합니다.");

const storeSource = readFileSync(join(process.cwd(), "src/lib/relationship-network-store.ts"), "utf8");
assert.ok(storeSource.includes("calculateOneToOneCompatibility"), "모든 관계선은 기존 1:1 권위 계산 엔진을 사용해야 합니다.");
assert.ok(storeSource.includes("{ timingBaseYear }"), "방 생성 연도의 계산 기준을 모든 새 관계선에 고정해야 합니다.");
assert.equal(storeSource.includes("generateOneToManyNarrative"), false, "무료 네트워크는 유료 AI 서술을 호출하지 않아야 합니다.");
assert.ok(storeSource.includes("birth_ciphertext"), "생년정보는 암호화 저장 열만 사용해야 합니다.");
assert.ok(storeSource.includes("createHmac(\"sha256\", key)"), "입력 결합값은 키 기반 HMAC이어야 합니다.");
assert.ok(storeSource.includes("process.env.NODE_ENV === \"production\""), "Production은 결제 secret을 암호화 fallback으로 사용하면 안 됩니다.");

const experienceSource = readFileSync(join(process.cwd(), "src/components/relationship-network-experience.tsx"), "utf8");
assert.equal(experienceSource.includes("const url = window.location.href"), false, "공유 링크에 권한 fragment가 포함되면 안 됩니다.");
assert.ok(experienceSource.includes("window.location.origin"), "공유 링크는 fragment를 제외해 다시 조립해야 합니다.");

const cronSource = readFileSync(join(process.cwd(), "src/app/api/cron/relationship-networks/route.ts"), "utf8");
assert.ok(cronSource.includes("CRON_SECRET"));
assert.ok(cronSource.includes("purgeExpiredRelationshipNetworkData"));

const catalogSource = readFileSync(join(process.cwd(), "src/lib/catalog.ts"), "utf8");
assert.match(catalogSource, /oneToMany:[\s\S]*?amount:\s*3000/, "과거 유료 1:N 주문 복구를 위해 카탈로그 금액은 유지해야 합니다.");

console.log(`Relationship network contract passed: S=${sResult.score}, E=${eResult.score}, pairs(4)=${pairKeys.size}`);
