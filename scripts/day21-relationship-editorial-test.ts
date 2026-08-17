import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ORDER_BINDING_VERSION,
  PREVIOUS_ORDER_BINDING_VERSION,
  canonicalizeOneToOneInput,
} from "../src/lib/order-binding";
import {
  COWORKER_HIERARCHIES,
  COWORKER_HIERARCHY_LABELS,
  parseOneToOneReportInput,
  validateOneToOneReportInput,
  type OneToOneReportInput,
} from "../src/lib/report-input";
import {
  RELATIONSHIP_EDITORIAL,
  RELATIONSHIP_EDITORIAL_VERSION,
  relationshipPromptRules,
} from "../src/lib/relationship-editorial";

assert.equal(RELATIONSHIP_EDITORIAL_VERSION, "relationship-editorial-v3-name-tokens");
assert.deepEqual(Object.keys(RELATIONSHIP_EDITORIAL).sort(), ["coworker", "crush", "flirting", "friend", "lover"].sort());
assert.deepEqual(COWORKER_HIERARCHIES, ["boss", "peer", "subordinate"]);
assert.equal(COWORKER_HIERARCHY_LABELS.boss, "상대가 내 상사");
assert.equal(COWORKER_HIERARCHY_LABELS.peer, "동급 동료");
assert.equal(COWORKER_HIERARCHY_LABELS.subordinate, "상대가 내 부하");

assert.notEqual(RELATIONSHIP_EDITORIAL.crush.ui.strategyTitle, RELATIONSHIP_EDITORIAL.flirting.ui.strategyTitle);
assert.notEqual(RELATIONSHIP_EDITORIAL.flirting.ui.strategyTitle, RELATIONSHIP_EDITORIAL.lover.ui.strategyTitle);
assert.match(relationshipPromptRules("crush"), /호감 여부를 확정하지 말고/);
assert.match(relationshipPromptRules("flirting"), /교제와 독점성을 가정하지 않는다/);
assert.match(relationshipPromptRules("lover"), /이미 교제 중인 관계/);
assert.match(relationshipPromptRules("friend"), /연애적 끌림이나 독점성을 전제로 하지 않는다/);
assert.match(relationshipPromptRules("coworker"), /위계 정보 없음/);
assert.match(relationshipPromptRules("coworker", "boss"), /두 번째 사람이 첫 번째 사람의 상사/);
assert.match(relationshipPromptRules("coworker", "boss"), /보고 타이밍, 요청 방식, 이견 제시/);
assert.match(relationshipPromptRules("coworker", "peer"), /두 사람은 동급 동료/);
assert.match(relationshipPromptRules("coworker", "peer"), /합의 방식, 역할 분담, 일정 조율/);
assert.match(relationshipPromptRules("coworker", "subordinate"), /두 번째 사람이 첫 번째 사람의 부하/);
assert.match(relationshipPromptRules("coworker", "subordinate"), /지시 명확화, 위임 범위, 체크인 주기/);
assert.match(relationshipPromptRules("lover"), /상대 해부 > 이 상대에게 통하는 나의 강점/);
assert.match(relationshipPromptRules("friend"), /최소 40%는 사용자가 바로 실행할 수 있는 행동 기준/);
assert.match(relationshipPromptRules("crush"), /공략법이 아니라 배려법/);
assert.match(relationshipPromptRules("lover"), /\{\{SELF\}\}/);
assert.match(relationshipPromptRules("lover"), /\{\{PARTNER\}\}/);
assert.match(relationshipPromptRules("lover"), /\{\{BOTH\}\}/);
assert.match(relationshipPromptRules("lover"), /실제 이름·별칭은 서버가 응답 뒤에 결합/);

const baseCoworkerInput: OneToOneReportInput = {
  relationshipType: "coworker",
  coworkerHierarchy: "boss",
  personA: {
    displayName: "나",
    gender: "male",
    calendarType: "solar",
    birthDate: "1990-05-15",
    birthTimeKnown: true,
    birthTime: "14:30",
    isLeapMonth: false,
  },
  personB: {
    displayName: "상대",
    gender: "female",
    calendarType: "solar",
    birthDate: "1992-10-24",
    birthTimeKnown: false,
    birthTime: null,
    isLeapMonth: false,
  },
};

const parsedBoss = parseOneToOneReportInput(baseCoworkerInput);
assert.equal(parsedBoss?.coworkerHierarchy, "boss");
assert.equal(validateOneToOneReportInput(baseCoworkerInput, { requireCoworkerHierarchy: true }).valid, true);
const missingHierarchy = { ...baseCoworkerInput, coworkerHierarchy: null };
assert.equal(validateOneToOneReportInput(missingHierarchy).valid, true, "기존 저장 직장동료 결과는 위계 없이도 읽을 수 있어야 합니다.");
assert.equal(validateOneToOneReportInput(missingHierarchy, { requireCoworkerHierarchy: true }).valid, false, "새 직장동료 주문은 위계를 필수로 받아야 합니다.");

const subordinateInput: OneToOneReportInput = { ...baseCoworkerInput, coworkerHierarchy: "subordinate" };
assert.equal(ORDER_BINDING_VERSION, "input-sha256-v3");
assert.equal(PREVIOUS_ORDER_BINDING_VERSION, "input-sha256-v2");
assert.notEqual(
  canonicalizeOneToOneInput(baseCoworkerInput),
  canonicalizeOneToOneInput(subordinateInput),
  "v3 결제 바인딩은 직장 위계 변경을 감지해야 합니다.",
);
assert.equal(
  canonicalizeOneToOneInput(baseCoworkerInput, PREVIOUS_ORDER_BINDING_VERSION),
  canonicalizeOneToOneInput(subordinateInput, PREVIOUS_ORDER_BINDING_VERSION),
  "과거 v2 결제 해시는 새 위계 필드 때문에 바뀌면 안 됩니다.",
);

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
assert.match(engine, /paid-report-v7-editorial-v6-coworker-hierarchy/);
assert.match(engine, /relationshipPromptRules\(/);
assert.match(engine, /input\.coworkerHierarchy \?\? null/);
assert.match(engine, /relationshipEditorialVersion/);
assert.match(engine, /partnerDeepDive: PARTNER_DEEP_DIVE_SCHEMA/);
assert.match(engine, /personalLeverage: PERSONAL_LEVERAGE_SCHEMA/);
assert.match(engine, /situationStrategy: SITUATION_STRATEGY_SCHEMA/);
assert.match(engine, /actionPlan30: ACTION_PLAN_30_SCHEMA/);
assert.match(engine, /PARTNER_DEEP_DIVE_SHORT/);
assert.match(engine, /ACTION_PLAN_30_WEEKS_INVALID/);
assert.match(engine, /maxTokens: 7000/);

const form = readFileSync("src/components/one-to-one-form.tsx", "utf8");
assert.match(form, /coworkerHierarchy/);
assert.match(form, /두 번째 사람은 나와 어떤 업무 관계인가요/);
assert.match(form, /COWORKER_HIERARCHY_LABELS/);
assert.match(form, /requireCoworkerHierarchy: true/);

const orderRoute = readFileSync("src/app/api/orders/one-to-one/route.ts", "utf8");
assert.match(orderRoute, /requireCoworkerHierarchy: true/);

const checkout = readFileSync("src/app/one-to-one/checkout/page.tsx", "utf8");
assert.match(checkout, /업무 관계/);
assert.match(checkout, /COWORKER_HIERARCHY_LABELS/);

const verification = readFileSync("src/lib/payments/verification.ts", "utf8");
assert.match(verification, /PREVIOUS_ORDER_BINDING_VERSION/);
assert.match(verification, /hashOneToManyInput\(expectedInput as OneToManyReportInput, bindingVersion\)/);

const chaptersA = readFileSync("src/app/one-to-one/result/report-v2-chapters-a.tsx", "utf8");
assert.match(chaptersA, /상대 해부 핵심/);
assert.match(chaptersA, /content\.partnerDeepDive/);
assert.match(chaptersA, /observableScenes\.map/);
assert.match(chaptersA, /content\.personalLeverage/);
assert.match(chaptersA, /conversationScripts\.map/);
assert.match(chaptersA, /backfireHabits\.map/);

const chaptersB = readFileSync("src/app/one-to-one/result/report-v2-chapters-b.tsx", "utf8");
assert.match(chaptersB, /getRelationshipEditorialProfileByLabel/);
assert.match(chaptersB, /editorial\.ui\.strategyTitle/);
assert.match(chaptersB, /content\.situationStrategy/);
assert.match(chaptersB, /stepByStep\.map/);
assert.match(chaptersB, /progressSignals/);
assert.match(chaptersB, /stopSignals/);
assert.match(chaptersB, /content\.actionPlan30/);
assert.match(chaptersB, /RELATIONSHIP FLOW & 3-YEAR TIMING/);
assert.match(chaptersB, /threeYearTiming\.years\.map/);
assert.match(chaptersB, /TIMING_PHASE_LABEL/);
assert.match(chaptersB, /특정 월·날짜 예측은 아직 포함하지 않습니다/);

const resultV2 = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
assert.match(resultV2, /threeYearTiming=\{snapshot\.threeYearTiming\}/);
assert.doesNotMatch(resultV2, /dimension !== "luckCycleAlignment"/);

console.log("Day 21 relationship editorial + privacy-safe name tokens + coworker hierarchy + deep content contract checks: PASS");
