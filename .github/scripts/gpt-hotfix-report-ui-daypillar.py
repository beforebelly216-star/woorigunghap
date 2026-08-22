from pathlib import Path
import json
import subprocess

BRANCH = "gpt/hotfix-report-ui-daypillar-20260822"


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if new in source:
        return
    if old not in source:
        raise RuntimeError(f"missing replacement target in {path}: {old[:120]!r}")
    write(path, source.replace(old, new, 1))


def append_once(path: str, marker: str, block: str) -> None:
    source = read(path)
    if marker in source:
        return
    write(path, source.rstrip() + "\n\n" + block.strip() + "\n")


# 1) Existing stored-report compatibility sanitizer.
stored_compat = r'''import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import type { PaidReportFacts, PillarFact } from "@/lib/narrative/report-engine-v5";

function pillarLabel(pillar: PillarFact) {
  return pillar.hanja ? `${pillar.korean}(${pillar.hanja})` : pillar.korean;
}

function stripLegacyInternalLanguage(text: string) {
  return text
    .replace(/서버\s*(?:계산상|가\s*제공한|에서\s*제공한)\s*/g, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

export function sanitizeStoredReportTextForPerson(text: string, dayPillar: PillarFact) {
  const label = pillarLabel(dayPillar);
  return stripLegacyInternalLanguage(text)
    .replace(/일주\s*(?:는|가)?\s*미확인(?:입니다|으로\s*표시됩니다|\s*상태입니다)?/g, `일주는 ${label}입니다`)
    .replace(/일주\s*미확인/g, label);
}

function mapStrings(value: unknown, transform: (text: string) => string): unknown {
  if (typeof value === "string") return transform(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, transform));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, mapStrings(child, transform)]),
    );
  }
  return value;
}

export function normalizeStoredPaidReportForDisplay(
  content: EnhancedDetailedReportContent,
  facts: PaidReportFacts,
): EnhancedDetailedReportContent {
  const globallyClean = mapStrings(content, stripLegacyInternalLanguage) as EnhancedDetailedReportContent;
  return {
    ...globallyClean,
    personA: mapStrings(
      globallyClean.personA,
      (text) => sanitizeStoredReportTextForPerson(text, facts.A.pillars.day),
    ) as EnhancedDetailedReportContent["personA"],
    personB: mapStrings(
      globallyClean.personB,
      (text) => sanitizeStoredReportTextForPerson(text, facts.B.pillars.day),
    ) as EnhancedDetailedReportContent["personB"],
  };
}
'''
write("src/lib/narrative/stored-report-compat.ts", stored_compat)

# 2) Apply sanitizer at display time for local cache + account/recovery stored results.
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    'import { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";\n',
    'import { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";\nimport { normalizeStoredPaidReportForDisplay } from "@/lib/narrative/stored-report-compat";\n',
)
replace_once(
    "src/app/one-to-one/result/result-v2.tsx",
    '  const personACharacter = getDayPillarCharacter(facts.A.pillars.day.korean);\n  const personBCharacter = getDayPillarCharacter(facts.B.pillars.day.korean);\n  return <main className="v2-page">',
    '  const personACharacter = getDayPillarCharacter(facts.A.pillars.day.korean);\n  const personBCharacter = getDayPillarCharacter(facts.B.pillars.day.korean);\n  const displayContent = normalizeStoredPaidReportForDisplay(content, facts);\n  return <main className="v2-page">',
)
for old, new in [
    ('{content.overview.headline}', '{displayContent.overview.headline}'),
    ('{content.overview.detailedSummary}', '{displayContent.overview.detailedSummary}'),
    ('<ReportChaptersA content={content}', '<ReportChaptersA content={displayContent}'),
    ('      content={content}\n', '      content={displayContent}\n'),
]:
    replace_once("src/app/one-to-one/result/result-v2.tsx", old, new)

# 3) New generation: reject any recurrence of “일주 미확인”.
replace_once(
    "src/lib/narrative/report-engine-v6-request.ts",
    '  "INTRO_DAY_PILLAR_MISMATCH",\n',
    '  "INTRO_DAY_PILLAR_MISMATCH",\n  "INTRO_DAY_PILLAR_UNKNOWN_EXPOSED",\n',
)
replace_once(
    "src/lib/narrative/report-engine-v6-request.ts",
    '  if (label === "INTRO") issues.push(...collectPaidIntroEvidenceIssues(value, userPrompt));\n',
    '  if (label === "INTRO") {\n    issues.push(...collectPaidIntroEvidenceIssues(value, userPrompt));\n    if (/일주\\s*(?:는|가)?\\s*미확인|일주\\s*미확인/.test(joined)) issues.push("INTRO_DAY_PILLAR_UNKNOWN_EXPOSED");\n  }\n',
)
replace_once(
    "src/lib/narrative/report-engine-v7.ts",
    '- personA.overallProfile / personB.overallProfile: 각각 3~4문장. 일주와 상대적 오행 균형을 설명하되 성격·감정·공감 능력을 사실처럼 확정하지 마세요.\\n',
    '- personA.overallProfile / personB.overallProfile: 각각 3~4문장. 일주와 상대적 오행 균형을 설명하되 성격·감정·공감 능력을 사실처럼 확정하지 마세요. facts.A/B.dayPillar에는 계산된 일주 객체가 항상 있으므로 `일주 미확인`이라고 쓰지 말고 korean/hanja 값을 그대로 확인해 설명하세요.\\n',
)

# 4) P5 deep blocks missing from the legacy override coverage.
deep_override = r'''
/* Hotfix: P5 coverage for deep-report.css blocks that previously leaked legacy beige/green styles. */
.v2-page .deep-partner-grid article,
.v2-page .deep-strategy-signals article,
.v2-page .deep-conversation-grid article,
.v2-page .deep-observable-scenes,
.v2-page .deep-backfire-list,
.v2-page .deep-strategy-steps {
  border-color: var(--saju-border);
  background: var(--saju-bg-card);
  color: var(--saju-ink);
  box-shadow: var(--saju-shadow);
}
.v2-page .deep-observable-scenes article + article,
.v2-page .deep-backfire-list article + article,
.v2-page .deep-strategy-steps article + article,
.v2-page .deep-leverage-top3 article strong,
.v2-page .deep-week-check {
  border-color: var(--saju-border);
}
.v2-page .deep-partner-grid small,
.v2-page .deep-strategy-signals small,
.v2-page .deep-conversation-grid small,
.v2-page .deep-strategy-priority small,
.v2-page .deep-observable-scenes article > span,
.v2-page .deep-backfire-list article > span,
.v2-page .deep-strategy-steps article > span,
.v2-page .deep-strategy-steps article small,
.v2-page .deep-week-check {
  color: var(--saju-primary-deep);
  font-family: var(--saju-font-sans);
}
.v2-page .deep-partner-grid h3,
.v2-page .deep-strategy-signals h3,
.v2-page .deep-conversation-grid h3,
.v2-page .deep-observable-scenes h4,
.v2-page .deep-backfire-list h4,
.v2-page .deep-strategy-steps h3,
.v2-page .deep-leverage-top3 article h3,
.v2-page .deep-strategy-priority strong {
  color: var(--saju-ink);
  font-family: var(--saju-font-sans);
}
.v2-page .deep-observable-scenes p,
.v2-page .deep-backfire-list p,
.v2-page .deep-strategy-steps p,
.v2-page .deep-conversation-grid p,
.v2-page .deep-partner-grid p,
.v2-page .deep-strategy-signals li {
  color: var(--saju-ink-soft);
}
.v2-page .deep-observable-scenes p strong,
.v2-page .deep-conversation-grid p strong,
.v2-page .deep-leverage-top3 article strong {
  color: var(--saju-ink);
}
.v2-page .deep-strategy-priority {
  border-left-color: var(--saju-accent);
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--saju-accent) 16%, var(--saju-bg-card)),
    color-mix(in srgb, var(--saju-primary) 12%, var(--saju-bg-card)));
}
.v2-page .deep-strategy-steps article:nth-child(2n) {
  background: color-mix(in srgb, var(--saju-primary) 8%, var(--saju-bg-card));
}
.v2-page .deep-strategy-signals article:first-child {
  background: color-mix(in srgb, var(--saju-mint) 12%, var(--saju-bg-card));
}
.v2-page .deep-strategy-signals article:last-child {
  background: color-mix(in srgb, var(--saju-blush) 12%, var(--saju-bg-card));
}
'''
append_once("src/app/report-p5-overrides.css", "/* Hotfix: P5 coverage for deep-report.css", deep_override)

# 5) P5 home: same product, cohesive visual system.
home_page = r'''import Link from "next/link";
import "./report-theme.css";
import styles from "./home-p5.module.css";

function SajuBoyMark() {
  return <div className={styles.mascot} aria-hidden="true">
    <svg viewBox="0 0 92 92">
      <circle cx="46" cy="46" r="40" className={styles.face} />
      <path d="M24 38c5-17 39-20 46 0-11-4-15-10-23-9-8 0-14 6-23 9Z" className={styles.hair} />
      <circle cx="35" cy="48" r="10" className={styles.glass} />
      <circle cx="57" cy="48" r="10" className={styles.glass} />
      <path d="M45 48h2M39 64c5 4 10 4 15 0" className={styles.line} />
      <path d="M22 80c7-11 41-11 48 0" className={styles.robe} />
    </svg>
  </div>;
}

export default function Home() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>사주소년이 찾는 우리 사이의 단서</p>
        <h1>사주는 어렵게 말고,<br /><span>우리 관계 이야기로.</span></h1>
        <p className={styles.lead}>두 사람의 생년월일시와 관계 유형을 계산해 연락, 갈등, 신뢰, 생활 리듬과 장기관계까지 실제로 읽히는 궁합 리포트로 풀어드려요.</p>
        <div className={styles.heroActions}>
          <Link href="/one-to-one" className={styles.primaryAction}>1:1 궁합 보기 · 1,000원</Link>
          <Link href="/one-to-many" className={styles.secondaryAction}>여러 명 비교하기</Link>
        </div>
      </div>
      <aside className={styles.boyCard}>
        <SajuBoyMark />
        <div><small>사주소년 용한</small><strong>“점수만 보고 끝내면 아쉽잖아요.”</strong><p>둘이 잘 통하는 장면과 자꾸 꼬이는 장면을 찾아서, 실제 관계에서 써먹을 단서까지 정리해 드릴게요.</p></div>
      </aside>
    </section>

    <section className={styles.productSection} aria-labelledby="home-products-title">
      <div className={styles.sectionHeading}><small>CHOOSE YOUR REPORT</small><h2 id="home-products-title">지금 궁금한 관계부터 골라보세요.</h2></div>
      <div className={styles.productGrid}>
        <article className={`${styles.productCard} ${styles.featured}`}>
          <div className={styles.cardTop}><span>가장 먼저 추천</span><b>1:1</b></div>
          <h3>한 사람과의 관계를 깊게</h3>
          <p>짝사랑 · 썸 · 연인 · 친구 · 직장동료. 두 사람의 사주팔자, 9개 궁합 지표, 속마음 번역, 갈등·회복과 실전 관계 매뉴얼까지 확인합니다.</p>
          <ul><li>CH0~CH9 상세 리포트</li><li>60일주 캐릭터 + 9축 궁합</li><li>완성 결과 저장·재열람</li></ul>
          <div className={styles.price}><strong>1,000원</strong><span>1회 결제</span></div>
          <Link href="/one-to-one" className={styles.cardAction}>두 사람 정보 입력하기</Link>
        </article>
        <article className={styles.productCard}>
          <div className={styles.cardTop}><span>비교가 필요할 때</span><b>1:N</b></div>
          <h3>여러 관계를 한눈에 비교</h3>
          <p>기준자 1명과 후보 2~5명을 같은 계산 기준으로 비교해 연락·대화, 신뢰, 갈등 회복, 생활·장기관계를 순위와 함께 봅니다.</p>
          <ul><li>후보별 강점·조율 포인트</li><li>관계 기준 직접 비교</li><li>2~5명 후보 지원</li></ul>
          <div className={styles.price}><strong>3,000원</strong><span>1회 결제</span></div>
          <Link href="/one-to-many" className={styles.cardAction}>비교 정보 입력하기</Link>
        </article>
      </div>
    </section>

    <section className={styles.trustStrip} aria-label="우리사주 리포트 원칙">
      <div><strong>계산은 서버가</strong><span>사주와 궁합 점수는 결정론적으로 계산합니다.</span></div>
      <div><strong>AI는 서술만</strong><span>계산값을 바꾸지 않고 읽기 쉬운 관계 이야기로 풀어냅니다.</span></div>
      <div><strong>결제 후 생성</strong><span>결제가 확인된 뒤에만 유료 상세 리포트를 생성합니다.</span></div>
    </section>
    <p className={styles.notice}>전통 명리 해석을 바탕으로 관계의 패턴을 살펴보는 콘텐츠이며, 실제 관계 판단은 두 사람의 대화와 행동을 함께 확인해 주세요.</p>
  </main>;
}
'''
write("src/app/page.tsx", home_page)

home_css = r'''.page {
  min-height: 100vh;
  padding: clamp(48px, 8vw, 88px) 20px 72px;
  background:
    radial-gradient(circle at 12% 4%, color-mix(in srgb, var(--saju-blush) 30%, transparent), transparent 30rem),
    radial-gradient(circle at 92% 10%, color-mix(in srgb, var(--saju-primary) 28%, transparent), transparent 32rem),
    var(--saju-bg-base);
  color: var(--saju-ink);
  font-family: var(--saju-font-sans);
}
.hero { width: min(100%, 1120px); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr); gap: clamp(24px, 5vw, 64px); align-items: center; }
.heroCopy { min-width: 0; }
.eyebrow, .sectionHeading small { margin: 0; color: var(--saju-primary-deep); font-size: .78rem; font-weight: 900; letter-spacing: .12em; }
.hero h1 { margin: 14px 0 20px; font-size: clamp(3rem, 7vw, 5.9rem); line-height: .98; letter-spacing: -.065em; font-weight: 900; }
.hero h1 span { color: var(--saju-primary-deep); }
.lead { max-width: 680px; margin: 0; color: var(--saju-ink-soft); font-size: clamp(1rem, 2vw, 1.15rem); line-height: 1.75; }
.heroActions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
.primaryAction, .secondaryAction, .cardAction { min-height: 50px; display: inline-flex; align-items: center; justify-content: center; border-radius: 16px; padding: 13px 18px; text-decoration: none; font-weight: 900; }
.primaryAction { background: var(--saju-accent); color: #3A3550; box-shadow: 0 14px 32px color-mix(in srgb, var(--saju-accent) 25%, transparent); }
.secondaryAction { border: 1px solid var(--saju-border); background: var(--saju-bg-card); color: var(--saju-ink); }
.boyCard { border: 1px solid var(--saju-border); border-radius: 30px 30px 30px 9px; padding: 26px; background: linear-gradient(145deg, color-mix(in srgb, var(--saju-primary) 22%, var(--saju-bg-card)), color-mix(in srgb, var(--saju-blush) 12%, var(--saju-bg-card))); box-shadow: var(--saju-shadow); }
.mascot { width: 92px; height: 92px; margin-bottom: 18px; border-radius: 28px; background: color-mix(in srgb, var(--saju-blush) 22%, var(--saju-bg-card)); overflow: hidden; }
.mascot svg { width: 100%; height: 100%; }.face { fill: #F6D5B9; }.hair { fill: #3A3550; }.glass { fill: none; stroke: #3A3550; stroke-width: 2.5; }.line { fill: none; stroke: #3A3550; stroke-width: 2.5; stroke-linecap: round; }.robe { fill: var(--saju-primary-deep); }
.boyCard small, .boyCard strong { display: block; }.boyCard small { color: var(--saju-primary-deep); font-size: .74rem; font-weight: 900; }.boyCard strong { margin-top: 8px; font-size: 1.35rem; line-height: 1.4; }.boyCard p { margin: 10px 0 0; color: var(--saju-ink-soft); line-height: 1.7; }
.productSection { width: min(100%, 1120px); margin: 76px auto 0; }.sectionHeading { max-width: 720px; }.sectionHeading h2 { margin: 8px 0 22px; font-size: clamp(2rem, 5vw, 3.1rem); line-height: 1.15; letter-spacing: -.04em; }
.productGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }.productCard { min-width: 0; border: 1px solid var(--saju-border); border-radius: 28px; padding: clamp(22px, 4vw, 32px); background: var(--saju-bg-card); box-shadow: var(--saju-shadow); display: flex; flex-direction: column; }.featured { background: linear-gradient(145deg, color-mix(in srgb, var(--saju-primary) 18%, var(--saju-bg-card)), var(--saju-bg-card)); border-color: color-mix(in srgb, var(--saju-primary-deep) 48%, var(--saju-border)); }
.cardTop { display: flex; justify-content: space-between; gap: 12px; align-items: center; }.cardTop span { color: var(--saju-primary-deep); font-size: .78rem; font-weight: 900; }.cardTop b { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; background: var(--saju-primary); color: #3A3550; }
.productCard h3 { margin: 20px 0 10px; font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.3; }.productCard > p { margin: 0; color: var(--saju-ink-soft); line-height: 1.7; }.productCard ul { margin: 20px 0 26px; padding-left: 20px; color: var(--saju-ink-soft); line-height: 1.8; }.productCard li::marker { color: var(--saju-mint); }.price { margin-top: auto; display: flex; align-items: baseline; gap: 8px; }.price strong { font-size: 1.75rem; }.price span { color: var(--saju-ink-soft); font-size: .82rem; }.cardAction { margin-top: 16px; background: var(--saju-primary-deep); color: #fff; }
.trustStrip { width: min(100%, 1120px); margin: 24px auto 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.trustStrip div { border: 1px solid var(--saju-border); border-radius: 18px; padding: 16px; background: color-mix(in srgb, var(--saju-mint) 8%, var(--saju-bg-card)); }.trustStrip strong, .trustStrip span { display: block; }.trustStrip strong { font-size: .9rem; }.trustStrip span { margin-top: 5px; color: var(--saju-ink-soft); font-size: .8rem; line-height: 1.5; }.notice { width: min(100%, 760px); margin: 26px auto 0; color: var(--saju-ink-soft); font-size: .78rem; line-height: 1.6; text-align: center; }
@media (max-width: 760px) { .page { padding: 42px 14px 60px; }.hero { grid-template-columns: 1fr; }.hero h1 { font-size: clamp(2.75rem, 13vw, 4.2rem); }.boyCard { padding: 20px; }.productGrid, .trustStrip { grid-template-columns: 1fr; }.productSection { margin-top: 52px; }.heroActions { display: grid; grid-template-columns: 1fr; }.primaryAction, .secondaryAction { width: 100%; } }
'''
write("src/app/home-p5.module.css", home_css)

# 6) Regression tests: old stored phrase, critical gate, P5 deep coverage + home.
intro_test_path = "scripts/paid-intro-day-pillar-test.ts"
intro_test = read(intro_test_path)
intro_test = intro_test.replace(
    'import { formatPaidIntroDayPillar, groundPaidIntroWithServerEvidence } from "../src/lib/narrative/report-engine-v6-request";',
    'import { collectPaidNarrativeQualityIssues, formatPaidIntroDayPillar, groundPaidIntroWithServerEvidence } from "../src/lib/narrative/report-engine-v6-request";\nimport { sanitizeStoredReportTextForPerson } from "../src/lib/narrative/stored-report-compat";'
)
if "storedLegacyText" not in intro_test:
    intro_test += r'''

const storedLegacyText = "존종윤님의 일주는 서버 계산상 일주 미확인입니다. 일간은 기(土)로 읽습니다.";
const repairedStoredText = sanitizeStoredReportTextForPerson(storedLegacyText, gihe);
assert.doesNotMatch(repairedStoredText, /서버 계산상|일주 미확인/);
assert.match(repairedStoredText, /기해\(己亥\)/, "stored pre-P1 reports must display the computed day pillar without AI regeneration");

const invalidIntro = {
  ...aiIntro,
  personA: { ...aiIntro.personA, overallProfile: "{{SELF}}님의 일주는 일주 미확인입니다. 관계 장면을 설명합니다." },
};
const payload = JSON.stringify({
  facts: {
    A: { dayPillar: gihe },
    B: { dayPillar: gapja },
  },
  evidence: {
    persons: {
      A: { elementBalance: { dominantElements: ["earth"], lighterElements: ["water"] } },
      B: { elementBalance: { dominantElements: ["wood"], lighterElements: ["metal"] } },
    },
  },
});
const issues = collectPaidNarrativeQualityIssues(invalidIntro, "INTRO", `payload ${payload}`);
assert.ok(issues.includes("INTRO_DAY_PILLAR_UNKNOWN_EXPOSED"), "new INTRO output must reject any day-pillar unknown wording");
'''
write(intro_test_path, intro_test)

p5_test_path = "scripts/report-p5-ui-contract-test.ts"
p5_test = read(p5_test_path)
if 'const home =' not in p5_test:
    p5_test = p5_test.replace(
        'const shareCss = readFileSync("src/app/one-to-one/result/compatibility-share-card.module.css", "utf8");',
        'const shareCss = readFileSync("src/app/one-to-one/result/compatibility-share-card.module.css", "utf8");\nconst home = readFileSync("src/app/page.tsx", "utf8");\nconst homeCss = readFileSync("src/app/home-p5.module.css", "utf8");'
    )
    p5_test = p5_test.replace(
        'assert.match(overrides, /day19-chapter \\.v2-chapter-heading > span/);',
        'assert.match(overrides, /day19-chapter \\.v2-chapter-heading > span/);\nassert.match(overrides, /deep-strategy-steps/);\nassert.match(overrides, /deep-strategy-signals/);\nassert.match(overrides, /deep-observable-scenes/);\nassert.match(home, /home-p5\\.module\\.css/);\nassert.match(home, /report-theme\\.css/);\nassert.match(home, /사주소년 용한/);\nassert.match(homeCss, /var\\(--saju-primary-deep\\)/);'
    )
write(p5_test_path, p5_test)

# 7) Docs.
project_path = "docs/PROJECT_STATE.md"
project = read(project_path)
if "## 2026-08-22 기존 저장본 일주 표시 + P5 누락 UI hotfix" not in project:
    project += r'''

## 2026-08-22 기존 저장본 일주 표시 + P5 누락 UI hotfix

- 사용자 실사용 스크린샷에서 P1 이전 저장 리포트의 `서버 계산상 일주 미확인` 문장이 재열람 시 계속 노출되는 문제를 확인했다. 신규 생성 경로는 이미 해당 내부 표현을 critical로 차단했지만, 기존 구매 결과는 재생성하지 않는 정책 때문에 과거 문장이 그대로 남아 있던 것이 원인이었다.
- 기존 구매 결과는 AI 재호출/재결제 없이 `facts.A/B.pillars.day`의 확정 일주로 표시 시점에만 결정론적으로 교정한다. 저장 원문/점수/계산 snapshot은 덮어쓰지 않는다.
- 신규 INTRO에는 `INTRO_DAY_PILLAR_UNKNOWN_EXPOSED` critical gate를 추가해 `일주 미확인` 문구 자체를 저장 전에 차단한다.
- `deep-report.css`의 STEP/PROGRESS/STOP, 관찰 장면, 대화 카드 등 P5에서 빠졌던 레거시 블록을 파스텔 토큰 기반으로 전면 override해 라이트/다크 모두에서 혼합 스타일과 저대비 텍스트가 나오지 않게 했다.
- 홈 화면을 P5 파스텔/사주소년 디자인 시스템으로 전환했다. 1:1·1:N 상품 범위와 가격은 변경하지 않았다.
'''
write(project_path, project)

next_path = "docs/NEXT_TASK.md"
next_text = read(next_path)
if "기존 저장본 `일주 미확인` 표시 교정" not in next_text:
    insert = '- [ ] 사용자 QA 리포트 서술/표시 신뢰도 개선\n'
    replacement = insert + '  - [x] hotfix: 기존 저장본 `일주 미확인` 표시 교정 + 신규 INTRO 재발 차단. 기존 결과는 AI 재생성 없이 확정 facts로 표시만 보정.\n  - [x] hotfix: P5 미적용 deep-report 블록(STEP/PROGRESS/STOP 등)과 홈 화면을 파스텔 마스코트 디자인으로 통일.\n'
    if insert not in next_text:
        raise RuntimeError("NEXT_TASK insertion point missing")
    next_text = next_text.replace(insert, replacement, 1)
start = next_text.index("## Current HANDOFF")
next_text = next_text[:start] + r'''## Current HANDOFF

```text
HANDOFF
- Worker: GPT
- Task: 기존 저장본 일주 표시 오류 + P5 누락 UI + 홈 화면 hotfix
- Status: complete
- Validation: test:intro:day-pillar + test:report:p5-ui + Core validation + lint + production build
- Commit: PR 검증 후 main squash merge SHA 기준
- Remaining: 사용자 1:1 실결제/새 생성 결과 확인; 360/390/430 실제 뷰포트 육안 QA; 외부 SOLAPI/Kakao 발송 설정
- Risk: 저장된 AI 원문/계산/점수는 수정하지 않고 화면 표시만 확정 facts로 정정; none otherwise
```
'''
write(next_path, next_text)

print("hotfix patch applied")
