import { readFileSync, writeFileSync } from "node:fs";

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

const directLabels = `export const DIMENSION_LABELS: Record<CompatibilityDimension, string> = {
  dayMaster: "대화 템포",
  dayBranch: "생활 리듬",
  usefulGodFit: "편안함·회복",
  elementComplementarity: "역할 보완",
  heavenlyStemInteraction: "연락·표현 호흡",
  earthlyBranchInteraction: "생활 속 갈등",
  specialStars: "도움·신뢰",
  spouseStarRealization: "애정 표현·관계 역할",
  luckCycleAlignment: "장기관계 방향",
};`;

const directGuides = `const DIMENSION_GUIDES: Record<CompatibilityDimension, {
  strength: string;
  caution: string;
  action: string;
}> = {
  dayMaster: {
    strength: "대화할 때 반응 속도와 결론을 내리는 방식이 자연스럽게 이어져요.",
    caution: "의견이 갈릴 때 서로 결론을 재촉하면 말이 짧아지고 오해가 커질 수 있어요.",
    action: "중요한 선택 전에는 각자 가장 중요한 기준을 한 문장씩 먼저 말해 보세요.",
  },
  dayBranch: {
    strength: "연락 간격, 약속 시간, 쉬는 방식 같은 생활 리듬을 맞추기 쉬운 편이에요.",
    caution: "연락이나 약속의 작은 차이를 오래 참으면 뒤늦게 서운함이 커질 수 있어요.",
    action: "연락 빈도와 약속에서 꼭 지켜줬으면 하는 기준을 하나씩 말해 보세요.",
  },
  usefulGodFit: {
    strength: "한쪽이 지치거나 예민할 때 다른 쪽이 분위기를 안정시키는 역할을 하기 쉬워요.",
    caution: "챙겨주는 행동도 상대가 원하지 않을 때는 간섭처럼 느껴질 수 있어요.",
    action: "힘들 때 듣고 싶은 말과 받고 싶은 도움을 서로 먼저 물어보세요.",
  },
  elementComplementarity: {
    strength: "역할을 나눌 때 서로 다른 장점을 맡아 빈틈을 메우기 쉬워요.",
    caution: "잘하는 방식이 다르다는 이유로 상대의 방식을 틀렸다고 판단하지 않는 게 중요해요.",
    action: "함께 할 일이 생기면 누가 무엇을 맡을지와 완료 기준을 먼저 정해 보세요.",
  },
  heavenlyStemInteraction: {
    strength: "연락 빈도, 답장 속도, 감정이나 의견을 표현하는 방식이 잘 맞는 편이에요.",
    caution: "말투나 답장 속도가 다르면 의도보다 태도를 먼저 문제 삼을 수 있어요.",
    action: "민감한 이야기는 긴 메신저 대신 짧은 통화나 대면으로 확인해 보세요.",
  },
  earthlyBranchInteraction: {
    strength: "약속 시간, 정리 습관, 쉬는 방식 같은 반복되는 생활 장면에서 맞추기 쉬워요.",
    caution: "생활 습관의 작은 차이를 방치하면 같은 문제로 계속 부딪힐 수 있어요.",
    action: "자주 부딪히는 생활 장면 하나를 골라 서로 지킬 기준을 정해 보세요.",
  },
  specialStars: {
    strength: "힘든 일이 생겼을 때 실제로 도와주거나 믿고 맡길 수 있는 장면이 생기기 쉬워요.",
    caution: "좋은 첫인상보다 약속을 지키고 실제로 돕는 행동을 더 중요하게 보세요.",
    action: "최근 서로에게 실제 도움이 됐던 행동 한 가지를 떠올려 보세요.",
  },
  spouseStarRealization: {
    strength: "연락, 데이트, 애정 표현, 관계에서 맡는 역할에 대한 기대가 맞물리기 쉬워요.",
    caution: "표현 방식이 다르면 애정의 크기보다 방식 차이 때문에 서운해질 수 있어요.",
    action: "연락·데이트·표현 중 나에게 가장 중요한 한 가지를 서로 말해 보세요.",
  },
  luckCycleAlignment: {
    strength: "생활 변화나 장기 계획을 함께 맞춰 갈 때 방향을 조율하기 쉬운 편이에요.",
    caution: "지금의 좋은 점수만으로 미래의 관계 결과나 시기를 확정할 수는 없어요.",
    action: "앞으로 3개월 동안 함께 지키고 싶은 일정이나 계획 하나를 정해 보세요.",
  },
};`;

patch("src/lib/compatibility/one-to-many-view.ts", (source) => {
  source = source.replace('export const ONE_TO_MANY_VIEW_VERSION = "one-to-many-view-v1.1.0" as const;', 'export const ONE_TO_MANY_VIEW_VERSION = "one-to-many-view-v1.2.0" as const;');
  source = source.replace(/export const DIMENSION_LABELS:[\s\S]*?\n};\n\nconst DIMENSION_GUIDES/, `${directLabels}\n\nconst DIMENSION_GUIDES`);
  source = source.replace(/const DIMENSION_GUIDES:[\s\S]*?\n};\n\nexport const SUMMARY_METRIC_IDS/, `${directGuides}\n\nexport const SUMMARY_METRIC_IDS`);
  source = source.replace('if (profile === "romance") return { label: "연애 호흡", description: "끌림과 생활 리듬, 관계 역할의 조화를 함께 봐요." };', 'if (profile === "romance") return { label: "연애 템포", description: "연락 빈도, 애정 표현, 데이트와 생활 리듬이 얼마나 잘 맞는지 봐요." };');
  source = source.replace('if (profile === "friend") return { label: "우정의 편안함", description: "기본 호흡과 보완성, 서로 돕는 신호를 함께 봐요." };', 'if (profile === "friend") return { label: "우정 신뢰", description: "연락 간격, 함께 있을 때의 편안함, 실제로 서로 돕는 힘을 봐요." };');
  source = source.replace('return { label: "협업 적합도", description: "업무 호흡과 역할 보완, 소통·마찰 신호를 함께 봐요." };', 'return { label: "협업 신뢰", description: "소통 속도, 역할 분담, 의견 충돌 뒤 조율이 얼마나 잘 되는지 봐요." };');
  source = source.replace('["overall", "종합 궁합", "관계 유형별 9개 항목의 가중 점수를 합산한 결과예요."],', '["overall", "전체 관계 궁합", "연락·생활·갈등·신뢰·장기관계를 포함한 9개 기준의 종합 결과예요."],');
  source = source.replace('["communication", "소통 궁합", "기본 반응과 겉으로 드러나는 표현의 호흡을 봐요."],', '["communication", "연락·대화", "연락 빈도, 답장 속도, 대화할 때 반응과 표현 방식이 잘 맞는지 봐요."],');
  source = source.replace('["emotionalStability", "정서 안정", "가까워진 뒤의 리듬과 필요한 기운의 보완을 봐요."],', '["emotionalStability", "편안함·신뢰", "가까워진 뒤 생활 리듬이 편한지, 힘들 때 서로 안정감을 주는지 봐요."],');
  source = source.replace('["conflictManagement", "갈등 관리", "표현의 긴장과 반복 마찰을 조율하기 쉬운지 봐요."],', '["conflictManagement", "갈등 회복", "말다툼이나 생활 마찰이 생긴 뒤 다시 대화하고 기준을 맞추기 쉬운지 봐요."],');
  source = source.replace('["longTerm", "지속성", "서로의 균형과 장기 방향을 안정적으로 맞출 여지를 봐요."],', '["longTerm", "생활·장기관계", "생활 습관과 역할을 맞추고 장기 계획을 함께 조율하기 쉬운지 봐요."],');
  source = source.replace('function recommendationReason(basis: SituationalRecommendation["basis"]) {', 'function recommendationReason(basis: SituationalRecommendation["basis"], label: string) {');
  source = source.replace('if (basis === "SINGLE") return "이 상황의 관련 지표에서 가장 높은 점수를 보였어요.";', 'if (basis === "SINGLE") return `${label} 기준에서 가장 안정적으로 높은 점수를 보였어요.`;');
  source = source.replace('if (basis === "WITHIN_TWO_POINTS") return "관련 지표 차이가 2점 이내라 한 명으로 단정하지 않았어요.";', 'if (basis === "WITHIN_TWO_POINTS") return `${label} 점수 차이가 2점 이내라 한 명만 더 낫다고 단정하지 않았어요.`;');
  source = source.replace('if (basis === "UNCERTAINTY_OVERLAP") return "출생시간 변수에 따른 점수 범위가 겹쳐 공동으로 보는 편이 안전해요.";', 'if (basis === "UNCERTAINTY_OVERLAP") return `${label}에서 출생시간 변수에 따른 점수 범위가 겹쳐 공동 추천으로 봤어요.`;');
  source = source.replace('return "관련 지표 차이가 작고 출생시간 변수에 따른 범위도 겹쳐 공동으로 추천해요.";', 'return `${label} 점수 차이가 작고 출생시간 변수에 따른 범위도 겹쳐 공동으로 추천해요.`;');
  source = source.replace('summary: narrative?.rankingSummary.summary ?? `같은 ${RELATIONSHIP_LABELS[snapshot.relationshipType]} 기준으로 ${snapshot.candidateCount}명을 비교했어요. 종합 순위만 보지 않고 소통, 정서 안정, 갈등 관리, 지속성과 관계 목적별 강점을 함께 확인해 보세요.`,', 'summary: narrative?.rankingSummary.summary ?? `같은 ${RELATIONSHIP_LABELS[snapshot.relationshipType]} 기준으로 ${snapshot.candidateCount}명을 비교했어요. 종합 순위뿐 아니라 연락·대화, 편안함·신뢰, 갈등 회복, 생활·장기관계까지 같이 확인해 보세요.`,');
  source = source.replace('reason: narrative?.situationalRecommendations[recommendation.id].reason ?? recommendationReason(recommendation.basis),', 'reason: narrative?.situationalRecommendations[recommendation.id].reason ?? recommendationReason(recommendation.basis, recommendation.label),');
  return source;
});

patch("src/components/one-to-many-result.tsx", (source) => {
  source = source.replace('        <section className="comparison-section" aria-labelledby="summary-metrics-title">\n          <div className="comparison-section-heading">\n            <p className="card-label">쉬운 비교</p>\n            <h2 id="summary-metrics-title">관계에서 체감할 핵심 지표</h2>\n            <p>명리 9개 항목을 관계에서 이해하기 쉬운 6개 관점으로 묶었어요.</p>', '        <section className="comparison-section" aria-labelledby="summary-metrics-title">\n          <div className="comparison-section-heading">\n            <p className="card-label">쉬운 비교</p>\n            <h2 id="summary-metrics-title">연락부터 장기관계까지 한눈에</h2>\n            <p>연락·대화, 편안함·신뢰, 갈등 회복, 생활·장기관계를 같은 기준으로 비교했어요.</p>');
  source = source.replace('<h2 id="situations-title">한 명의 승자보다, 상황에 맞는 관계</h2>', '<h2 id="situations-title">연락·갈등·장기관계, 누구와 더 편한가</h2>');
  source = source.replace('<h2 id="candidate-insights-title">잘 맞는 지점과 조율할 지점</h2>\n            <p>각 후보의 상대적 강점과 주의점을 실제 행동으로 연결했어요.</p>', '<h2 id="candidate-insights-title">실제 관계에서 잘 맞는 장면과 부딪힐 장면</h2>\n            <p>연락, 약속, 생활 습관, 갈등 뒤 대화처럼 실제로 겪을 장면으로 풀었어요.</p>');
  source = source.replace('<strong id="detail-score-title">명리 9개 항목 상세 점수</strong>', '<strong id="detail-score-title">관계 9개 기준 상세 점수</strong>');
  source = source.replace('<caption>후보별 명리 9개 항목 정규화 점수</caption>', '<caption>후보별 연락·생활·갈등·신뢰·장기관계 관련 9개 기준 점수</caption>');
  return source;
});

patch("src/lib/narrative/one-to-many-report-engine.ts", (source) => {
  source = source.replaceAll('one-to-many-report-v2-semantic-titles', 'one-to-many-report-v3-direct-relationship-language');
  source = source.replace(/const DIMENSION_LABELS:[\s\S]*?\n};\n\nconst STRING_ARRAY/, `${directLabels.replace('export const ', 'const ')}\n\nconst STRING_ARRAY`);
  source = replaceOnce(
    source,
    '  "사주 용어를 쓰면 바로 쉬운 의미를 덧붙이고, 일반론만 반복하지 마세요. 각 후보의 강점·주의점·팁은 입력된 차이를 최소 하나 반영해야 합니다.",\n',
    '  "사용자가 바로 떠올릴 수 있는 생활 장면을 먼저 쓰세요. 연락 빈도·답장 속도·대화 방식·약속·생활 습관·서운함과 갈등 뒤 회복·신뢰·역할 분담·장기 계획 중 관련된 장면을 최소 하나 포함하세요.",\n  "기운의 호흡, 오행 상보성, 천간의 결속, 지지의 마찰, 대운 동조 같은 추상 명리 표현을 결론으로 그대로 내놓지 마세요. 필요한 경우 뒤에서 근거로 짧게 설명하고, 앞문장은 연락·갈등·신뢰·생활·장기관계 같은 일상 언어로 번역하세요.",\n  "각 후보의 강점·주의점·팁은 입력된 차이를 최소 하나 반영하고, 사용자가 실제로 할 수 있는 확인 행동까지 이어지게 쓰세요.",\n',
    "direct relationship language rules",
  );
  source = source.replace('- situationalRecommendations: 소통·정서 안정·장기 지속·갈등 관리·관계 목적별로 서버가 준 candidateIds를 그대로 복사하고, 공동 추천이면 모든 후보가 해당되는 이유와 확인 행동을 2~3문장으로 쓰세요.', '- situationalRecommendations: 연락·대화, 편안함·신뢰, 생활·장기관계, 갈등 회복, 관계 목적별로 서버가 준 candidateIds를 그대로 복사하고, 공동 추천이면 모든 후보가 해당되는 현실 장면과 확인 행동을 2~3문장으로 쓰세요.');
  return source;
});

patch("scripts/day15-one-to-many-narrative-boundary-test.ts", (source) => {
  source = source.replace('assert.equal(ONE_TO_MANY_REPORT_PROMPT_VERSION, "one-to-many-report-v2-semantic-titles");', 'assert.equal(ONE_TO_MANY_REPORT_PROMPT_VERSION, "one-to-many-report-v3-direct-relationship-language");');
  if (!source.includes('연락 빈도·답장 속도')) {
    source = source.replace('assert.match(engineSource, /ONE_TO_MANY_REPORT_PROMPT_VERSION/);\n', 'assert.match(engineSource, /ONE_TO_MANY_REPORT_PROMPT_VERSION/);\nassert.match(engineSource, /연락 빈도·답장 속도/);\nassert.match(engineSource, /갈등 뒤 회복/);\nassert.match(engineSource, /장기 계획/);\n');
  }
  return source;
});

patch("scripts/day15-one-to-many-result-ui-test.ts", (source) => {
  if (!source.includes('연락부터 장기관계까지 한눈에')) {
    source = source.replace('assert.match(resultSource, /한눈에 보는 순위/);\n', 'assert.match(resultSource, /한눈에 보는 순위/);\nassert.match(resultSource, /연락부터 장기관계까지 한눈에/);\nassert.match(resultSource, /실제 관계에서 잘 맞는 장면과 부딪힐 장면/);\nassert.match(resultSource, /관계 9개 기준 상세 점수/);\n');
    source = source.replace('assert.equal(view.recommendations.some((recommendation) => recommendation.shared), true);\n', 'assert.equal(view.recommendations.some((recommendation) => recommendation.shared), true);\nassert.deepEqual(view.summaryMetrics.slice(0, 5).map((metric) => metric.label), ["전체 관계 궁합", "연락·대화", "편안함·신뢰", "갈등 회복", "생활·장기관계"]);\nfor (const oldLabel of ["기본 기운의 호흡", "오행 상보성", "천간의 결속과 긴장", "지지의 결속과 마찰", "대운 동조"]) {\n  assert.equal(JSON.stringify(view).includes(oldLabel), false, `사용자 뷰에 추상 명리 라벨이 남으면 안 됩니다: ${oldLabel}`);\n}\n');
  }
  return source;
});

patch("docs/PROJECT_STATE.md", (source) => {
  source = source.replace('- 1:N: 순번형 명명을 후보 이름/의미형 제목으로 변경.\n- 1:N: 추상 표현을 연락·갈등·신뢰·생활·장기관계 등 직관적 언어로 변경.\n', '- 1:N 서술/표시 신뢰도 개선 후속 2건 완료: 순번형 명명 제거 + 연락·갈등·신뢰·생활·장기관계 중심의 직관적 언어 적용.\n');
  if (source.includes('## 2026-08-22 1:N 직관적 관계 언어 개선')) return source;
  const marker = '\n## 출시 blocker 정의\n';
  const block = `\n## 2026-08-22 1:N 직관적 관계 언어 개선\n\n- 1:N 사용자 노출 차원명을 추상 명리 용어 대신 실제 관계 장면으로 번역했다. 예: \`천간의 결속과 긴장\` → **연락·표현 호흡**, \`지지의 결속과 마찰\` → **생활 속 갈등**, \`대운 동조\` → **장기관계 방향**.\n- 핵심 비교 축도 **연락·대화 / 편안함·신뢰 / 갈등 회복 / 생활·장기관계** 중심으로 재정리했다. 계산 키와 점수 공식은 변경하지 않았다.\n- 후보별 기본 설명과 행동 팁을 연락 간격, 답장 속도, 약속, 생활 습관, 갈등 뒤 대화, 실제 도움, 역할 분담, 장기 계획 같은 현실 장면으로 수정했다.\n- 1:N AI 프롬프트를 \`one-to-many-report-v3-direct-relationship-language\`로 올리고, 추상 명리 표현은 근거 설명에만 제한적으로 쓰며 결론은 현실 장면 언어로 먼저 쓰도록 했다.\n`;
  if (!source.includes(marker)) throw new Error('PROJECT_STATE marker missing');
  return source.replace(marker, `${block}${marker}`);
});

patch("docs/NEXT_TASK.md", (source) => {
  source = source.replace('  - [ ] 후속: 1:N 추상 표현을 연락·갈등·신뢰·생활·장기관계 등 직관적 언어로 변경.', '  - [x] 후속: 1:N 추상 표현을 연락·갈등·신뢰·생활·장기관계 중심의 직관적 언어로 변경. 계산 키/점수는 유지하고 사용자 라벨·기본 카피·AI 프롬프트만 개선.');
  const start = source.indexOf('## Current HANDOFF');
  if (start < 0) throw new Error('HANDOFF missing');
  return source.slice(0, start) + `## Current HANDOFF\n\n\`\`\`text\nHANDOFF\n- Worker: GPT\n- Task: 1:N 추상 표현 → 연락·갈등·신뢰·생활·장기관계 중심 직관적 언어 개선\n- Status: complete\n- Validation: day15 1:N narrative/result UI + day16 paid E2E + Core validation + lint + production build\n- Commit: clean PR 검증 후 main squash merge SHA 기준\n- Remaining: 외부 SOLAPI/Kakao 설정은 운영 작업으로 유지; 코드 측 다음 실행 가능 항목은 360/390/430px 모바일 핵심 플로우 QA\n- Risk: 사용자 라벨/카피/AI 편집 규칙만 변경; 1:N 계산 키·점수·순위·저장 schema·결제 구조는 변경 없음\n\`\`\`\n`;
});

patch("docs/DECISIONS.md", (source) => {
  if (source.includes('1:N 사용자 노출 언어는')) return source;
  return source.replace(
    '- 1:N 비교에서는 `첫 번째/두 번째/세 번째`, `강점 1/2/3` 같은 순번형 명명을 피하고 후보 이름 또는 의미가 드러나는 제목을 사용한다.\n',
    '- 1:N 비교에서는 `첫 번째/두 번째/세 번째`, `강점 1/2/3` 같은 순번형 명명을 피하고 후보 이름 또는 의미가 드러나는 제목을 사용한다.\n- 1:N 사용자 노출 언어는 추상 명리 용어보다 **연락·대화 / 갈등과 회복 / 신뢰 / 생활 리듬 / 장기관계**처럼 실제 관계에서 체감하는 장면을 우선한다. 명리 용어가 필요하면 뒤에서 근거로 짧게 설명한다.\n',
  );
  return source;
});
