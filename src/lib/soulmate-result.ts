import { scoreDayBranchCompatibility } from "@/lib/compatibility/day-branch";
import { scoreDayMasterCompatibility } from "@/lib/compatibility/day-master";
import type { FiveElement, YinYang } from "@/lib/compatibility/types";
import { buildUsefulGodPreparationEvidence } from "@/lib/compatibility/useful-god-evidence";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import type { ManseCalculationSnapshot, MansePillar } from "@/lib/manseryeok/types";
import type { PersonBirthInput } from "@/lib/report-input";
import type { SoulmateResult } from "@/lib/soulmate-result-contract";

const ELEMENT_LABEL: Record<FiveElement, string> = {
  wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)",
};

const STEMS = [
  { stem: "갑", hanja: "甲", element: "wood" as const, yinYang: "yang" as const },
  { stem: "을", hanja: "乙", element: "wood" as const, yinYang: "yin" as const },
  { stem: "병", hanja: "丙", element: "fire" as const, yinYang: "yang" as const },
  { stem: "정", hanja: "丁", element: "fire" as const, yinYang: "yin" as const },
  { stem: "무", hanja: "戊", element: "earth" as const, yinYang: "yang" as const },
  { stem: "기", hanja: "己", element: "earth" as const, yinYang: "yin" as const },
  { stem: "경", hanja: "庚", element: "metal" as const, yinYang: "yang" as const },
  { stem: "신", hanja: "辛", element: "metal" as const, yinYang: "yin" as const },
  { stem: "임", hanja: "壬", element: "water" as const, yinYang: "yang" as const },
  { stem: "계", hanja: "癸", element: "water" as const, yinYang: "yin" as const },
];

const BRANCHES = [
  { branch: "자", hanja: "子", element: "water" as const },
  { branch: "축", hanja: "丑", element: "earth" as const },
  { branch: "인", hanja: "寅", element: "wood" as const },
  { branch: "묘", hanja: "卯", element: "wood" as const },
  { branch: "진", hanja: "辰", element: "earth" as const },
  { branch: "사", hanja: "巳", element: "fire" as const },
  { branch: "오", hanja: "午", element: "fire" as const },
  { branch: "미", hanja: "未", element: "earth" as const },
  { branch: "신", hanja: "申", element: "metal" as const },
  { branch: "유", hanja: "酉", element: "metal" as const },
  { branch: "술", hanja: "戌", element: "earth" as const },
  { branch: "해", hanja: "亥", element: "water" as const },
];

const STEM_TRAITS: Record<string, { keywords: string[]; strength: string; complement: string }> = {
  갑: { keywords: ["곧은 추진력", "성장 지향", "책임감"], strength: "방향을 잡으면 꾸준히 밀고 가며 관계에서도 기준과 책임을 분명히 하려는 힘이 있습니다.", complement: "속도를 부드럽게 조율해 주고 감정을 세밀하게 읽어 주는 기운이 더해지면 관계의 폭이 넓어집니다." },
  을: { keywords: ["유연함", "관찰력", "관계 감각"], strength: "상황을 읽고 유연하게 움직이며 상대의 반응을 섬세하게 살피는 힘이 있습니다.", complement: "결정을 미루지 않도록 방향을 잡아 주고 안정적으로 받쳐 주는 기운이 더해지면 편안합니다." },
  병: { keywords: ["표현력", "활력", "직진성"], strength: "감정과 의사를 비교적 분명하게 드러내고 관계에 활력을 넣는 힘이 있습니다.", complement: "과열될 때 속도를 낮춰 주고 차분하게 정리해 주는 기운이 더해지면 오래 가기 쉽습니다." },
  정: { keywords: ["세심함", "온기", "집중력"], strength: "작은 신호를 잘 읽고 가까운 사람에게 꾸준히 온기를 전달하는 힘이 있습니다.", complement: "혼자 오래 고민하지 않도록 안정적인 반응과 분명한 확신을 주는 기운이 도움이 됩니다." },
  무: { keywords: ["안정감", "책임감", "버팀목"], strength: "관계의 중심을 잡고 쉽게 흔들리지 않으며 약속을 지키려는 힘이 큽니다.", complement: "고정된 방식에 머물지 않도록 유연함과 새로운 자극을 주는 기운이 더해지면 좋습니다." },
  기: { keywords: ["배려", "현실감", "돌봄"], strength: "상대의 필요를 실용적으로 챙기고 관계를 세심하게 관리하는 힘이 있습니다.", complement: "과도하게 맞춰 주지 않도록 자기표현을 북돋고 방향을 선명하게 잡아 주는 기운이 좋습니다." },
  경: { keywords: ["결단력", "원칙", "실행력"], strength: "문제를 분명하게 보고 빠르게 정리하며 관계에서도 기준을 세우는 힘이 있습니다.", complement: "말의 강도를 부드럽게 낮추고 감정의 여백을 만들어 주는 기운이 더해지면 균형이 좋아집니다." },
  신: { keywords: ["정교함", "기준", "섬세함"], strength: "관계의 작은 차이를 잘 알아차리고 완성도와 신뢰를 중요하게 여기는 힘이 있습니다.", complement: "완벽함보다 과정의 편안함을 느끼게 해 주는 따뜻하고 여유로운 기운이 도움이 됩니다." },
  임: { keywords: ["포용력", "적응력", "확장성"], strength: "상황 변화에 유연하고 상대의 여러 면을 받아들이며 관계의 가능성을 넓히는 힘이 있습니다.", complement: "흐름이 너무 넓어지지 않도록 현실적인 기준과 일관성을 잡아 주는 기운이 좋습니다." },
  계: { keywords: ["공감력", "직관", "세밀함"], strength: "작은 감정 변화와 분위기를 빠르게 읽고 깊이 공감하는 힘이 있습니다.", complement: "생각이 안으로만 흐르지 않도록 표현을 끌어내고 안정감을 주는 기운이 더해지면 편안합니다." },
};

const BRANCH_ELEMENT: Record<string, FiveElement> = Object.fromEntries(BRANCHES.map((item) => [item.branch, item.element])) as Record<string, FiveElement>;
const STEM_META = Object.fromEntries(STEMS.map((item) => [item.stem, item])) as Record<string, (typeof STEMS)[number]>;
const HANJA_STEM = Object.fromEntries(STEMS.map((item) => [item.stem, item.hanja])) as Record<string, string>;
const HANJA_BRANCH = Object.fromEntries(BRANCHES.map((item) => [item.branch, item.hanja])) as Record<string, string>;

function round2(value: number) { return Math.round(value * 100) / 100; }

function pillarView(key: "year" | "month" | "day" | "hour", label: "년주" | "월주" | "일주" | "시주", pillar: MansePillar | null) {
  return {
    key, label,
    stem: pillar?.heavenlyStem ?? null,
    stemHanja: pillar ? HANJA_STEM[pillar.heavenlyStem] ?? pillar.hanja.slice(0, 1) : null,
    branch: pillar?.earthlyBranch ?? null,
    branchHanja: pillar ? HANJA_BRANCH[pillar.earthlyBranch] ?? pillar.hanja.slice(1, 2) : null,
  };
}

function weightedElements(person: PersonBirthInput, snapshot: ManseCalculationSnapshot) {
  const evidence = buildUsefulGodPreparationEvidence(person, snapshot);
  const weights = {} as Record<FiveElement, number>;
  (Object.keys(ELEMENT_LABEL) as FiveElement[]).forEach((element) => {
    weights[element] = round2(
      evidence.elementOccurrences.visibleStems[element]
      + evidence.elementOccurrences.branchSurface[element] * 0.7
      + evidence.elementOccurrences.hiddenStems[element] * 0.25,
    );
  });
  return weights;
}

function yinYangBalance(snapshot: ManseCalculationSnapshot) {
  let yang = 0;
  let yin = 0;
  (Object.values(snapshot.yinYang) as Array<{ stem: string; branch: string } | null>).forEach((entry) => {
    if (!entry) return;
    if (entry.stem === "양") yang += 1; else yin += 1;
    if (entry.branch === "양") yang += 1; else yin += 1;
  });
  const diff = Math.abs(yang - yin);
  return { yang, yin, label: diff <= 1 ? "균형형" : yang > yin ? "양 기운이 조금 강한 편" : "음 기운이 조금 강한 편" };
}

function relationLabel(relation: ReturnType<typeof scoreDayMasterCompatibility>) {
  if (relation.relation === "GENERATES" && relation.direction === "B_TO_A") return "상대가 내 기운을 받쳐주는 생조 관계";
  if (relation.relation === "GENERATES" && relation.direction === "A_TO_B") return "내 기운이 상대에게 자연스럽게 이어지는 생조 관계";
  if (relation.relation === "SAME_ELEMENT") return "같은 오행의 결을 공유하는 관계";
  return "긴장과 자극이 생길 수 있는 극 관계";
}

function rankStems(userStem: string, weights: Record<FiveElement, number>) {
  const maxWeight = Math.max(...Object.values(weights), 1);
  const minWeight = Math.min(...Object.values(weights));
  const orderedElements = (Object.keys(weights) as FiveElement[]).sort((a, b) => weights[a] - weights[b]);
  const preferred = new Set(orderedElements.slice(0, 2));

  return STEMS.map((candidate) => {
    const relation = scoreDayMasterCompatibility(userStem, candidate.stem, "romance");
    const deficiency = ((maxWeight - weights[candidate.element]) / maxWeight) * 22;
    const relationPoints = relation.normalizedScore === 85 ? 32 : relation.normalizedScore === 70 ? 18 : 0;
    const polarityPoints = relation.polarityRelation === "OPPOSITE" ? 6 : 0;
    const preferredPoints = preferred.has(candidate.element) ? 9 : 0;
    const overSupplyPenalty = weights[candidate.element] >= maxWeight && maxWeight - minWeight >= 1.2 ? 5 : 0;
    return { candidate, relation, score: relationPoints + deficiency + polarityPoints + preferredPoints - overSupplyPenalty };
  }).sort((a, b) => b.score - a.score || STEMS.indexOf(a.candidate) - STEMS.indexOf(b.candidate));
}

function pickRecommendationCount(ranked: ReturnType<typeof rankStems>) {
  if (ranked.length < 3) return ranked.length;
  return ranked[2].score >= ranked[0].score - 14 ? 3 : 2;
}

function rankBranches(userBranch: string, weights: Record<FiveElement, number>) {
  const maxWeight = Math.max(...Object.values(weights), 1);
  return BRANCHES.map((candidate) => {
    const relation = scoreDayBranchCompatibility(userBranch, candidate.branch, "romance");
    const deficiency = ((maxWeight - weights[candidate.element]) / maxWeight) * 18;
    const relationPoints = relation.normalizedScore === 90 ? 35 : relation.normalizedScore === 70 ? 22 : relation.normalizedScore === 60 ? 6 : 0;
    return { candidate, relation, score: relationPoints + deficiency };
  }).sort((a, b) => b.score - a.score);
}

function recommendationReason(
  candidate: (typeof STEMS)[number],
  relation: ReturnType<typeof scoreDayMasterCompatibility>,
  weights: Record<FiveElement, number>,
  lowElements: FiveElement[],
) {
  const reasons: string[] = [relationLabel(relation)];
  if (lowElements.includes(candidate.element)) reasons.push(`내 원국에서 상대적으로 적은 ${ELEMENT_LABEL[candidate.element]} 기운을 보완하는 방향입니다.`);
  if (relation.polarityRelation === "OPPOSITE") reasons.push("음양이 달라 서로 다른 방식으로 역할을 나누기 쉬운 조합입니다.");
  else reasons.push("비슷한 음양 리듬을 공유해 행동 속도와 반응 방식이 익숙하게 느껴질 수 있습니다.");
  if (weights[candidate.element] === Math.min(...Object.values(weights))) reasons.push(`특히 ${ELEMENT_LABEL[candidate.element]}이 원국에서 가장 적게 드러나 보완 관점의 우선도가 높습니다.`);
  return reasons;
}

function relationshipPattern(stem: string) {
  const copy: Record<string, string> = {
    갑: "관계의 방향을 선명하게 잡고 함께 성장하는 쪽으로 움직이기 쉬운 타입입니다.",
    을: "서로의 기분과 상황을 세밀하게 살피며 부드럽게 맞춰 가는 관계가 되기 쉽습니다.",
    병: "표현과 행동이 빠르고 관계에 활력을 넣어 정체된 분위기를 깨 주기 쉽습니다.",
    정: "감정을 섬세하게 확인하고 작은 배려를 꾸준히 쌓는 관계가 되기 쉽습니다.",
    무: "약속과 생활 리듬을 안정적으로 잡아 주며 오래 가는 기반을 만들기 쉽습니다.",
    기: "현실적인 돌봄과 세심한 배려로 일상에서 편안함을 만들어 주기 쉽습니다.",
    경: "문제를 미루기보다 분명하게 정리하고 서로의 기준을 세우는 관계가 되기 쉽습니다.",
    신: "세밀한 신뢰와 약속을 중요하게 여겨 관계의 완성도를 함께 높이기 쉽습니다.",
    임: "상대의 여러 면을 받아들이고 새로운 경험을 함께 넓혀 가는 관계가 되기 쉽습니다.",
    계: "감정의 미세한 변화를 빠르게 알아차리고 깊은 공감으로 가까워지기 쉽습니다.",
  };
  return copy[stem] ?? "서로 다른 기운을 보완하며 관계의 균형을 만들기 쉬운 타입입니다.";
}

function betterWhen(candidate: (typeof STEMS)[number], preferredBranches: string[], lowElements: FiveElement[]) {
  return [
    `${ELEMENT_LABEL[candidate.element]} 기운이 한쪽으로 과도하게 치우치지 않고 다른 오행과 함께 있을 때`,
    `${preferredBranches.slice(0, 2).join("·")} 같은 지지가 함께 있어 일지 관계가 안정적으로 연결될 때`,
    `${lowElements.map((element) => ELEMENT_LABEL[element]).join("·")} 중 부족한 기운을 자연스럽게 보완해 줄 때`,
  ];
}

function cautionCopies(userStem: string, userBranch: string, weights: Record<FiveElement, number>, rankedStems: ReturnType<typeof rankStems>, rankedBranches: ReturnType<typeof rankBranches>) {
  const maxElement = (Object.keys(weights) as FiveElement[]).sort((a, b) => weights[b] - weights[a])[0];
  const weakStem = [...rankedStems].reverse().find((item) => item.relation.relation === "CONTROLS");
  const clashBranch = rankedBranches.find((item) => item.relation.primaryRelation === "CLASH");
  const copies = [`이미 비교적 많이 드러나는 ${ELEMENT_LABEL[maxElement]} 기운이 상대 원국에서도 지나치게 강하면 비슷한 패턴이 과해질 수 있습니다.`];
  if (weakStem) copies.push(`${weakStem.candidate.stem}${weakStem.candidate.hanja} 일간은 ${userStem} 일간과 극 관계가 먼저 작동해, 다른 보완 요소가 적으면 긴장감이 커질 수 있습니다.`);
  if (clashBranch) copies.push(`${clashBranch.candidate.branch}${clashBranch.candidate.hanja} 지지가 강하게 작동하면 내 일지 ${userBranch}와 충이 생겨 생활 리듬이나 감정 반응이 자주 엇갈릴 수 있습니다.`);
  return copies.slice(0, 3);
}

export function calculateSoulmateResult(person: PersonBirthInput): SoulmateResult {
  const snapshot = calculateManseSnapshot(person);
  const weights = weightedElements(person, snapshot);
  const userStem = snapshot.pillars.day.heavenlyStem;
  const userBranch = snapshot.pillars.day.earthlyBranch;
  const userMeta = STEM_META[userStem];
  if (!userMeta) throw new RangeError(`지원하지 않는 일간입니다: ${userStem}`);
  const traits = STEM_TRAITS[userStem];
  const orderedElements = (Object.keys(weights) as FiveElement[]).sort((a, b) => weights[a] - weights[b]);
  const lowElements = orderedElements.slice(0, 2);
  const rankedStems = rankStems(userStem, weights);
  const count = pickRecommendationCount(rankedStems);
  const rankedBranches = rankBranches(userBranch, weights);
  const preferredBranches = rankedBranches
    .filter((item) => item.relation.primaryRelation === "SIX_HARMONY" || item.relation.primaryRelation === "NEUTRAL")
    .slice(0, 4)
    .map((item) => `${item.candidate.branch}(${item.candidate.hanja})`);
  const topStems = rankedStems.slice(0, count);
  const maxWeight = Math.max(...Object.values(weights));
  const minWeight = Math.min(...Object.values(weights));
  const balanceRange = Math.max(0.01, maxWeight - minWeight);
  const yinYang = yinYangBalance(snapshot);

  const recommendations = topStems.map((item, index) => ({
    rank: index + 1,
    stem: item.candidate.stem,
    stemHanja: item.candidate.hanja,
    element: item.candidate.element,
    elementLabel: ELEMENT_LABEL[item.candidate.element],
    yinYang: item.candidate.yinYang,
    yinYangLabel: item.candidate.yinYang === "yang" ? "양" : "음",
    relationLabel: relationLabel(item.relation),
    headline: index === 0 ? "내 사주의 빈틈을 가장 자연스럽게 채워 주는 일간" : index === 1 ? "관계의 리듬을 안정적으로 이어 주는 일간" : "서로 다른 장점을 살려 함께 성장하기 좋은 일간",
    reasons: recommendationReason(item.candidate, item.relation, weights, lowElements),
    relationshipPattern: relationshipPattern(item.candidate.stem),
    betterWhen: betterWhen(item.candidate, preferredBranches, lowElements),
  }));

  const elementBalance = (Object.keys(weights) as FiveElement[]).map((element) => ({
    element,
    label: ELEMENT_LABEL[element],
    weight: weights[element],
    level: weights[element] <= minWeight + balanceRange * 0.32 ? "낮음" as const : weights[element] >= minWeight + balanceRange * 0.68 ? "높음" as const : "보통" as const,
  }));

  const preferredStemLabels = recommendations.map((item) => `${item.stem}(${item.stemHanja})`);
  const preferredElementLabels = lowElements.map((element) => ELEMENT_LABEL[element]);
  const top = recommendations[0];

  return {
    version: "soulmate-result-v1",
    displayName: person.displayName,
    generatedAt: new Date().toISOString(),
    pillars: [
      pillarView("year", "년주", snapshot.pillars.year),
      pillarView("month", "월주", snapshot.pillars.month),
      pillarView("day", "일주", snapshot.pillars.day),
      pillarView("hour", "시주", snapshot.pillars.hour),
    ],
    self: {
      dayMaster: userStem,
      dayMasterHanja: userMeta.hanja,
      element: userMeta.element,
      elementLabel: ELEMENT_LABEL[userMeta.element],
      yinYang: userMeta.yinYang,
      yinYangLabel: userMeta.yinYang === "yang" ? "양" : "음",
      keywords: traits.keywords,
      strength: traits.strength,
      complement: `${traits.complement} 현재 원국의 오행 분포에서는 ${preferredElementLabels.join("·")} 기운을 보완 관점에서 함께 살펴볼 가치가 있습니다.`,
    },
    elementBalance,
    yinYangBalance: yinYang,
    recommendations,
    detailed: {
      preferredElements: preferredElementLabels,
      preferredStems: preferredStemLabels,
      preferredBranches,
      idealConditions: [
        `${top.stem}(${top.stemHanja})을 포함한 추천 일간이 중심을 이루되 오행이 한쪽으로 과도하게 몰리지 않는 사주`,
        `${preferredElementLabels.join("·")} 기운이 적절히 드러나 내 원국의 상대적 빈틈을 채우는 사주`,
        `${preferredBranches.slice(0, 3).join("·")}처럼 내 일지와 충·형·해보다 합 또는 중립 관계가 우선되는 지지 구성`,
        `${yinYang.label === "균형형" ? "음양 어느 한쪽보다 전체 균형이 유지되는" : yinYang.yang > yinYang.yin ? "음 기운이 적절히 더해져 속도를 낮춰 주는" : "양 기운이 적절히 더해져 표현과 실행을 돕는"} 사주`,
      ],
      cautions: cautionCopies(userStem, userBranch, weights, rankedStems, rankedBranches),
      methodNote: "추천 일간은 기존 만세력 원국을 바탕으로 일간 생극 관계, 오행 분포, 음양 보완, 일지 합충 관계를 함께 보는 결정론적 규칙으로 산출합니다. 현재 용신 모듈은 근거 수집 단계이므로 이 결과에서 용신을 확정하거나 천생연분 확률을 표시하지 않습니다.",
    },
    zootopi: {
      opening: `${person.displayName}의 중심은 ${userStem}(${userMeta.hanja}) 일간이야. 원국 전체를 같이 보니까 ${preferredElementLabels.join("과 ")} 기운이 관계 균형을 잡는 데 특히 눈에 들어와. 그래서 일간 하나만 찍은 게 아니라 오행 분포와 음양, 일지 관계까지 같이 봤어.`,
      middle: `${top.stem}(${top.stemHanja})이 가장 먼저 올라온 이유는 단순히 오행 하나가 맞아서가 아니야. ${top.relationLabel}가 기본판을 만들고, 네 원국에서 상대적으로 적은 기운을 보완할 여지도 같이 있기 때문이야. 다만 같은 ${top.stem} 일간이라도 지지와 전체 오행 구성이 다르면 실제 체감은 달라질 수 있어. 그래서 아래의 ‘특히 잘 맞는 조건’까지 같이 보는 게 중요해.`,
      closing: `천생연분은 일간 이름 하나로 확정되는 사람이 아니야. 그래도 네 사주에서 어떤 기운과 구조가 편안하게 맞물리는지는 꽤 구체적으로 좁혀 볼 수 있어. 실제로 마음에 둔 사람이 있다면 이제 두 사람의 원국을 함께 놓고 1:1 궁합으로 확인하는 게 다음 단계야.`,
    },
  };
}
