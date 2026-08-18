import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  OLDER_ORDER_BINDING_VERSION,
  ORDER_BINDING_VERSION,
  PREVIOUS_ORDER_BINDING_VERSION,
  canonicalizeOneToOneInput,
} from "../src/lib/order-binding";
import {
  COWORKER_HIERARCHIES,
  COWORKER_HIERARCHY_LABELS,
  MAX_MOST_CURIOUS_LENGTH,
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
assert.equal(MAX_MOST_CURIOUS_LENGTH, 200);

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
assert.match(relationshipPromptRules("lover"), /관계 기간은 사용자가 제공한 현재 맥락일 뿐/);
assert.match(relationshipPromptRules("lover"), /특정 연도, 대운·세운·월운/);
assert.match(relationshipPromptRules("lover"), /내부 계산 변수명을 사용자 문장에 노출하지 말고/);
assert.match(relationshipPromptRules("lover"), /관찰할 수 없는 무의식·갈망/);

const baseCoworkerInput: OneToOneReportInput = {
  relationshipType: "coworker",
  coworkerHierarchy: "boss",
  relationshipDurationMonths: 18,
  mostCurious: "회의에서 의견이 다를 때 어떻게 말하는 게 좋을까요?",
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
assert.equal(parsedBoss?.relationshipDurationMonths, 18);
assert.equal(parsedBoss?.mostCurious, baseCoworkerInput.mostCurious);
assert.equal(validateOneToOneReportInput(baseCoworkerInput, { requireCoworkerHierarchy: true }).valid, true);
const missingHierarchy = { ...baseCoworkerInput, coworkerHierarchy: null };
assert.equal(validateOneToOneReportInput(missingHierarchy).valid, true, "기존 저장 직장동료 결과는 위계 없이도 읽을 수 있어야 합니다.");
assert.equal(validateOneToOneReportInput(missingHierarchy, { requireCoworkerHierarchy: true }).valid, false, "새 직장동료 주문은 위계를 필수로 받아야 합니다.");
const tooLongQuestion = { ...baseCoworkerInput, mostCurious: "가".repeat(201) };
assert.equal(validateOneToOneReportInput(tooLongQuestion).valid, false, "가장 궁금한 점은 200자를 초과할 수 없습니다.");
const crushWithDuration: OneToOneReportInput = { ...baseCoworkerInput, relationshipType: "crush", coworkerHierarchy: null, relationshipDurationMonths: 3 };
assert.equal(validateOneToOneReportInput(crushWithDuration).valid, false, "짝사랑에는 관계 기간을 받지 않습니다.");

const subordinateInput: OneToOneReportInput = { ...baseCoworkerInput, coworkerHierarchy: "subordinate" };
const changedDuration: OneToOneReportInput = { ...baseCoworkerInput, relationshipDurationMonths: 19 };
const changedQuestion: OneToOneReportInput = { ...baseCoworkerInput, mostCurious: "상사에게 보고는 언제 하는 게 좋을까요?" };
assert.equal(ORDER_BINDING_VERSION, "input-sha256-v4");
assert.equal(PREVIOUS_ORDER_BINDING_VERSION, "input-sha256-v3");
assert.equal(OLDER_ORDER_BINDING_VERSION, "input-sha256-v2");
assert.notEqual(
  canonicalizeOneToOneInput(baseCoworkerInput),
  canonicalizeOneToOneInput(subordinateInput),
  "v4 결제 바인딩은 직장 위계 변경을 감지해야 합니다.",
);
assert.notEqual(
  canonicalizeOneToOneInput(baseCoworkerInput),
  canonicalizeOneToOneInput(changedDuration),
  "v4 결제 바인딩은 관계 기간 변경을 감지해야 합니다.",
);
assert.notEqual(
  canonicalizeOneToOneInput(baseCoworkerInput),
  canonicalizeOneToOneInput(changedQuestion),
  "v4 결제 바인딩은 가장 궁금한 점 변경을 감지해야 합니다.",
);
assert.notEqual(
  canonicalizeOneToOneInput(baseCoworkerInput, PREVIOUS_ORDER_BINDING_VERSION),
  canonicalizeOneToOneInput(subordinateInput, PREVIOUS_ORDER_BINDING_VERSION),
  "v3 결제 바인딩은 직장 위계 변경을 감지해야 합니다.",
);
assert.equal(
  canonicalizeOneToOneInput(baseCoworkerInput, PREVIOUS_ORDER_BINDING_VERSION),
  canonicalizeOneToOneInput(changedQuestion, PREVIOUS_ORDER_BINDING_VERSION),
  "과거 v3 결제 해시는 새 질문 필드 때문에 바뀌면 안 됩니다.",
);
assert.equal(
  canonicalizeOneToOneInput(baseCoworkerInput, PREVIOUS_ORDER_BINDING_VERSION),
  canonicalizeOneToOneInput(changedDuration, PREVIOUS_ORDER_BINDING_VERSION),
  "과거 v3 결제 해시는 새 관계 기간 필드 때문에 바뀌면 안 됩니다.",
);
assert.equal(
  canonicalizeOneToOneInput(baseCoworkerInput, OLDER_ORDER_BINDING_VERSION),
  canonicalizeOneToOneInput(subordinateInput, OLDER_ORDER_BINDING_VERSION),
  "과거 v2 결제 해시는 직장 위계나 새 편집 필드 때문에 바뀌면 안 됩니다.",
);

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
assert.match(engine, /paid-report-v7-editorial-v8-safe-evidence/);
assert.match(engine, /paid-report-evidence-v5/);
assert.match(engine, /relationshipPromptRules\(/);
assert.match(engine, /input\.coworkerHierarchy \?\? null/);
assert.match(engine, /buildReportEditorialContext/);
assert.match(engine, /paidEditorialEvidence/);
assert.match(engine, /RELATIONSHIP_ROLE_SCORE_ONLY/);
assert.match(engine, /aRoleSupply: _aRoleSupply/);
assert.match(engine, /bRoleSupply: _bRoleSupply/);
assert.match(engine, /가장 궁금한 점에 대한 답/);
assert.match(engine, /relationshipDurationMonths/);
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
assert.match(form, /relationshipDurationMonths/);
assert.match(form, /관계 기간 \(개월, 선택\)/);
assert.match(form, /mostCurious/);
assert.match(form, /가장 궁금한 것 한 가지가 있나요/);
assert.match(form, /MAX_MOST_CURIOUS_LENGTH/);

const orderRoute = readFileSync("src/app/api/orders/one-to-one/route.ts", "utf8");
assert.match(orderRoute, /requireCoworkerHierarchy: true/);

const checkout = readFileSync("src/app/one-to-one/checkout/page.tsx", "utf8");
assert.match(checkout, /업무 관계/);
assert.match(checkout, /COWORKER_HIERARCHY_LABELS/);
assert.match(checkout, /관계 기간/);
assert.match(checkout, /가장 궁금한 점/);

const verification = readFileSync("src/lib/payments/verification.ts", "utf8");
assert.match(verification, /PREVIOUS_ORDER_BINDING_VERSION/);
assert.match(verification, /OLDER_ORDER_BINDING_VERSION/);
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

console.log("Day 21 relationship editorial + safe evidence + user context + v4 binding checks: PASS");
