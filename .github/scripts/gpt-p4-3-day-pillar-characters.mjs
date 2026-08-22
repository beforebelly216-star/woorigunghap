import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function patch(path, transform) {
  const before = readFileSync(path, "utf8");
  const after = transform(before);
  if (before !== after) writeFileSync(path, after);
}

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Missing ${label}`);
  return source.replace(needle, replacement);
}

patch("src/app/one-to-one/result/result-v2.tsx", (source) => {
  source = replaceOnce(
    source,
    'import { buildCompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";\n',
    'import { buildCompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";\nimport { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";\nimport { DayPillarCharacterCard } from "./day-pillar-character-card";\n',
    "result imports",
  );
  source = replaceOnce(
    source,
    '  const shareArchetype = buildCompatibilityShareArchetype(snapshot);\n',
    '  const shareArchetype = buildCompatibilityShareArchetype(snapshot);\n  const personACharacter = getDayPillarCharacter(facts.A.pillars.day.korean);\n  const personBCharacter = getDayPillarCharacter(facts.B.pillars.day.korean);\n',
    "character derivation",
  );
  source = replaceOnce(
    source,
    '    <CompatibilityShareCard\n',
    '    {(personACharacter || personBCharacter) && <section className="day-pillar-character-section">\n      <div className="v2-section-title"><small>60 DAY-PILLAR CHARACTERS</small><h2>두 사람의 60일주 캐릭터</h2><p>일주는 각자의 기본 반응 결을 읽는 한 가지 렌즈예요. 실제 궁합 판단은 아래의 전체 계산과 관계 장면을 함께 봅니다.</p></div>\n      <div className="day-pillar-character-grid">\n        {personACharacter && <DayPillarCharacterCard label="나의 캐릭터" displayName={personA.displayName} character={personACharacter} />}\n        {personBCharacter && <DayPillarCharacterCard label="상대의 캐릭터" displayName={personB.displayName} character={personBCharacter} />}\n      </div>\n    </section>}\n\n    <CompatibilityShareCard\n',
    "character UI",
  );
  return source;
});

patch("src/lib/narrative/report-engine-v7.ts", (source) => {
  source = source.replaceAll("paid-report-v7-editorial-v13-saju-boy-magic-school", "paid-report-v7-editorial-v14-day-pillar-characters");
  source = replaceOnce(
    source,
    'import { buildReportEditorialContext } from "@/lib/narrative/report-editorial-context";\n',
    'import { buildReportEditorialContext } from "@/lib/narrative/report-editorial-context";\nimport { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";\n',
    "engine character import",
  );
  source = replaceOnce(
    source,
    '  "한 문단 안에서도 사용자가 먼저 자기 관계를 떠올릴 수 있게 장면을 제시한 뒤, 일주·일간·일지·오행 균형·천간/지지 상호작용 중 실제 payload에 있는 근거를 뒤에 붙이세요.",\n',
    '  "한 문단 안에서도 사용자가 먼저 자기 관계를 떠올릴 수 있게 장면을 제시한 뒤, 일주·일간·일지·오행 균형·천간/지지 상호작용 중 실제 payload에 있는 근거를 뒤에 붙이세요.",\n  "일주 캐릭터는 보조 편집 렌즈입니다. 캐릭터의 제목·관계 단서는 CH0~CH2에서 설명을 쉽게 만드는 데만 사용하고, 전체 궁합 점수·합충·용신·미래 시기·상대의 숨은 심리를 새로 판단하거나 기존 계산 근거를 덮어쓰는 근거로 쓰지 마세요.",\n',
    "character editorial rule",
  );
  source = replaceOnce(
    source,
    '  const person = (value: PaidReportFacts["A"]) => ({\n    birthTimeKnown: value.birthTimeKnown,\n    dayPillar: value.pillars.day,\n  });\n',
    '  const person = (value: PaidReportFacts["A"]) => {\n    const dayPillarCharacter = getDayPillarCharacter(value.pillars.day.korean);\n    return {\n      birthTimeKnown: value.birthTimeKnown,\n      dayPillar: value.pillars.day,\n      dayPillarCharacter: dayPillarCharacter ? {\n        title: dayPillarCharacter.title,\n        tagline: dayPillarCharacter.tagline,\n        strengths: dayPillarCharacter.strengths,\n        watchOut: dayPillarCharacter.watchOut,\n        relationshipCue: dayPillarCharacter.relationshipCue,\n      } : null,\n    };\n  };\n',
    "editorial facts character payload",
  );
  return source;
});

patch("src/app/report-extra.css", (source) => {
  if (source.includes(".day-pillar-character-grid")) return source;
  return `${source}\n\n/* P4-3 · 60일주 캐릭터 */\n.day-pillar-character-section { margin: 32px 0; }\n.day-pillar-character-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }\n.day-pillar-character-card { position: relative; overflow: hidden; border: 1px solid rgba(87, 108, 90, .18); border-radius: 22px; padding: 22px; background: linear-gradient(145deg, rgba(248, 246, 236, .98), rgba(232, 240, 228, .96)); box-shadow: 0 14px 36px rgba(49, 66, 52, .08); }\n.day-pillar-character-card::after { content: "✦"; position: absolute; right: 18px; top: 14px; font-size: 28px; opacity: .12; }\n.day-pillar-character-card__eyebrow { display: flex; justify-content: space-between; gap: 12px; align-items: center; font-size: 12px; letter-spacing: .04em; color: rgba(45, 68, 49, .7); }\n.day-pillar-character-card__eyebrow strong { font-weight: 700; }\n.day-pillar-character-card__name { margin: 20px 0 6px; font-size: 13px; color: rgba(34, 52, 38, .68); }\n.day-pillar-character-card h3 { margin: 0; font-size: clamp(20px, 3vw, 28px); line-height: 1.3; color: #233828; }\n.day-pillar-character-card__tagline { margin: 14px 0 18px; line-height: 1.7; color: #405747; }\n.day-pillar-character-card__clues { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }\n.day-pillar-character-card__clues div { padding: 12px; border-radius: 14px; background: rgba(255,255,255,.52); }\n.day-pillar-character-card__clues small { display: block; margin-bottom: 6px; font-weight: 700; color: #607765; }\n.day-pillar-character-card__clues p { margin: 0; line-height: 1.55; font-size: 14px; }\n.day-pillar-character-card__watch { margin: 16px 0 0; padding-top: 14px; border-top: 1px solid rgba(73, 94, 77, .14); line-height: 1.6; font-size: 14px; }\n.day-pillar-character-card__watch strong { display: block; margin-bottom: 3px; color: #36533d; }\n@media (max-width: 700px) { .day-pillar-character-grid { grid-template-columns: 1fr; } .day-pillar-character-card { padding: 18px; border-radius: 18px; } .day-pillar-character-card__clues { grid-template-columns: 1fr; } }\n`;
});

patch("package.json", (source) => {
  if (source.includes('"test:report:day-pillar-characters"')) return source;
  return source.replace(
    '    "test:report:share-card": "tsx scripts/report-share-card-contract-test.ts"\n',
    '    "test:report:share-card": "tsx scripts/report-share-card-contract-test.ts",\n    "test:report:day-pillar-characters": "tsx scripts/report-day-pillar-character-contract-test.ts"\n',
  );
});

patch(".github/workflows/manse-validation.yml", (source) => {
  if (source.includes("test:report:day-pillar-characters")) return source;
  return source.replace(
    "          npm run test:report:share-card\n",
    "          npm run test:report:share-card\n          npm run test:report:day-pillar-characters\n",
  );
});

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".ts") || path.endsWith(".md")) {
      const before = readFileSync(path, "utf8");
      const after = before.replaceAll("paid-report-v7-editorial-v13-saju-boy-magic-school", "paid-report-v7-editorial-v14-day-pillar-characters");
      if (after !== before) writeFileSync(path, after);
    }
  }
}
walk("scripts");

patch("docs/PROJECT_STATE.md", (source) => {
  source = source.replaceAll("paid-report-v7-editorial-v13-saju-boy-magic-school", "paid-report-v7-editorial-v14-day-pillar-characters");
  if (source.includes("## 2026-08-22 1:1 리포트 P4-3 개선")) return source;
  const marker = "\n## 카카오 완료 알림 구조\n";
  const block = `\n## 2026-08-22 1:1 리포트 P4-3 개선\n\n- 계산된 일주를 기준으로 60갑자 전체를 빠짐없이 커버하는 **60일주 캐릭터** 레이어를 추가했다. 10개 천간의 기본 드라이브와 12개 지지의 관계 장면을 결합하되 유효한 60갑자 조합만 허용한다.\n- 각 캐릭터는 고유한 일주 제목, 한 줄 캐릭터 설명, 잘 쓰는 힘, 주의점, 관계 단서를 가진다. 이는 성격 진단이나 새로운 사주 계산이 아니라 일주를 쉽게 읽게 하는 편집 레이어다.\n- 1:1 결과 화면에서 두 사람의 캐릭터 카드를 보여주고, AI 비식별 편집 payload에도 캐릭터 요약을 연결했다.\n- AI는 캐릭터를 CH0~CH2 설명 보조에만 쓸 수 있으며 전체 궁합 점수·합충·용신·미래 시기·숨은 심리 판단을 덮어쓸 수 없다.\n- 프롬프트 버전은 \`paid-report-v7-editorial-v14-day-pillar-characters\`이며, 60개 전수·유일성·UI/payload 연결을 검증하는 \`test:report:day-pillar-characters\`를 Core validation에 추가했다.\n`;
  if (!source.includes(marker)) throw new Error("PROJECT_STATE marker missing");
  return source.replace(marker, `${block}${marker}`);
});

patch("docs/NEXT_TASK.md", (source) => {
  source = source.replace("  - [ ] P4-3: 60일주 캐릭터 체계와 리포트 연결 규칙 구현.", "  - [x] P4-3: 60갑자 전체 캐릭터 체계 + 결과 UI + AI 보조 편집 payload 연결. 캐릭터는 계산값을 덮어쓰지 않는 보조 렌즈로 제한.");
  const start = source.indexOf("## Current HANDOFF");
  if (start < 0) throw new Error("HANDOFF missing");
  return source.slice(0, start) + `## Current HANDOFF\n\n\`\`\`text\nHANDOFF\n- Worker: GPT\n- Task: P4-3 — 60일주 캐릭터 체계 + 결과/AI 편집 연결\n- Status: complete\n- Validation: test:report:day-pillar-characters + 기존 P1~P4 회귀 + Core validation + lint + production build\n- Commit: clean PR 검증 후 main squash merge SHA 기준\n- Remaining: 1:N 순번형 제목 개선 → 1:N 직관적 관계 언어 개선; 외부 SOLAPI/Kakao 설정은 운영 작업으로 유지\n- Risk: 캐릭터는 일주 기반 보조 편집 레이어이며 궁합 점수·합충·용신·미래·숨은 심리를 새로 계산하거나 덮어쓰지 않음\n\`\`\`\n`;
});

patch("docs/DECISIONS.md", (source) => {
  if (source.includes("60일주 캐릭터는")) return source;
  return source.replace(
    "- 1:1의 **궁합 유형**은 AI가 새 판단을 만드는 기능이 아니라 기존 서버 계산 snapshot의 점수·차원값을 결정론적으로 요약한 편집 레이어다.\n",
    "- 1:1의 **궁합 유형**은 AI가 새 판단을 만드는 기능이 아니라 기존 서버 계산 snapshot의 점수·차원값을 결정론적으로 요약한 편집 레이어다.\n- **60일주 캐릭터**는 계산된 일주를 사용자가 쉽게 이해하도록 번역하는 보조 편집 레이어다. 60갑자를 모두 커버하되 캐릭터 문구가 전체 궁합 점수, 합충, 용신, 미래 시기, 상대의 숨은 심리를 새로 결정하거나 기존 계산을 덮어쓰지 않는다. AI는 CH0~CH2의 쉬운 설명에 제한적으로 활용한다.\n",
  );
});
