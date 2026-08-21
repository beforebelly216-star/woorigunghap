import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function read(path) { return readFileSync(path, "utf8"); }
function write(path, content) { writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`); }
function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`missing replacement target: ${label}`);
  return source.replace(from, to);
}
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const promptV11 = "paid-report-v7-editorial-v11-conclusion-first";
const promptV12 = "paid-report-v7-editorial-v12-persona-inner-mind";

// Backward-compatible assembled report extension.
{
  const path = "src/lib/narrative/report-deep-content.ts";
  let source = read(path);
  source = replaceRequired(source,
`export type PersonalLeverage = {`,
`export type PartnerInnerMindHero = {
  headline: string;
  innerVoice: string;
  sceneTranslation: string;
  sajuBasis: string;
};

export type PersonalLeverage = {`,
    "inner mind hero type");
  source = replaceRequired(source,
`  partnerDeepDive?: PartnerDeepDive;
  personalLeverage?: PersonalLeverage;`,
`  partnerDeepDive?: PartnerDeepDive;
  partnerInnerMindHero?: PartnerInnerMindHero;
  personalLeverage?: PersonalLeverage;`,
    "optional assembled hero field");
  write(path, source);
}

// Narrative schema, persona contract, and generation instructions.
{
  const path = "src/lib/narrative/report-engine-v7.ts";
  let source = read(path);
  source = replaceRequired(source, promptV11, promptV12, "prompt version");
  source = replaceRequired(source,
`  PartnerDeepDive,
  PersonalLeverage,`,
`  PartnerDeepDive,
  PartnerInnerMindHero,
  PersonalLeverage,`,
    "hero type import");

  source = replaceRequired(source,
`const PERSONAL_LEVERAGE_SCHEMA = objectSchema({`,
`const PARTNER_INNER_MIND_HERO_SCHEMA = objectSchema({
  headline: { type: "string" },
  innerVoice: { type: "string" },
  sceneTranslation: { type: "string" },
  sajuBasis: { type: "string" },
});

const PERSONAL_LEVERAGE_SCHEMA = objectSchema({`,
    "hero schema");

  source = replaceRequired(source,
`  partnerDeepDive: PARTNER_DEEP_DIVE_SCHEMA,
  personalLeverage: PERSONAL_LEVERAGE_SCHEMA,`,
`  partnerDeepDive: PARTNER_DEEP_DIVE_SCHEMA,
  partnerInnerMindHero: PARTNER_INNER_MIND_HERO_SCHEMA,
  personalLeverage: PERSONAL_LEVERAGE_SCHEMA,`,
    "dynamics hero schema field");

  source = replaceRequired(source,
`  partnerDeepDive: PartnerDeepDive;
  personalLeverage: PersonalLeverage;`,
`  partnerDeepDive: PartnerDeepDive;
  partnerInnerMindHero: PartnerInnerMindHero;
  personalLeverage: PersonalLeverage;`,
    "dynamics hero type field");

  source = replaceRequired(source,
`function validPersonalLeverage(value: unknown): value is PersonalLeverage {`,
`function validPartnerInnerMindHero(value: unknown): value is PartnerInnerMindHero {
  if (!isObject(value)) return false;
  return ["headline", "innerVoice", "sceneTranslation", "sajuBasis"].every((key) => hasString(value, key));
}
function validPersonalLeverage(value: unknown): value is PersonalLeverage {`,
    "hero validator");

  source = replaceRequired(source,
`    && validPartnerDeepDive(value.partnerDeepDive)
    && validPersonalLeverage(value.personalLeverage)`,
`    && validPartnerDeepDive(value.partnerDeepDive)
    && validPartnerInnerMindHero(value.partnerInnerMindHero)
    && validPersonalLeverage(value.personalLeverage)`,
    "dynamics validation");

  source = replaceRequired(source,
`  if (compactLength(value.partnerDeepDive) < 650) issues.push("PARTNER_DEEP_DIVE_SHORT");
  if (compactLength(value.personalLeverage) < 450) issues.push("PERSONAL_LEVERAGE_SHORT");`,
`  if (compactLength(value.partnerDeepDive) < 650) issues.push("PARTNER_DEEP_DIVE_SHORT");
  if (compactLength(value.partnerInnerMindHero) < 120) issues.push("PARTNER_INNER_MIND_HERO_SHORT");
  if (compactLength(value.personalLeverage) < 450) issues.push("PERSONAL_LEVERAGE_SHORT");`,
    "hero quality density");

  source = replaceRequired(source,
`  "당신은 '우리사주'의 1,000원 유료 관계 사주 리포트를 쓰는 한국어 전문 편집자입니다.",
  "핵심 결론을 먼저 말합니다.`,
`  "당신은 '우리사주'에서 사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구처럼 말하는 한국어 해설자입니다.",
  "목소리는 관계 해설자가 중심이고, 친한 친구가 옆에서 핵심을 짚어 주는 친근함을 더하며, 명리 전문가는 필요한 근거를 짧고 정확하게 설명하는 정도로만 드러내세요. 도사체·점집체·논문체·상담 기록체는 피하세요.",
  "재미를 위해 핵심을 숨기지 마세요. '이건 꽤 잘 맞아요', '여기서 자주 꼬입니다', '상대는 이 장면에서 속도가 느려집니다'처럼 관계 결론을 또렷하게 말하되, 근거 없는 운명론·공포 조장·희망고문은 만들지 마세요.",
  "관계 유형에 따라 미세 톤을 조정하세요. 짝사랑은 신호 해석과 거리 조절, 썸은 속도와 확신, 연인은 반복 패턴과 회복, 친구는 편안함과 경계, 직장동료는 신뢰와 역할 조율을 중심으로 말하세요.",
  "핵심 결론을 먼저 말합니다.`,
    "persona base rules");

  source = replaceRequired(source,
`- partnerDeepDive.outerInnerContrast는 3문장 안팎. 상황에 따라 실제로 드러나기 쉬운 반응 차이를 먼저 설명하고, 계산 근거를 뒤에 붙이세요.\\n- comfortTriggers / sensitiveTriggers / preferredInteraction은 각각 2개를 우선하고 상황→관찰 반응→배려 방법을 짧게 담으세요.`,
`- partnerDeepDive.outerInnerContrast는 3문장 안팎. 상황에 따라 실제로 드러나기 쉬운 반응 차이를 먼저 설명하고, 계산 근거를 뒤에 붙이세요.\\n- partnerInnerMindHero는 CH2 상단의 '그 사람의 속마음' 히어로 카드입니다. 실제 내면을 안다고 주장하지 말고 계산된 관계 반응을 사용자가 바로 이해하도록 1인칭 가상 독백으로 번역하세요.\\n- partnerInnerMindHero.headline은 28자 안팎의 결론형 제목, innerVoice는 따옴표 없이 1~2문장의 자연스러운 1인칭 독백, sceneTranslation은 그 독백이 연락·약속·갈등·표현 같은 실제 장면에서 어떻게 드러나는지 2문장, sajuBasis는 일간·일지·오행·천간/지지 상호작용 중 실제 payload 근거를 1~2문장으로 설명하세요.\\n- innerVoice에 '진짜 속마음', '마음속에서는', '사실은'처럼 숨은 심리를 사실로 확정하는 표현을 쓰지 마세요. 상대를 대신해 고백문을 창작하지 말고 관계 반응의 방향만 번역하세요.\\n- comfortTriggers / sensitiveTriggers / preferredInteraction은 각각 2개를 우선하고 상황→관찰 반응→배려 방법을 짧게 담으세요.`,
    "hero generation instructions");
  write(path, source);
}

// CH2 hero renderer. Old stored reports simply omit this optional field.
{
  const path = "src/app/one-to-one/result/report-v2-chapters-a.tsx";
  let source = read(path);
  source = replaceRequired(source,
`    >
      <div className="reference-partner-lead">`,
`    >
      {content.partnerInnerMindHero ? <aside className="partner-inner-mind-hero" aria-label="그 사람의 속마음">
        <small>그 사람의 속마음</small>
        <h3>{content.partnerInnerMindHero.headline}</h3>
        <blockquote>“{content.partnerInnerMindHero.innerVoice}”</blockquote>
        <p>{content.partnerInnerMindHero.sceneTranslation}</p>
        <div><span>사주로 보면</span><p>{content.partnerInnerMindHero.sajuBasis}</p></div>
      </aside> : null}

      <div className="reference-partner-lead">`,
    "CH2 hero renderer");
  write(path, source);
}

// Hero visual hierarchy.
{
  const path = "src/app/report-extra.css";
  let source = read(path);
  source += `

/* P4: partner inner-mind editorial hero. */
.partner-inner-mind-hero {
  position: relative;
  overflow: hidden;
  margin: 0 0 24px;
  border: 1px solid #2f493c;
  border-radius: 26px;
  padding: 28px;
  background: linear-gradient(145deg, #273b31 0%, #3b5146 100%);
  color: #fffaf1;
}
.partner-inner-mind-hero::after {
  content: "“";
  position: absolute;
  right: 18px;
  top: -34px;
  color: rgba(255, 250, 241, .08);
  font-family: Georgia, serif;
  font-size: 10rem;
  line-height: 1;
}
.partner-inner-mind-hero > small {
  display: block;
  margin-bottom: 10px;
  color: #d8c9b0;
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .13em;
}
.partner-inner-mind-hero h3 {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 0 14px;
  font-family: Georgia, serif;
  font-size: clamp(1.55rem, 4.3vw, 2.45rem);
  font-weight: 500;
  line-height: 1.28;
  letter-spacing: -.025em;
}
.partner-inner-mind-hero blockquote {
  position: relative;
  z-index: 1;
  margin: 0 0 16px;
  color: #fff8ec;
  font-size: clamp(1.05rem, 2.8vw, 1.28rem);
  font-weight: 700;
  line-height: 1.65;
}
.partner-inner-mind-hero > p {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0;
  color: #e7ded0;
  line-height: 1.7;
}
.partner-inner-mind-hero > div {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  border-top: 1px solid rgba(255, 250, 241, .18);
  padding-top: 14px;
}
.partner-inner-mind-hero > div span {
  display: block;
  margin-bottom: 5px;
  color: #cdbb9e;
  font-size: .72rem;
  font-weight: 900;
  letter-spacing: .08em;
}
.partner-inner-mind-hero > div p { margin: 0; color: #d9d3c9; font-size: .9rem; line-height: 1.65; }
@media (max-width: 700px) { .partner-inner-mind-hero { padding: 22px 19px; border-radius: 22px; } }
`;
  write(path, source);
}

// Keep all prompt-version static contracts aligned.
for (const path of walk("scripts").filter((path) => path.endsWith(".ts"))) {
  const source = read(path);
  const next = source.replaceAll(promptV11, promptV12);
  if (next !== source) write(path, next);
}

// Dedicated P4 contract.
write("scripts/report-persona-hero-contract-test.ts", `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const engine = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
const deep = readFileSync("src/lib/narrative/report-deep-content.ts", "utf8");
const chapter = readFileSync("src/app/one-to-one/result/report-v2-chapters-a.tsx", "utf8");
const css = readFileSync("src/app/report-extra.css", "utf8");

assert.match(engine, /paid-report-v7-editorial-v12-persona-inner-mind/);
assert.match(engine, /사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구/);
assert.match(engine, /도사체·점집체·논문체·상담 기록체는 피하세요/);
assert.match(engine, /짝사랑은 신호 해석과 거리 조절/);
assert.match(engine, /partnerInnerMindHero: PARTNER_INNER_MIND_HERO_SCHEMA/);
assert.match(engine, /validPartnerInnerMindHero/);
assert.match(engine, /1인칭 가상 독백/);
assert.match(engine, /실제 내면을 안다고 주장하지 말고/);
assert.match(engine, /PARTNER_INNER_MIND_HERO_SHORT/);
assert.match(deep, /export type PartnerInnerMindHero/);
assert.match(deep, /partnerInnerMindHero\?: PartnerInnerMindHero/);
assert.match(chapter, /partner-inner-mind-hero/);
assert.match(chapter, />그 사람의 속마음</);
assert.match(chapter, />사주로 보면</);
assert.match(css, /\.partner-inner-mind-hero/);
assert.match(css, /@media \(max-width: 700px\).*partner-inner-mind-hero/s);

console.log("paid report P4 persona + inner-mind hero contract: PASS");
`);

// Package script.
{
  const path = "package.json";
  let source = read(path);
  source = replaceRequired(source,
`    "test:report:tone": "tsx scripts/report-tone-contract-test.ts"`,
`    "test:report:tone": "tsx scripts/report-tone-contract-test.ts",
    "test:report:persona": "tsx scripts/report-persona-hero-contract-test.ts"`,
    "package persona test");
  write(path, source);
}

// State docs.
{
  const path = "docs/PROJECT_STATE.md";
  let source = read(path);
  source = source.replaceAll(promptV11, promptV12);
  source = replaceRequired(source,
`## 카카오 완료 알림 구조`,
`## 2026-08-22 1:1 리포트 P4-1 개선

- 유료 1:1 화자를 **사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구**로 고정했다. 관계 해설이 중심이고 친한 친구의 직관적 말투를 더하되, 명리 전문가는 필요한 계산 근거를 짧게 설명하는 역할만 맡는다.
- 관계별 미세 톤을 분리했다: 짝사랑은 신호/거리, 썸은 속도/확신, 연인은 반복 패턴/회복, 친구는 편안함/경계, 직장동료는 신뢰/역할 조율을 중심으로 쓴다.
- CH2 상단에 신규 생성분용 \`partnerInnerMindHero\`를 추가했다. 이는 상대의 실제 내면을 단정하지 않고 계산된 관계 반응을 1인칭 가상 독백으로 번역하는 편집 장치다.
- 기존 저장 리포트에서는 해당 필드를 optional로 유지해 재열람 호환성을 보존한다.

## 카카오 완료 알림 구조`,
    "project state P4 section");
  write(path, source);
}

{
  const path = "docs/DECISIONS.md";
  let source = read(path);
  source = replaceRequired(source,
`- 1:N 비교에서는 \`첫 번째/두 번째/세 번째\`, \`강점 1/2/3\` 같은 순번형 명명을 피하고 후보 이름 또는 의미가 드러나는 제목을 사용한다.`,
`- 1:N 비교에서는 \`첫 번째/두 번째/세 번째\`, \`강점 1/2/3\` 같은 순번형 명명을 피하고 후보 이름 또는 의미가 드러나는 제목을 사용한다.
- 유료 1:1의 기본 화자는 **사주를 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구**다. 관계 해설자 중심 + 친한 친구의 직관적 친근함 + 필요한 만큼의 명리 근거를 조합하고, 도사체·점집체·논문체는 피한다.
- CH2의 **그 사람의 속마음**은 실제 내면을 맞힌다고 주장하는 기능이 아니라 계산된 관계 반응을 1인칭 가상 독백으로 번역하는 편집 장치다. 근거 없는 숨은 심리·고백·감정 사실을 새로 만들지 않는다.`,
    "decision persona hero");
  write(path, source);
}

{
  const path = "docs/NEXT_TASK.md";
  let source = read(path);
  source = replaceRequired(source,
`  - [ ] 후속: 1:N 순번형 설명을 후보 이름/의미형 제목으로 변경.`,
`  - [x] P4-1: 유료 1:1 화자를 '사주 좀 볼 줄 아는, 눈치 빠른 관계 상담 친구'로 고정하고 관계 유형별 미세 톤 적용.
  - [x] P4-1: CH2 상단 '그 사람의 속마음' 히어로 추가. 실제 내면 단정이 아닌 계산 기반 1인칭 가상 독백으로 제한하고 기존 저장 리포트 호환 유지.
  - [ ] P4-2: 궁합 유형/공유 카드 구조를 작은 단위로 구현.
  - [ ] P4-3: 60일주 캐릭터 체계와 리포트 연결 규칙 구현.
  - [ ] 후속: 1:N 순번형 설명을 후보 이름/의미형 제목으로 변경.`,
    "next task P4 items");
  source = source.replace(/## Current HANDOFF[\s\S]*$/, `## Current HANDOFF

\`\`\`text
HANDOFF
- Worker: GPT
- Task: 1:1 리포트 P4-1 — 화자 페르소나 + '그 사람의 속마음' 히어로
- Status: complete
- Validation: test:report:persona + 기존 P1/P2/P3 회귀 + Core validation + lint + production build 확인 후 main 병합
- Commit: P4-1 PR 검증 후 main squash merge SHA 기준
- Remaining: P4-2 궁합 유형/공유 카드 → P4-3 60일주 캐릭터; 1:N 서술 개선은 hotfix 후속 유지
- Risk: 속마음 히어로는 계산 기반 편집 장치이며 실제 내면 단정 금지; 기존 저장 리포트는 optional fallback 유지
\`\`\`
`);
  write(path, source);
}

console.log("P4 persona + inner-mind hero patch applied");
