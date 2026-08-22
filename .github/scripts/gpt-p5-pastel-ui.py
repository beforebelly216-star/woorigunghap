from pathlib import Path
import json
import re
import subprocess

BRANCH = "gpt/p5-pastel-ui-20260822"


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
        raise RuntimeError(f"Missing replacement target in {path}: {old[:100]!r}")
    write(path, source.replace(old, new, 1))


def append_once(path: str, marker: str, block: str) -> None:
    source = read(path)
    if marker in source:
        return
    write(path, source.rstrip() + "\n\n" + block.strip() + "\n")


def commit(message: str, paths: list[str]) -> None:
    subprocess.run(["git", "add", *paths], check=True)
    changed = subprocess.run(["git", "diff", "--cached", "--quiet"]).returncode != 0
    if not changed:
        print(f"No changes for stage: {message}")
        return
    subprocess.run(["git", "commit", "-m", message], check=True)
    subprocess.run(["git", "push", "origin", f"HEAD:{BRANCH}"], check=True)


# ---------------------------------------------------------------------------
# Stage 1 — design tokens + tokenized base/detail CSS
# ---------------------------------------------------------------------------
report_theme = r'''/* P5: "용한이의 사주방" report design system. */
:root {
  --saju-bg-base: #FFFBF5;
  --saju-bg-card: #FFFFFF;
  --saju-bg-soft: #F7F2FB;
  --saju-ink: #3A3550;
  --saju-ink-soft: #7B7396;
  --saju-primary: #B8A9E8;
  --saju-primary-deep: #8B7BC7;
  --saju-accent: #FFB088;
  --saju-mint: #8FD9C4;
  --saju-blush: #FFC4D6;
  --saju-border: #E9E2F0;
  --saju-track: #EEEAF3;
  --saju-shadow: 0 18px 50px rgba(84, 70, 122, .10);
  --saju-element-wood: #A8D8B9;
  --saju-element-fire: #FF9E9E;
  --saju-element-earth: #F5D6A0;
  --saju-element-metal: #D9D5E8;
  --saju-element-water: #A5C9E8;
  --saju-unknown: #E8E5EC;
  --saju-font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --saju-font-serif: "Nanum Myeongjo", "Noto Serif KR", Georgia, serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --saju-bg-base: #1F1B2E;
    --saju-bg-card: #2A2540;
    --saju-bg-soft: #332D4A;
    --saju-ink: #EDE9F7;
    --saju-ink-soft: #B9B1D0;
    --saju-primary: #BFB2E8;
    --saju-primary-deep: #A898DC;
    --saju-accent: #F3A47D;
    --saju-mint: #96D8C6;
    --saju-blush: #EFB6C8;
    --saju-border: #4A4264;
    --saju-track: #3D3654;
    --saju-shadow: 0 18px 50px rgba(0, 0, 0, .22);
    --saju-element-wood: #86C5A0;
    --saju-element-fire: #F08F8F;
    --saju-element-earth: #E7C48E;
    --saju-element-metal: #C9C3DA;
    --saju-element-water: #91BDE0;
    --saju-unknown: #464056;
  }
}
'''
write("src/app/report-theme.css", report_theme)

base_css = r'''/* P5: mobile-first long-form report foundation. */
.v2-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--saju-blush) 24%, transparent), transparent 28rem),
    radial-gradient(circle at 95% 10%, color-mix(in srgb, var(--saju-primary) 23%, transparent), transparent 30rem),
    var(--saju-bg-base);
  color: var(--saju-ink);
  padding: 28px 14px 64px;
}
.v2-shell { width: min(100%, 980px); margin: 0 auto; }
.v2-state {
  max-width: 680px;
  margin: 12vh auto;
  padding: 30px 22px;
  border: 1px solid var(--saju-border);
  border-radius: 26px;
  background: var(--saju-bg-card);
  box-shadow: var(--saju-shadow);
  text-align: center;
}
.v2-state h1 { margin: 8px 0 12px; color: var(--saju-ink); font-size: 2rem; line-height: 1.25; }
.v2-state p { color: var(--saju-ink-soft); line-height: 1.7; }
.v2-state button, .v2-state a {
  display: inline-block;
  margin-top: 18px;
  padding: 13px 18px;
  border: 0;
  border-radius: 14px;
  background: var(--saju-primary-deep);
  color: #fff;
  text-decoration: none;
  font-weight: 800;
}
.v2-kicker {
  color: var(--saju-primary-deep);
  font-size: .78rem;
  font-weight: 900;
  letter-spacing: .15em;
}
.v2-hero { text-align: center; padding: 20px 0 42px; }
.v2-hero h1 {
  margin: 14px 0;
  color: var(--saju-ink);
  font-size: clamp(2.55rem, 12vw, 5.3rem);
  font-weight: 800;
  line-height: 1.03;
  letter-spacing: -.05em;
}
.v2-hero h1 span { color: var(--saju-primary-deep); font-size: .6em; }
.v2-hero h2 { max-width: 760px; margin: 24px auto 14px; color: var(--saju-ink); font-size: 1.25rem; line-height: 1.45; }
.v2-long-text { margin: 0; color: var(--saju-ink-soft); font-size: 1rem; line-height: 1.75; white-space: pre-line; }
.v2-hero .v2-long-text { max-width: 800px; margin: 0 auto; }
.v2-score {
  width: min(360px, 90%);
  margin: 26px auto 16px;
  padding: 22px;
  border: 1px solid color-mix(in srgb, var(--saju-primary) 55%, var(--saju-border));
  border-radius: 26px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--saju-primary) 35%, var(--saju-bg-card)), var(--saju-bg-card));
  color: var(--saju-ink);
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 10px;
  box-shadow: var(--saju-shadow);
}
.v2-score span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: var(--saju-accent); color: #3A3550; font-weight: 900; }
.v2-score strong { font-size: 5rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.v2-score small { color: var(--saju-ink-soft); font-weight: 800; }
.v2-uncertainty {
  max-width: 720px;
  margin: 18px auto 0;
  padding: 14px 18px;
  border: 1px solid color-mix(in srgb, var(--saju-element-earth) 70%, var(--saju-border));
  border-radius: 16px;
  background: color-mix(in srgb, var(--saju-element-earth) 22%, var(--saju-bg-card));
  color: var(--saju-ink-soft);
  font-size: .9rem;
  line-height: 1.6;
}
.v2-section-title small, .v2-chapter-heading small { color: var(--saju-primary-deep); font-size: .72rem; font-weight: 900; letter-spacing: .13em; }
.v2-section-title h2, .v2-chapter h2 { margin: 8px 0 12px; color: var(--saju-ink); font-size: clamp(1.85rem, 8vw, 3rem); font-weight: 800; line-height: 1.18; letter-spacing: -.035em; }
.v2-section-title p { color: var(--saju-ink-soft); line-height: 1.7; }
.v2-basic-facts, .v2-score-section { padding: 38px 0; }
.v2-facts-grid { display: grid; grid-template-columns: 1fr; gap: 18px; margin-top: 24px; }
.v2-facts-grid > article { min-width: 0; border: 1px solid var(--saju-border); border-radius: 26px; background: var(--saju-bg-card); padding: 20px; box-shadow: var(--saju-shadow); }
.v2-person-title { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 18px; }
.v2-person-title span { color: var(--saju-ink-soft); font-size: .82rem; }
.v2-person-title strong { color: var(--saju-ink); font-size: 1.35rem; }
.v2-pillar-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.v2-pillar { min-width: 0; padding: 14px 8px; border-radius: 16px; background: var(--saju-bg-soft); text-align: center; }
.v2-pillar span { display: block; color: var(--saju-ink-soft); font-size: .72rem; }
.v2-pillar strong { display: block; margin: 4px 0; color: var(--saju-ink); font-size: 1.3rem; }
.v2-pillar small { color: var(--saju-ink-soft); font-size: .72rem; }
.v2-element-counts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-top: 18px; }
.v2-element-counts > div { min-width: 0; border: 1px solid var(--saju-border); border-radius: 12px; padding: 10px 2px; background: var(--saju-bg-card); text-align: center; }
.v2-element-counts span { display: block; color: var(--saju-ink-soft); font-size: .62rem; }
.v2-element-counts strong { color: var(--saju-ink); font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.v2-element-counts small { color: var(--saju-ink-soft); font-size: .68rem; }
.v2-share-list { display: grid; gap: 8px; margin-top: 16px; }
.v2-share-list > div { display: grid; grid-template-columns: 70px minmax(0, 1fr) 48px; gap: 8px; align-items: center; color: var(--saju-ink-soft); font-size: .8rem; }
.v2-share-list > div > div { height: 8px; border-radius: 999px; background: var(--saju-track); overflow: hidden; }
.v2-share-list i { display: block; height: 100%; background: var(--saju-mint); }
.v2-share-list strong { color: var(--saju-ink); text-align: right; font-variant-numeric: tabular-nums; }
.v2-note { margin: 14px 0 0; color: var(--saju-ink-soft); font-size: .78rem; line-height: 1.6; }
.v2-score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 22px; }
.v2-score-grid > div { min-width: 0; border: 1px solid var(--saju-border); border-radius: 18px; padding: 16px; background: var(--saju-bg-card); }
.v2-score-grid span { display: block; color: var(--saju-ink-soft); font-size: .78rem; }
.v2-score-grid strong { color: var(--saju-ink); font-size: 1.8rem; font-variant-numeric: tabular-nums; }
.v2-score-grid i { display: block; height: 6px; border-radius: 999px; background: var(--saju-track); overflow: hidden; }
.v2-score-grid b { display: block; height: 100%; background: var(--saju-primary-deep); }

@media (min-width: 761px) {
  .v2-page { padding: 48px 20px 72px; }
  .v2-hero { padding-bottom: 56px; }
  .v2-facts-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .v2-score-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .v2-facts-grid > article { padding: 24px; }
}
'''
write("src/app/report-v2-base.css", base_css)

detail_css = r'''/* P5: tokenized chapter surfaces. */
.v2-chapter { padding: 46px 0; border-top: 1px solid var(--saju-border); }
.v2-chapter-heading { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 24px; }
.v2-chapter-heading > span { color: var(--saju-primary-deep); font-size: 1rem; font-weight: 900; }
.v2-chapter h3 { margin: 28px 0 10px; color: var(--saju-ink); font-size: 1.12rem; line-height: 1.4; }
.v2-two-column, .v2-detail-grid, .v2-direction, .v2-scenarios { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 20px; }
.v2-two-column > div, .v2-detail-grid > div, .v2-direction > article { border: 1px solid var(--saju-border); border-radius: 20px; padding: 20px; background: var(--saju-bg-card); }
.v2-detail-grid p, .v2-direction p { color: var(--saju-ink-soft); line-height: 1.75; }
.v2-direction span { color: var(--saju-primary-deep); font-weight: 900; }
.v2-bullets { margin: 10px 0 0; padding-left: 20px; }
.v2-bullets li { margin: 10px 0; color: var(--saju-ink-soft); line-height: 1.75; }
.v2-scenarios article { border: 1px solid var(--saju-border); border-radius: 20px; padding: 20px; background: color-mix(in srgb, var(--saju-primary) 12%, var(--saju-bg-card)); }
.v2-scenarios article > span { color: var(--saju-primary-deep); font-size: .72rem; font-weight: 900; letter-spacing: .12em; }
.v2-scenarios h4 { margin: 8px 0 14px; color: var(--saju-ink); font-size: 1.05rem; }
.v2-scenarios p { color: var(--saju-ink-soft); line-height: 1.7; }
.v2-scenarios p strong { display: block; margin-bottom: 3px; color: var(--saju-ink); }
.v2-numbered { margin-top: 18px; border: 1px solid var(--saju-border); border-radius: 22px; background: var(--saju-bg-card); overflow: hidden; }
.v2-numbered > div { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 14px; padding: 18px; }
.v2-numbered > div + div { border-top: 1px solid var(--saju-border); }
.v2-numbered > div > span { color: var(--saju-primary-deep); font-size: 1rem; font-weight: 900; }
.v2-numbered h3 { margin: 0 0 8px; }
.v2-numbered p { margin: 0; color: var(--saju-ink-soft); line-height: 1.75; }
.v2-warning { margin-top: 22px; border: 1px solid color-mix(in srgb, var(--saju-element-earth) 65%, var(--saju-border)); border-radius: 20px; padding: 20px; background: color-mix(in srgb, var(--saju-element-earth) 18%, var(--saju-bg-card)); }
.v2-warning strong { display: block; margin-top: 12px; color: var(--saju-ink); }
.v2-warning p { color: var(--saju-ink-soft); line-height: 1.75; }
.v2-protocol { display: grid; gap: 10px; }
.v2-protocol > div { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 12px; align-items: start; border: 1px solid var(--saju-border); border-radius: 16px; padding: 14px 16px; background: var(--saju-bg-card); }
.v2-protocol span { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: var(--saju-primary-deep); color: #fff; font-weight: 800; }
.v2-protocol p { margin: 3px 0 0; color: var(--saju-ink-soft); line-height: 1.65; }
.v2-debug { margin-top: 40px; padding: 18px; border-radius: 14px; background: #17151E; color: #EDE9F7; overflow: auto; }
.v2-debug pre { font-size: .72rem; white-space: pre-wrap; }
.v2-footer { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 34px 0; }
.v2-footer a { border: 1px solid var(--saju-border); border-radius: 14px; padding: 12px 16px; background: var(--saju-bg-card); color: var(--saju-ink); text-decoration: none; font-weight: 800; }
.v2-footer a:last-child { border-color: var(--saju-primary-deep); background: var(--saju-primary-deep); color: #fff; }

@media (min-width: 761px) {
  .v2-chapter { padding: 58px 0; }
  .v2-two-column, .v2-detail-grid, .v2-direction, .v2-scenarios { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
'''
write("src/app/report-v2-detail.css", detail_css)

replace_once(
    "src/app/one-to-one/result/page.tsx",
    'import { Suspense } from "react";\nimport "../../report-v2-base.css";',
    'import { Suspense } from "react";\nimport "../../report-theme.css";\nimport "../../report-v2-base.css";',
)
commit("style: add P5 pastel report design tokens", [
    "src/app/report-theme.css", "src/app/report-v2-base.css", "src/app/report-v2-detail.css", "src/app/one-to-one/result/page.tsx"
])

# ---------------------------------------------------------------------------
# Stage 2 — typography hierarchy
# ---------------------------------------------------------------------------
typography = r'''
/* P5 typography: readable long-form rhythm without shipping font binaries. */
.v2-page { font-family: var(--saju-font-sans); font-size: 16px; }
.v2-page h1, .v2-page h2, .v2-page h3, .v2-page h4, .v2-page strong { text-wrap: pretty; }
.v2-hero h1 { font-size: clamp(2rem, 9vw, 3.6rem); }
.v2-section-title h2, .v2-chapter h2 { font-size: clamp(2rem, 7vw, 2.65rem); }
.v2-hero h2, .v2-chapter h3 { font-size: 1.25rem; }
.v2-long-text, .v2-detail-grid p, .v2-direction p, .v2-scenarios p, .v2-numbered p, .v2-bullets li { font-size: 1rem; line-height: 1.75; }
.v2-kicker, .v2-section-title small, .v2-chapter-heading small, .v2-note { font-size: .8125rem; }
.v2-score strong, .v2-score-grid strong, .v2-element-counts strong, .v2-share-list strong { font-variant-numeric: tabular-nums; }
.v2-hanja { font-family: var(--saju-font-serif); font-weight: 700; }
@media (min-width: 761px) {
  .v2-hero h1 { font-size: clamp(3rem, 6vw, 5.2rem); }
}
'''
append_once("src/app/report-v2-base.css", "/* P5 typography:", typography)
commit("style: add P5 report typography hierarchy", ["src/app/report-v2-base.css"])

# ---------------------------------------------------------------------------
# Stage 3 — eight saju tiles + 9-axis radar + archetype-first hero
# ---------------------------------------------------------------------------
components_path = "src/app/one-to-one/result/report-v2-components.tsx"
components = read(components_path)
components = components.replace(
    'import type { BasicPersonFacts } from "@/lib/narrative/report-engine-v5";',
    'import type { BasicPersonFacts } from "@/lib/narrative/report-engine-v5";\nimport { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";'
)
old_pillar = '''export function PillarGrid({ facts }: { facts: BasicPersonFacts }) {
  const entries = [
    ["년주", facts.pillars.year], ["월주", facts.pillars.month], ["일주", facts.pillars.day], ["시주", facts.pillars.hour],
  ] as const;
  return <div className="v2-pillar-grid">{entries.map(([label, pillar]) => (
    <div className="v2-pillar" key={label}>
      <span>{label}</span>
      {pillar ? <><strong>{pillar.korean}</strong><small>{pillar.hanja}</small></> : <><strong>미상</strong><small>출생시간 미입력</small></>}
    </div>
  ))}</div>;
}
'''
new_pillar = '''const STEM_ELEMENT: Record<string, FiveElement> = {
  갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth", 기: "earth", 경: "metal", 신: "metal", 임: "water", 계: "water",
};
const BRANCH_ELEMENT: Record<string, FiveElement> = {
  인: "wood", 묘: "wood", 사: "fire", 오: "fire", 진: "earth", 술: "earth", 축: "earth", 미: "earth", 신: "metal", 유: "metal", 해: "water", 자: "water",
};

function SajuCharacterTile({ label, korean, hanja, element, emphasis = false }: {
  label: string;
  korean: string;
  hanja: string;
  element?: FiveElement;
  emphasis?: boolean;
}) {
  return <div className={`v2-saju-char ${element ? `is-${element}` : "is-unknown"} ${emphasis ? "is-day" : ""}`}>
    <small>{label}</small>
    <strong>{korean}</strong>
    <span className="v2-hanja">{hanja}</span>
  </div>;
}

export function PillarGrid({ facts }: { facts: BasicPersonFacts }) {
  const entries = [
    ["년", facts.pillars.year], ["월", facts.pillars.month], ["일", facts.pillars.day], ["시", facts.pillars.hour],
  ] as const;
  const character = getDayPillarCharacter(facts.pillars.day.korean);

  return <div className="v2-saju-board">
    <div className="v2-pillar-grid">{entries.map(([label, pillar]) => {
      const hanjaChars = pillar ? [...pillar.hanja] : [];
      const emphasis = label === "일";
      return <div className={`v2-pillar-pair ${emphasis ? "is-day-pair" : ""}`} key={label}>
        <span className="v2-pillar-pair-label">{label}주</span>
        {pillar ? <>
          <SajuCharacterTile label="천간" korean={pillar.stem} hanja={hanjaChars[0] ?? ""} element={STEM_ELEMENT[pillar.stem]} emphasis={emphasis} />
          <SajuCharacterTile label="지지" korean={pillar.branch} hanja={hanjaChars[1] ?? ""} element={BRANCH_ELEMENT[pillar.branch]} emphasis={emphasis} />
        </> : <>
          <SajuCharacterTile label="천간" korean="?" hanja="미상" />
          <SajuCharacterTile label="지지" korean="?" hanja="미상" />
        </>}
      </div>;
    })}</div>
    {character ? <div className="v2-day-character-note"><span>✦ 오늘의 핵심 타일 · {facts.pillars.day.korean}</span><strong>{character.title}</strong><p>{character.tagline}</p></div> : null}
  </div>;
}

export function CompatibilityRadar({ dimensions }: { dimensions: Array<{ label: string; score: number }> }) {
  const size = 280;
  const center = size / 2;
  const radius = 96;
  const count = Math.max(3, dimensions.length);
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    return [center + Math.cos(angle) * radius * ratio, center + Math.sin(angle) * radius * ratio] as const;
  };
  const polygon = (ratio: number) => Array.from({ length: count }, (_, index) => point(index, ratio).join(",")).join(" ");
  const scorePolygon = dimensions.map((dimension, index) => point(index, Math.min(1, Math.max(0, dimension.score / 100))).join(",")).join(" ");

  return <div className="v2-radar-layout">
    <div className="v2-radar-chart" aria-label="9개 핵심 궁합 지표 레이더 차트">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
        {[.25, .5, .75, 1].map((ratio) => <polygon className="v2-radar-grid" key={ratio} points={polygon(ratio)} />)}
        {dimensions.map((_, index) => {
          const [x, y] = point(index, 1);
          return <line className="v2-radar-axis" key={index} x1={center} y1={center} x2={x} y2={y} />;
        })}
        <polygon className="v2-radar-score" points={scorePolygon} />
        {dimensions.map((dimension, index) => {
          const [x, y] = point(index, Math.min(1, Math.max(0, dimension.score / 100)));
          return <circle className="v2-radar-point" key={dimension.label} cx={x} cy={y} r="3.5" />;
        })}
      </svg>
    </div>
    <div className="v2-radar-legend">{dimensions.map((dimension) => <div key={dimension.label}><span>{dimension.label}</span><strong>{Math.round(dimension.score)}</strong></div>)}</div>
  </div>;
}
'''
if "v2-saju-char" not in components:
    if old_pillar not in components:
        raise RuntimeError("PillarGrid source changed")
    components = components.replace(old_pillar, new_pillar)
write(components_path, components)

result_path = "src/app/one-to-one/result/result-v2.tsx"
result = read(result_path)
result = result.replace('import { ElementFacts, Paragraph, PillarGrid } from "./report-v2-components";', 'import { CompatibilityRadar, ElementFacts, Paragraph, PillarGrid } from "./report-v2-components";')
old_hero_score = '''      <Paragraph>{content.overview.detailedSummary}</Paragraph>
      <div className="v2-score"><span>{gradeFor(snapshot.score)}</span><strong>{snapshot.score}</strong><small>/ 100</small></div>'''
new_hero_score = '''      <Paragraph>{content.overview.detailedSummary}</Paragraph>
      <div className="v2-pair-type">
        <small>두 사람의 궁합 유형</small>
        <strong>{shareArchetype.label}</strong>
        <span>{shareArchetype.subtitle}</span>
      </div>
      <div className="v2-score-gauge" style={{ "--score": snapshot.score } as React.CSSProperties}>
        <div><span>{gradeFor(snapshot.score)}</span><strong>{snapshot.score}</strong><small>/ 100</small></div>
      </div>'''
if "v2-pair-type" not in result:
    if old_hero_score not in result:
        raise RuntimeError("Hero score source changed")
    result = result.replace(old_hero_score, new_hero_score)
old_score_grid = '''      <div className="v2-score-grid">{visibleDimensions.map(([dimension, value]) => <div key={dimension}><span>{DIMENSION_LABELS[dimension]}</span><strong>{Math.round(value.normalizedScore)}</strong><i><b style={{ width: `${Math.min(100, Math.max(0, value.normalizedScore))}%` }} /></i></div>)}</div>'''
new_score_grid = '''      <CompatibilityRadar dimensions={visibleDimensions.map(([dimension, value]) => ({ label: DIMENSION_LABELS[dimension], score: value.normalizedScore }))} />'''
if "<CompatibilityRadar" not in result:
    if old_score_grid not in result:
        raise RuntimeError("Score grid source changed")
    result = result.replace(old_score_grid, new_score_grid)
write(result_path, result)

stage3_css = r'''
/* P5 saju tiles + archetype-first score visualization. */
.v2-saju-board { display: grid; gap: 14px; }
.v2-pillar-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.v2-pillar-pair {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  border: 1px solid var(--saju-border);
  border-radius: 20px;
  padding: 28px 8px 8px;
  background: var(--saju-bg-soft);
}
.v2-pillar-pair-label { position: absolute; top: 8px; left: 10px; color: var(--saju-ink-soft); font-size: .72rem; font-weight: 900; }
.v2-pillar-pair.is-day-pair { border-color: var(--saju-primary-deep); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--saju-primary) 45%, transparent); }
.v2-saju-char { aspect-ratio: 1; display: grid; place-items: center; align-content: center; gap: 2px; min-width: 0; border-radius: 14px; color: #3A3550; }
.v2-saju-char small { font-size: .62rem; opacity: .72; }
.v2-saju-char strong { font-size: clamp(1.45rem, 8vw, 2rem); line-height: 1; }
.v2-saju-char .v2-hanja { font-size: .78rem; opacity: .78; }
.v2-saju-char.is-day { outline: 2px solid color-mix(in srgb, var(--saju-primary-deep) 68%, white); outline-offset: 2px; }
.v2-saju-char.is-wood { background: var(--saju-element-wood); }
.v2-saju-char.is-fire { background: var(--saju-element-fire); }
.v2-saju-char.is-earth { background: var(--saju-element-earth); }
.v2-saju-char.is-metal { background: var(--saju-element-metal); }
.v2-saju-char.is-water { background: var(--saju-element-water); }
.v2-saju-char.is-unknown { border: 1px dashed var(--saju-ink-soft); background: var(--saju-unknown); color: var(--saju-ink-soft); }
.v2-day-character-note { border-radius: 18px; padding: 16px 18px; background: color-mix(in srgb, var(--saju-primary) 18%, var(--saju-bg-card)); }
.v2-day-character-note span, .v2-day-character-note strong { display: block; }
.v2-day-character-note span { color: var(--saju-primary-deep); font-size: .72rem; font-weight: 900; }
.v2-day-character-note strong { margin-top: 5px; color: var(--saju-ink); font-size: 1rem; }
.v2-day-character-note p { margin: 5px 0 0; color: var(--saju-ink-soft); font-size: .86rem; line-height: 1.55; }
.v2-pair-type { max-width: 520px; margin: 24px auto 14px; border: 1px solid var(--saju-border); border-radius: 24px; padding: 19px 20px; background: var(--saju-bg-card); box-shadow: var(--saju-shadow); }
.v2-pair-type small, .v2-pair-type strong, .v2-pair-type span { display: block; }
.v2-pair-type small { color: var(--saju-primary-deep); font-size: .72rem; font-weight: 900; letter-spacing: .08em; }
.v2-pair-type strong { margin-top: 7px; color: var(--saju-ink); font-size: clamp(1.35rem, 6vw, 1.9rem); }
.v2-pair-type span { margin-top: 6px; color: var(--saju-ink-soft); font-size: .9rem; line-height: 1.5; }
.v2-score-gauge { --score: 0; width: 176px; aspect-ratio: 1; margin: 18px auto 12px; border-radius: 50%; padding: 12px; background: conic-gradient(var(--saju-primary-deep) calc(var(--score) * 1%), var(--saju-track) 0); box-shadow: var(--saju-shadow); }
.v2-score-gauge > div { width: 100%; height: 100%; display: grid; grid-template-columns: auto auto; place-content: center; align-items: baseline; column-gap: 4px; border-radius: 50%; background: var(--saju-bg-card); color: var(--saju-ink); }
.v2-score-gauge span { grid-column: 1 / -1; justify-self: center; margin-bottom: 2px; color: var(--saju-primary-deep); font-size: .74rem; font-weight: 900; }
.v2-score-gauge strong { font-size: 2.65rem; font-weight: 900; font-variant-numeric: tabular-nums; }
.v2-score-gauge small { color: var(--saju-ink-soft); font-size: .72rem; }
.v2-radar-layout { display: grid; grid-template-columns: 1fr; gap: 18px; align-items: center; margin-top: 22px; border: 1px solid var(--saju-border); border-radius: 26px; padding: 18px; background: var(--saju-bg-card); box-shadow: var(--saju-shadow); }
.v2-radar-chart { width: min(100%, 320px); margin: 0 auto; }
.v2-radar-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.v2-radar-grid { fill: none; stroke: var(--saju-border); stroke-width: 1; }
.v2-radar-axis { stroke: var(--saju-border); stroke-width: 1; }
.v2-radar-score { fill: color-mix(in srgb, var(--saju-primary) 34%, transparent); stroke: var(--saju-primary-deep); stroke-width: 2.5; }
.v2-radar-point { fill: var(--saju-primary-deep); }
.v2-radar-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
.v2-radar-legend > div { display: flex; justify-content: space-between; gap: 8px; border-radius: 12px; padding: 9px 10px; background: var(--saju-bg-soft); }
.v2-radar-legend span { min-width: 0; color: var(--saju-ink-soft); font-size: .74rem; line-height: 1.3; }
.v2-radar-legend strong { color: var(--saju-ink); font-size: .82rem; font-variant-numeric: tabular-nums; }
@media (min-width: 761px) {
  .v2-pillar-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .v2-radar-layout { grid-template-columns: minmax(300px, .9fr) minmax(0, 1.1fr); padding: 24px; }
  .v2-radar-legend { grid-template-columns: 1fr; }
}
'''
append_once("src/app/report-v2-base.css", "/* P5 saju tiles", stage3_css)
commit("feat: add P5 saju tiles and compatibility radar", [components_path, result_path, "src/app/report-v2-base.css"])

# ---------------------------------------------------------------------------
# Stage 4 — Saju Boy chapter bubbles + scenario/summary visual kick
# ---------------------------------------------------------------------------
components = read(components_path)
if "const SAJU_BOY_CHAPTER_LINES" not in components:
    marker = 'export function Chapter({\n'
    bubble = '''const SAJU_BOY_CHAPTER_LINES: Record<number, string> = {
  0: "첫 장부터 단서가 보여요. 둘 사이의 전체 그림부터 잡아볼게요.",
  1: "각자 어떤 방식으로 움직이는지 알면, 관계의 절반은 이미 읽은 셈이에요.",
  2: "여긴 좀 중요해요. 상대가 관계에서 보이는 반응을 가까이 들여다볼게요.",
  3: "둘이 붙었을 때 생기는 케미는 혼자 있을 때와 전혀 다를 수 있어요.",
  4: "좋을 때보다 어긋날 때 패턴을 보면 이 관계의 진짜 사용법이 보여요.",
  5: "누가 먼저 움직이고 누가 기다리는지, 관계의 리듬을 확인해볼 차례예요.",
  6: "오래 가는 관계는 우연보다 반복되는 습관에서 갈려요.",
  7: "갈등은 피하는 것보다 회복하는 방식이 더 중요해요.",
  8: "이제 실제 행동으로 옮길 차례예요. 써먹을 수 있는 것만 남겨볼게요.",
  9: "마지막 장이에요. 앞의 단서를 한 번에 쓸 수 있게 정리해둘게요.",
};

function SajuBoyBubble({ chapter }: { chapter: number }) {
  const line = SAJU_BOY_CHAPTER_LINES[chapter] ?? "관계의 다음 단서를 같이 읽어볼게요.";
  return <aside className="v2-saju-boy-bubble" aria-label="사주소년 용한의 코멘트">
    <div className="v2-saju-boy-avatar" aria-hidden="true">
      <svg viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="31" className="boy-face" />
        <path d="M18 29c4-13 31-16 38 0-9-3-12-8-18-7-7 0-11 5-20 7Z" className="boy-hair" />
        <circle cx="27" cy="37" r="8" className="boy-glass" />
        <circle cx="45" cy="37" r="8" className="boy-glass" />
        <path d="M35 37h2" className="boy-bridge" />
        <path d="M30 50c4 3 8 3 12 0" className="boy-smile" />
        <path d="M18 61c5-8 31-8 36 0" className="boy-robe" />
      </svg>
    </div>
    <div><small>사주소년 용한</small><p>{line}</p></div>
  </aside>;
}

'''
    if marker not in components:
        raise RuntimeError("Chapter marker missing")
    components = components.replace(marker, bubble + marker, 1)
old_heading_end = '''    </div>
    <div className="day19-chapter-body">{children}</div>'''
new_heading_end = '''    </div>
    <SajuBoyBubble chapter={index} />
    <div className="day19-chapter-body">{children}</div>'''
if "<SajuBoyBubble chapter={index}" not in components:
    if old_heading_end not in components:
        raise RuntimeError("Chapter body marker missing")
    components = components.replace(old_heading_end, new_heading_end, 1)
write(components_path, components)

stage4_css = r'''
/* P5 Saju Boy chapter guide + messenger-style scenes. */
.v2-saju-boy-bubble { display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 12px; align-items: center; margin: 0 0 22px; border: 1px solid color-mix(in srgb, var(--saju-primary) 65%, var(--saju-border)); border-radius: 20px 20px 20px 7px; padding: 13px 15px; background: color-mix(in srgb, var(--saju-primary) 16%, var(--saju-bg-card)); }
.v2-saju-boy-avatar { width: 54px; height: 54px; border-radius: 18px; background: color-mix(in srgb, var(--saju-blush) 30%, var(--saju-bg-card)); overflow: hidden; }
.v2-saju-boy-avatar svg { width: 100%; height: 100%; }
.v2-saju-boy-avatar .boy-face { fill: #F6D5B9; }
.v2-saju-boy-avatar .boy-hair { fill: #3A3550; }
.v2-saju-boy-avatar .boy-glass { fill: none; stroke: #3A3550; stroke-width: 2; }
.v2-saju-boy-avatar .boy-bridge, .v2-saju-boy-avatar .boy-smile { fill: none; stroke: #3A3550; stroke-width: 2; stroke-linecap: round; }
.v2-saju-boy-avatar .boy-robe { fill: var(--saju-primary-deep); }
.v2-saju-boy-bubble small { display: block; color: var(--saju-primary-deep); font-size: .72rem; font-weight: 900; letter-spacing: .04em; }
.v2-saju-boy-bubble p { margin: 4px 0 0; color: var(--saju-ink); font-size: .92rem; line-height: 1.55; letter-spacing: -.01em; }
.day19-summary { border-color: color-mix(in srgb, var(--saju-mint) 55%, var(--saju-border)); background: color-mix(in srgb, var(--saju-mint) 14%, var(--saju-bg-card)); }
.day19-summary > strong { color: var(--saju-ink); }
.day19-summary ol { list-style: none; padding: 0; counter-reset: p5-summary; }
.day19-summary li { position: relative; margin: 8px 0; border-radius: 13px; padding: 10px 12px 10px 38px; background: var(--saju-bg-card); color: var(--saju-ink); line-height: 1.55; }
.day19-summary li::before { content: "✓"; position: absolute; left: 12px; top: 9px; width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; background: var(--saju-mint); color: #283B35; font-size: .7rem; font-weight: 900; }
.v2-scenarios article, .reference-conversation-card { position: relative; border-radius: 18px 18px 18px 6px !important; background: color-mix(in srgb, var(--saju-primary) 13%, var(--saju-bg-card)) !important; }
.v2-scenarios article:nth-child(even) { border-radius: 18px 18px 6px 18px !important; background: color-mix(in srgb, var(--saju-blush) 13%, var(--saju-bg-card)) !important; }
'''
append_once("src/app/report-v2-detail.css", "/* P5 Saju Boy chapter", stage4_css)
commit("feat: add P5 Saju Boy chapter guidance", [components_path, "src/app/report-v2-detail.css"])

# ---------------------------------------------------------------------------
# Stage 5 — reading progress + honest pre-payment preview + emotional mobile CTA
# ---------------------------------------------------------------------------
result = read(result_path)
if "const [readingProgress" not in result:
    result = result.replace(
        '  const [accountOwned, setAccountOwned] = useState(false);',
        '  const [accountOwned, setAccountOwned] = useState(false);\n  const [readingProgress, setReadingProgress] = useState(0);'
    )
    marker = '''  useEffect(() => {
    if (status !== "loading") return;'''
    progress_effect = '''  useEffect(() => {
    if (status !== "ready") return;
    function updateReadingProgress() {
      const root = document.documentElement;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      setReadingProgress(Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))));
    }
    updateReadingProgress();
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress);
    return () => {
      window.removeEventListener("scroll", updateReadingProgress);
      window.removeEventListener("resize", updateReadingProgress);
    };
  }, [status]);

'''
    if marker not in result:
        raise RuntimeError("Loading effect marker missing")
    result = result.replace(marker, progress_effect + marker, 1)
old_return = '  return <main className="v2-page"><div className="v2-shell">\n    <header className="v2-hero">'
new_return = '''  return <main className="v2-page">
    <div className="v2-reading-progress" role="progressbar" aria-label="리포트 읽기 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readingProgress}>
      <span style={{ width: `${readingProgress}%` }} />
      <b style={{ left: `${readingProgress}%` }} aria-hidden="true">용</b>
    </div>
    <div className="v2-shell">
    <header className="v2-hero">'''
if "v2-reading-progress" not in result:
    if old_return not in result:
        raise RuntimeError("Ready return marker missing")
    result = result.replace(old_return, new_return, 1)
write(result_path, result)

payment_path = "src/components/payment-button.tsx"
payment = read(payment_path)
if "buttonLabel" not in payment.split("export function PaymentButton", 1)[1].split("async function", 1)[0]:
    payment = payment.replace(
        '  agreementAccepted = true,\n}: {',
        '  agreementAccepted = true,\n  buttonLabel,\n}: {'
    )
    payment = payment.replace(
        '  agreementAccepted?: boolean;\n}) {',
        '  agreementAccepted?: boolean;\n  buttonLabel?: string;\n}) {'
    )
    payment = payment.replace(
        '{isLoading ? "결제창을 여는 중..." : `${item.amount.toLocaleString("ko-KR")}원 결제하기`}',
        '{isLoading ? "결제창을 여는 중..." : buttonLabel ?? `${item.amount.toLocaleString("ko-KR")}원 결제하기`}'
    )
write(payment_path, payment)

checkout_path = "src/app/one-to-one/checkout/page.tsx"
checkout = read(checkout_path)
old_checkout = '''      <PurchasePolicyConsent checked={policyAccepted} onChange={setPolicyAccepted} />
      <PaymentButton product="oneToOne" paymentId={order.paymentId} inputSnapshot={order.inputSnapshot} agreementAccepted={policyAccepted} />
      <Link href="/one-to-one" className="back-link checkout-back">입력 수정하기</Link>'''
new_checkout = '''      <section className="checkout-unlock-preview" aria-labelledby="checkout-unlock-title">
        <p className="card-label">결제 후 바로 열리는 것</p>
        <h2 id="checkout-unlock-title">사주소년이 두 사람의 관계를 끝까지 읽어드려요.</h2>
        <div>
          <article><span>01</span><strong>그 사람의 속마음</strong><p>계산된 관계 반응을 바탕으로, 겉으로 드러나는 모습과 속의 반응 차이를 풀어봅니다.</p></article>
          <article><span>02</span><strong>갈등과 회복의 사용법</strong><p>어떤 장면에서 자주 어긋나고 어떻게 다시 대화하면 좋은지 정리합니다.</p></article>
          <article><span>03</span><strong>실전 관계 매뉴얼</strong><p>연락, 표현, 거리 조절과 앞으로 써먹을 행동 가이드를 챕터별로 제공합니다.</p></article>
        </div>
        <p className="checkout-price-anchor">한 번 결제로 완성된 리포트 전체를 저장해 다시 볼 수 있어요.</p>
      </section>
      <PurchasePolicyConsent checked={policyAccepted} onChange={setPolicyAccepted} />
      <div className="checkout-sticky-cta">
        <PaymentButton product="oneToOne" paymentId={order.paymentId} inputSnapshot={order.inputSnapshot} agreementAccepted={policyAccepted} buttonLabel="속마음까지 다 보기 · 1,000원" />
      </div>
      <Link href="/one-to-one" className="back-link checkout-back">입력 수정하기</Link>'''
if "checkout-unlock-preview" not in checkout:
    if old_checkout not in checkout:
        raise RuntimeError("Checkout CTA marker missing")
    checkout = checkout.replace(old_checkout, new_checkout, 1)
write(checkout_path, checkout)

stage5_report_css = r'''
/* P5 long-form reading progress. */
.v2-reading-progress { position: fixed; z-index: 45; top: 0; left: 0; width: 100%; height: 5px; background: color-mix(in srgb, var(--saju-primary) 18%, var(--saju-bg-card)); pointer-events: none; }
.v2-reading-progress > span { display: block; height: 100%; background: linear-gradient(90deg, var(--saju-primary-deep), var(--saju-blush)); transition: width .15s linear; }
.v2-reading-progress > b { position: absolute; top: 7px; translate: -50% 0; width: 28px; height: 28px; display: grid; place-items: center; border: 2px solid var(--saju-bg-card); border-radius: 50%; background: var(--saju-primary-deep); color: #fff; box-shadow: 0 4px 14px rgba(84, 70, 122, .18); font-size: .68rem; }
'''
append_once("src/app/report-v2-base.css", "/* P5 long-form reading progress", stage5_report_css)

stage5_global_css = r'''
/* P5 checkout conversion layer: no paid text is shipped before verification. */
.checkout-unlock-preview { margin: 22px 0; border: 1px solid #e5ddef; border-radius: 24px; padding: 22px; background: #fff; box-shadow: 0 16px 42px rgba(84, 70, 122, .08); }
.checkout-unlock-preview h2 { margin: 8px 0 16px; color: #3A3550; font-size: 1.35rem; line-height: 1.4; }
.checkout-unlock-preview > div { display: grid; gap: 10px; }
.checkout-unlock-preview article { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 2px 10px; border-radius: 16px; padding: 14px; background: #F8F5FC; }
.checkout-unlock-preview article > span { grid-row: 1 / span 2; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: #B8A9E8; color: #3A3550; font-size: .72rem; font-weight: 900; }
.checkout-unlock-preview article strong { color: #3A3550; }
.checkout-unlock-preview article p { margin: 4px 0 0; color: #6E6687; font-size: .88rem; line-height: 1.55; }
.checkout-price-anchor { margin: 14px 0 0; color: #7B7396; font-size: .84rem; line-height: 1.5; text-align: center; }
.checkout-sticky-cta { margin-top: 18px; }
@media (max-width: 640px) {
  .checkout-shell { padding-bottom: 94px; }
  .checkout-sticky-cta { position: fixed; z-index: 40; left: 0; right: 0; bottom: 0; margin: 0; padding: 10px max(14px, env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left)); border-top: 1px solid #e6deef; background: rgba(255, 251, 245, .96); backdrop-filter: blur(14px); }
  .checkout-sticky-cta .payment-button { min-height: 52px; background: #8B7BC7; }
}
@media (prefers-color-scheme: dark) and (max-width: 640px) {
  .checkout-sticky-cta { border-color: #4A4264; background: rgba(31, 27, 46, .95); }
}
'''
append_once("src/app/globals.css", "/* P5 checkout conversion layer", stage5_global_css)
commit("feat: add P5 mobile conversion experience", [result_path, payment_path, checkout_path, "src/app/report-v2-base.css", "src/app/globals.css"])

# ---------------------------------------------------------------------------
# Stage 6 — share card export + privacy toggle + move card to satisfaction peak
# ---------------------------------------------------------------------------
share_path = "src/app/one-to-one/result/compatibility-share-card.tsx"
share = r'''"use client";

import { useState } from "react";
import type { CompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";
import styles from "./compatibility-share-card.module.css";

type CompatibilityShareCardProps = {
  selfName: string;
  partnerName: string;
  relationshipLabel: string;
  score: number;
  archetype: CompatibilityShareArchetype;
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const chars = [...text];
  const lines: string[] = [];
  let line = "";
  for (const char of chars) {
    const next = line + char;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function createShareImageBlob({
  selfName,
  partnerName,
  relationshipLabel,
  score,
  archetype,
  includeNames,
}: CompatibilityShareCardProps & { includeNames: boolean }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#FFFBF5");
  gradient.addColorStop(.52, "#F3EEFF");
  gradient.addColorStop(1, "#FFEAF1");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = "rgba(184,169,232,.30)";
  ctx.beginPath(); ctx.arc(900, 230, 260, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,176,136,.22)";
  ctx.beginPath(); ctx.arc(120, 1660, 300, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.90)";
  roundedRect(ctx, 90, 110, 900, 1700, 64);

  ctx.fillStyle = "#8B7BC7";
  ctx.font = "800 42px Pretendard, sans-serif";
  ctx.fillText("우리사주", 160, 220);
  ctx.textAlign = "right";
  ctx.fillText(`${relationshipLabel} 궁합`, 920, 220);
  ctx.textAlign = "left";

  if (includeNames) {
    ctx.fillStyle = "#7B7396";
    ctx.font = "700 42px Pretendard, sans-serif";
    ctx.fillText(`${selfName}  ×  ${partnerName}`, 160, 330);
  }

  ctx.fillStyle = "#8B7BC7";
  ctx.font = "800 32px Pretendard, sans-serif";
  ctx.fillText("사주소년이 찾은 관계의 단서", 160, includeNames ? 430 : 350);

  ctx.fillStyle = "#3A3550";
  ctx.font = "900 76px Pretendard, sans-serif";
  const labelY = includeNames ? 550 : 470;
  const labelLines = wrapLines(ctx, archetype.label, 760);
  labelLines.slice(0, 3).forEach((line, index) => ctx.fillText(line, 160, labelY + index * 92));

  const subtitleY = labelY + labelLines.slice(0, 3).length * 92 + 32;
  ctx.fillStyle = "#7B7396";
  ctx.font = "700 40px Pretendard, sans-serif";
  wrapLines(ctx, archetype.subtitle, 760).slice(0, 3).forEach((line, index) => ctx.fillText(line, 160, subtitleY + index * 58));

  const clueY = subtitleY + 230;
  ctx.fillStyle = "#F7F2FB";
  roundedRect(ctx, 150, clueY - 70, 780, 330, 38);
  ctx.fillStyle = "#3A3550";
  ctx.font = "700 35px Pretendard, sans-serif";
  wrapLines(ctx, archetype.clue, 680).slice(0, 5).forEach((line, index) => ctx.fillText(line, 200, clueY + index * 52));

  ctx.fillStyle = "#B8A9E8";
  roundedRect(ctx, 260, 1430, 560, 210, 105);
  ctx.fillStyle = "#3A3550";
  ctx.textAlign = "center";
  ctx.font = "800 30px Pretendard, sans-serif";
  ctx.fillText("궁합 점수", 540, 1500);
  ctx.font = "900 86px Pretendard, sans-serif";
  ctx.fillText(String(score), 510, 1588);
  ctx.font = "700 28px Pretendard, sans-serif";
  ctx.fillText("/ 100", 625, 1588);
  ctx.textAlign = "left";

  ctx.fillStyle = "#7B7396";
  ctx.font = "600 28px Pretendard, sans-serif";
  ctx.fillText("생년월일시와 유료 본문은 포함되지 않아요", 160, 1730);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("IMAGE_EXPORT_FAILED")), "image/png");
  });
}

export function CompatibilityShareCard({
  selfName,
  partnerName,
  relationshipLabel,
  score,
  archetype,
}: CompatibilityShareCardProps) {
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "saved" | "failed">("idle");
  const [includeNames, setIncludeNames] = useState(false);

  async function share() {
    const shareText = `우리사주 ${relationshipLabel} 궁합 · ${archetype.label} · ${score}점`;
    const safeUrl = `${window.location.origin}/`;

    try {
      const blob = await createShareImageBlob({ selfName, partnerName, relationshipLabel, score, archetype, includeNames });
      const file = new File([blob], "woorisaju-compatibility.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: safeUrl, files: [file] });
        setShareState("shared");
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `우리사주 ${relationshipLabel} 궁합`, text: shareText, url: safeUrl });
        setShareState("shared");
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${safeUrl}`);
      setShareState("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareState("failed");
    }
  }

  async function saveImage() {
    try {
      const blob = await createShareImageBlob({ selfName, partnerName, relationshipLabel, score, archetype, includeNames });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "woorisaju-compatibility.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setShareState("saved");
    } catch {
      setShareState("failed");
    }
  }

  return <section className={styles.section} aria-labelledby="compatibility-share-card-title">
    <div className={styles.heading}>
      <small>RELATIONSHIP TYPE</small>
      <h2 id="compatibility-share-card-title">우리 둘은 어떤 궁합일까?</h2>
      <p>긴 리포트의 핵심만 뽑은 9:16 공유 카드예요. 생년월일시와 유료 본문은 카드에 담지 않습니다.</p>
    </div>

    <div className={styles.card} data-archetype={archetype.id}>
      <div className={styles.topline}><span>우리사주</span><span>{relationshipLabel} 궁합</span></div>
      {includeNames ? <div className={styles.names}>{selfName} <span>×</span> {partnerName}</div> : <div className={styles.names}>우리 둘의 관계 카드</div>}
      <div className={styles.mystery}>사주소년이 찾은 관계의 단서</div>
      <strong className={styles.label}>{archetype.label}</strong>
      <p className={styles.subtitle}>{archetype.subtitle}</p>
      <p className={styles.clue}>{archetype.clue}</p>
      <div className={styles.score}><span>궁합 점수</span><strong>{score}</strong><small>/ 100</small></div>
      <div className={styles.footer}>결과의 일부만 보여주는 공유 카드</div>
    </div>

    <label className={styles.nameToggle}><input type="checkbox" checked={includeNames} onChange={(event) => setIncludeNames(event.target.checked)} />공유 이미지에 이름 넣기</label>
    <div className={styles.actions}>
      <button type="button" className={styles.shareButton} onClick={share}>{shareState === "shared" ? "공유했어요" : shareState === "copied" ? "공유 문구를 복사했어요" : "궁합 카드 공유하기"}</button>
      <button type="button" className={styles.saveButton} onClick={saveImage}>{shareState === "saved" ? "이미지를 저장했어요" : "9:16 이미지 저장"}</button>
    </div>
    {shareState === "failed" && <p className={styles.shareError}>공유 이미지를 만들지 못했어요. 브라우저 권한을 확인해 주세요.</p>}
    <p className={styles.privacyNote}>공유 버튼은 결제 결과 주소나 접근 토큰을 보내지 않고 우리사주 홈 주소만 공유합니다. 이름은 사용자가 직접 켠 경우에만 이미지에 들어갑니다.</p>
  </section>;
}
'''
write(share_path, share)

share_css_path = "src/app/one-to-one/result/compatibility-share-card.module.css"
share_css = r'''.section { margin: 18px 0 58px; font-family: var(--saju-font-sans); }
.heading { max-width: 660px; margin-bottom: 20px; }
.heading small { color: var(--saju-primary-deep); font-size: .72rem; font-weight: 900; letter-spacing: .13em; }
.heading h2 { margin: 7px 0 9px; color: var(--saju-ink); font-size: clamp(1.9rem, 7vw, 2.7rem); line-height: 1.15; letter-spacing: -.035em; }
.heading p { margin: 0; color: var(--saju-ink-soft); line-height: 1.65; }
.card { position: relative; isolation: isolate; overflow: hidden; width: min(100%, 390px); aspect-ratio: 9 / 16; margin: 0 auto; border: 1px solid var(--saju-border); border-radius: 30px; padding: 28px 24px; background: linear-gradient(155deg, var(--saju-bg-card), color-mix(in srgb, var(--saju-primary) 28%, var(--saju-bg-card)) 55%, color-mix(in srgb, var(--saju-blush) 25%, var(--saju-bg-card))); box-shadow: var(--saju-shadow); color: var(--saju-ink); display: flex; flex-direction: column; }
.card::before, .card::after { content: ""; position: absolute; z-index: -1; border-radius: 50%; filter: blur(2px); }
.card::before { width: 190px; height: 190px; right: -70px; top: -55px; background: color-mix(in srgb, var(--saju-primary) 40%, transparent); }
.card::after { width: 220px; height: 220px; left: -110px; bottom: 100px; background: color-mix(in srgb, var(--saju-accent) 22%, transparent); }
.topline { display: flex; justify-content: space-between; gap: 12px; color: var(--saju-primary-deep); font-size: .76rem; font-weight: 900; letter-spacing: .04em; }
.names { margin-top: 32px; color: var(--saju-ink-soft); font-size: 1rem; font-weight: 800; }
.names span { color: var(--saju-primary-deep); }
.mystery { margin-top: 54px; color: var(--saju-primary-deep); font-size: .72rem; font-weight: 900; letter-spacing: .08em; }
.label { display: block; margin-top: 9px; color: var(--saju-ink); font-size: clamp(2rem, 8vw, 3rem); line-height: 1.12; letter-spacing: -.045em; }
.subtitle { margin: 12px 0 0; color: var(--saju-ink-soft); font-size: 1rem; font-weight: 700; line-height: 1.55; }
.clue { margin-top: 26px; border: 1px solid color-mix(in srgb, var(--saju-primary) 48%, var(--saju-border)); border-radius: 18px 18px 18px 6px; padding: 15px; background: color-mix(in srgb, var(--saju-primary) 12%, var(--saju-bg-card)); color: var(--saju-ink); font-size: .9rem; line-height: 1.6; }
.score { margin-top: auto; align-self: center; width: 172px; aspect-ratio: 1; border-radius: 50%; display: grid; grid-template-columns: auto auto; place-content: center; align-items: baseline; column-gap: 4px; background: var(--saju-primary); color: #3A3550; }
.score span { grid-column: 1 / -1; justify-self: center; font-size: .72rem; font-weight: 900; }
.score strong { font-size: 3rem; font-variant-numeric: tabular-nums; }
.score small { font-size: .7rem; font-weight: 800; }
.footer { margin-top: 20px; color: var(--saju-ink-soft); font-size: .72rem; text-align: center; }
.nameToggle { width: min(100%, 390px); margin: 14px auto 0; display: flex; align-items: center; gap: 8px; color: var(--saju-ink-soft); font-size: .84rem; font-weight: 700; }
.nameToggle input { width: 18px; height: 18px; accent-color: var(--saju-primary-deep); }
.actions { width: min(100%, 390px); margin: 12px auto 0; display: grid; grid-template-columns: 1fr; gap: 8px; }
.shareButton, .saveButton { min-height: 48px; border-radius: 14px; padding: 12px 16px; cursor: pointer; font-weight: 900; }
.shareButton { border: 0; background: var(--saju-accent); color: #3A3550; }
.saveButton { border: 1px solid var(--saju-border); background: var(--saju-bg-card); color: var(--saju-ink); }
.shareError, .privacyNote { width: min(100%, 390px); margin: 10px auto 0; font-size: .78rem; line-height: 1.5; }
.shareError { color: #A84A5D; }
.privacyNote { color: var(--saju-ink-soft); }
@media (min-width: 520px) { .actions { grid-template-columns: 1fr 1fr; } }
'''
write(share_css_path, share_css)

result = read(result_path)
share_call = '''    <CompatibilityShareCard
      selfName={personA.displayName}
      partnerName={personB.displayName}
      relationshipLabel={relationshipLabel}
      score={snapshot.score}
      archetype={shareArchetype}
    />
'''
if result.count(share_call) != 1:
    raise RuntimeError("Unexpected share card occurrence count")
result = result.replace(share_call, "", 1)
hero_end = '''    </header>

    <section className="v2-basic-facts">'''
hero_with_share = '''    </header>

    <CompatibilityShareCard
      selfName={personA.displayName}
      partnerName={personB.displayName}
      relationshipLabel={relationshipLabel}
      score={snapshot.score}
      archetype={shareArchetype}
    />

    <section className="v2-basic-facts">'''
if hero_end not in result:
    raise RuntimeError("Hero end marker missing")
result = result.replace(hero_end, hero_with_share, 1)
write(result_path, result)

# Contract test + package script + docs.
p5_test_path = "scripts/report-p5-ui-contract-test.ts"
p5_test = r'''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const theme = readFileSync("src/app/report-theme.css", "utf8");
const base = readFileSync("src/app/report-v2-base.css", "utf8");
const detail = readFileSync("src/app/report-v2-detail.css", "utf8");
const page = readFileSync("src/app/one-to-one/result/page.tsx", "utf8");
const result = readFileSync("src/app/one-to-one/result/result-v2.tsx", "utf8");
const components = readFileSync("src/app/one-to-one/result/report-v2-components.tsx", "utf8");
const checkout = readFileSync("src/app/one-to-one/checkout/page.tsx", "utf8");
const payment = readFileSync("src/components/payment-button.tsx", "utf8");
const share = readFileSync("src/app/one-to-one/result/compatibility-share-card.tsx", "utf8");
const shareCss = readFileSync("src/app/one-to-one/result/compatibility-share-card.module.css", "utf8");

for (const token of [
  "#FFFBF5", "#FFFFFF", "#3A3550", "#7B7396", "#B8A9E8", "#8B7BC7", "#FFB088", "#8FD9C4", "#FFC4D6",
  "#A8D8B9", "#FF9E9E", "#F5D6A0", "#D9D5E8", "#A5C9E8", "#1F1B2E", "#2A2540", "#EDE9F7",
]) assert.ok(theme.includes(token), `P5 token missing: ${token}`);
assert.match(theme, /prefers-color-scheme:\s*dark/);
assert.match(page, /report-theme\.css/);
assert.doesNotMatch(base + detail, /#fbf8f2|#213f33|#fffdf8/i);
assert.match(base, /Pretendard/);
assert.match(base, /line-height:\s*1\.75/);
assert.match(components, /v2-saju-char/);
assert.match(components, /pillar\.stem/);
assert.match(components, /pillar\.branch/);
assert.match(components, /CompatibilityRadar/);
assert.match(components, /9개 핵심 궁합 지표 레이더 차트/);
assert.match(result, /v2-pair-type/);
assert.match(result, /<CompatibilityRadar/);
assert.match(result, /visibleDimensions/);
assert.match(components, /사주소년 용한/);
assert.match(result, /v2-reading-progress/);
assert.match(checkout, /checkout-sticky-cta/);
assert.match(checkout, /속마음까지 다 보기 · 1,000원/);
assert.match(payment, /buttonLabel\?: string/);
assert.match(share, /document\.createElement\("canvas"\)/);
assert.match(share, /new File\(\[blob\]/);
assert.match(share, /const \[includeNames, setIncludeNames\] = useState\(false\)/);
assert.match(share, /const safeUrl = `\$\{window\.location\.origin\}\//);
assert.doesNotMatch(share, /window\.location\.href/);
assert.doesNotMatch(share, /accessToken/);
assert.match(shareCss, /aspect-ratio:\s*9 \/ 16/);
assert.ok(result.indexOf("<CompatibilityShareCard") < result.indexOf("<section className=\"v2-basic-facts\""), "share card should appear immediately after hero before detailed facts");

console.log("P5 pastel mascot report UI contract: PASS");
'''
write(p5_test_path, p5_test)

package_path = "package.json"
package = json.loads(read(package_path))
package["scripts"]["test:report:p5-ui"] = "tsx scripts/report-p5-ui-contract-test.ts"
write(package_path, json.dumps(package, ensure_ascii=False, indent=2) + "\n")

project_path = "docs/PROJECT_STATE.md"
project = read(project_path)
if "## 2026-08-22 1:1 리포트 P5 UI/UX 개선" not in project:
    project += '''\n\n## 2026-08-22 1:1 리포트 P5 UI/UX 개선\n\n- Google Drive의 `우리궁합 1:1 리포트 개선 프롬프트팩 v1` P5를 최신 **우리사주** 브랜드/현재 9개 계산 지표에 맞춰 구현했다.\n- `report-theme.css`에 한지 아이보리·라벤더·살구·민트·블러시와 오행 5색 토큰 및 다크모드 대응값을 정의하고 1:1 장문 리포트 CSS를 토큰 기반으로 전환했다.\n- 모바일 우선 타이포 위계와 1.75 장문 행간을 적용했다. 폰트 파일을 번들하지 않고 Pretendard/Nanum Myeongjo 호환 스택을 사용한다.\n- 명식을 4개 기둥 표가 아니라 **8글자 사주 타일**로 보여주고 오행별 파스텔 배경, 일주 강조, 시주 미상 점선 타일을 적용했다. 실제 분포 근거가 없는 희귀도 수치는 만들지 않았다.\n- 현재 엔진의 9개 궁합 지표를 모두 유지한 9축 SVG 레이더 차트와 결정론적 궁합 유형 우선 히어로/원형 점수 게이지를 적용했다.\n- CH0~CH9마다 오리지널 사주소년 용한 SVG 아바타 + 안전한 장면 안내 말풍선을 배치하고, 핵심 요약/장면 카드를 파스텔·메신저 스타일로 바꿨다.\n- 결제 전에는 유료 AI 본문을 CSS로 가리지 않고, 생성 전에도 안전한 일반 기능 예고만 보여준다. 모바일 하단 고정 CTA는 `속마음까지 다 보기 · 1,000원`으로 변경했다.\n- 결제 직후 만족도가 높은 구간에 9:16 공유 카드를 앞당기고 Canvas PNG 생성/저장/파일 공유를 추가했다. 공유 이미지 이름은 기본 OFF이며 생년월일시·유료 본문·결과 URL·접근 토큰은 포함하지 않는다.\n- `test:report:p5-ui` 계약 테스트를 추가했다.\n'''
write(project_path, project)

next_path = "docs/NEXT_TASK.md"
next_text = read(next_path)
if "P5: 1:1 리포트 파스텔 마스코트 UI/UX 개편" not in next_text:
    anchor = "  - [x] P4-3: 60갑자 전체 캐릭터 체계 + 결과 UI + AI 보조 편집 payload 연결. 캐릭터는 계산값을 덮어쓰지 않는 보조 렌즈로 제한.\n"
    if anchor in next_text:
        next_text = next_text.replace(anchor, anchor + "  - [x] P5: 1:1 리포트 파스텔 마스코트 UI/UX 개편. 디자인 토큰·타이포·8글자 사주 타일·9축 레이더·사주소년 챕터 말풍선·모바일 전환 CTA·9:16 이미지 공유를 적용.\n", 1)
# replace current handoff block robustly
next_text = re.sub(
    r'## Current HANDOFF\n\n```text\nHANDOFF\n.*?\n```',
    '''## Current HANDOFF\n\n```text\nHANDOFF\n- Worker: GPT\n- Task: P5 — 1:1 리포트 파스텔 마스코트 UI/UX 개편\n- Status: complete\n- Validation: test:report:p5-ui + 기존 1:1 P1~P4 계약 + Core validation + lint + production build\n- Commit: clean PR 검증 후 main squash merge SHA 기준\n- Remaining: 360/390/430px 모바일 핵심 플로우 QA; 외부 SOLAPI/Kakao 실제 발송 설정\n- Risk: UI/표현 계층만 변경; 계산·점수·결제 검증·저장 schema 불변. 실제 통계 없는 일주 희귀도는 표시하지 않음\n```''',
    next_text,
    count=1,
    flags=re.S,
)
write(next_path, next_text)

# Long-term UI decision.
decisions_path = "docs/DECISIONS.md"
decisions = read(decisions_path)
if "파스텔 마스코트형 디자인 시스템" not in decisions:
    needle = "- 공유 기능은 현재 결제 결과 URL을 전파하지 않는다. 접근 토큰이 URL fragment에 포함될 수 있으므로 공유 대상 링크는 우리사주 공개 홈 주소로 고정한다.\n"
    addition = needle + "- 1:1 유료 리포트의 기본 UI는 **파스텔 마스코트형 디자인 시스템**을 사용한다. 한지 아이보리 기반에 라벤더를 주색, 살구를 CTA, 민트/블러시와 파스텔 오행 5색을 보조색으로 사용하고 본문 텍스트는 고대비 먹빛 남보라를 유지한다. 모바일 우선·다크모드 대응을 기본으로 한다.\n- 명식은 8글자 사주 타일로, 현재 9개 궁합 지표는 9축 시각화로 표현한다. 실제 분포 근거가 없는 일주 희귀도/퍼센트는 임의로 만들지 않는다.\n- 결제 전 유료 콘텐츠는 CSS blur로 숨기지 않는다. 결제 전 화면에는 실제 유료 AI 본문 대신 기능 예고만 표시하며, 공유 이미지에도 생년월일시·장문 유료 본문·결과 접근 토큰을 포함하지 않는다.\n"
    if needle not in decisions:
        raise RuntimeError("DECISIONS insertion marker missing")
    decisions = decisions.replace(needle, addition, 1)
write(decisions_path, decisions)

commit("feat: finish P5 share card experience", [share_path, share_css_path, result_path, p5_test_path, package_path, project_path, next_path, decisions_path])

print("P5 patch complete")
