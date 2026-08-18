import type { CoworkerHierarchy, RelationshipType } from "@/lib/report-input";

export const RELATIONSHIP_EDITORIAL_VERSION = "relationship-editorial-v3-name-tokens" as const;

export type RelationshipEditorialProfile = {
  label: string;
  premise: string;
  mustCover: string[];
  avoidAssumptions: string[];
  sceneExamples: string[];
  ui: {
    strategyTitle: string;
    strategyIntro: string;
    flowTitle: string;
    closenessTitle: string;
    actionTitle: string;
  };
};

export const RELATIONSHIP_EDITORIAL: Record<RelationshipType, RelationshipEditorialProfile> = {
  crush: {
    label: "짝사랑",
    premise: "관계가 아직 성립됐다고 가정하지 않는다. 상대의 속마음이나 호감 여부를 확정하지 말고, 내가 확인할 수 있는 신호와 접근 강도를 중심으로 쓴다.",
    mustCover: ["다가가는 속도", "상대 반응을 확인하는 기준", "부담을 줄이는 연락·제안 방식", "혼자 의미를 과해석하지 않는 기준", "접근을 멈추거나 거리를 점검할 신호"],
    avoidAssumptions: ["이미 서로 좋아한다", "연애 중이다", "상대가 반드시 호감이 있다", "질투·소유권이 이미 존재한다"],
    sceneExamples: ["먼저 연락할지 망설일 때", "둘만의 약속을 제안할 때", "상대 반응이 애매할 때", "호감 표현 수위를 조절할 때"],
    ui: {
      strategyTitle: "짝사랑에서 부담 없이 가까워지는 전략",
      strategyIntro: "이 관계에서는 궁합이 좋다는 말보다, 내가 어느 정도로 다가가고 어떤 반응에서 속도를 조절할지가 더 중요합니다.",
      flowTitle: "가까워지기 전 단계에서 보이는 흐름",
      closenessTitle: "짝사랑에서 느끼기 쉬운 끌림과 거리감",
      actionTitle: "지금 할 수 있는 현실적인 접근 플랜",
    },
  },
  flirting: {
    label: "썸",
    premise: "상호 관심 가능성은 열려 있지만 교제와 독점성을 가정하지 않는다. 애매함을 줄이는 대화와 관계 진전 속도를 중심으로 쓴다.",
    mustCover: ["연락 리듬", "호감 표현의 균형", "관계 정의 대화", "밀고 당기기보다 확인 가능한 행동", "애매한 행동을 과해석하지 않는 기준", "자연소멸 위험 신호와 대응"],
    avoidAssumptions: ["이미 공식 연인이다", "배타적 관계다", "상대가 미래를 약속했다", "질투가 정당화된다"],
    sceneExamples: ["연락 텀이 달라질 때", "데이트 제안을 주고받을 때", "관계를 정의할지 고민할 때", "한쪽만 속도가 빨라질 때"],
    ui: {
      strategyTitle: "썸을 애매함 없이 이어가는 전략",
      strategyIntro: "썸에서는 끌림 자체보다 연락 속도와 기대치가 엇갈릴 때 어떻게 확인하고 조율하는지가 중요합니다.",
      flowTitle: "관계가 선명해질수록 생기는 흐름",
      closenessTitle: "썸에서 커지는 설렘과 애매함",
      actionTitle: "관계를 한 단계 선명하게 만드는 실행 플랜",
    },
  },
  lover: {
    label: "연인",
    premise: "이미 교제 중인 관계를 전제로 한다. 애정표현, 생활 리듬, 갈등 회복, 장기적인 역할 분담을 중심으로 쓴다.",
    mustCover: ["애정표현", "연락·데이트 리듬", "갈등 후 회복", "주도권과 역할 분담", "장기 관계 유지 습관", "권태로 느껴질 수 있는 반복 패턴", "관계를 다시 살리는 행동"],
    avoidAssumptions: ["결혼이 확정됐다", "헤어질 운명이다", "상대의 속마음을 확정한다", "특정 시기 사건을 예언한다"],
    sceneExamples: ["연락 빈도로 서운할 때", "데이트 계획을 정할 때", "싸운 뒤 먼저 풀어야 할 때", "생활 리듬이나 미래 계획을 맞출 때"],
    ui: {
      strategyTitle: "연애를 오래 편하게 이어가는 전략",
      strategyIntro: "연인 관계에서는 끌림보다 반복되는 생활 패턴과 갈등 후 회복 방식이 관계 만족도를 더 크게 좌우합니다.",
      flowTitle: "연애가 깊어질수록 생기는 흐름",
      closenessTitle: "연인 사이의 친밀 케미와 거리감",
      actionTitle: "오늘부터 적용하는 연애 실행 플랜",
    },
  },
  friend: {
    label: "친구",
    premise: "연애적 끌림이나 독점성을 전제로 하지 않는다. 연락 빈도, 약속, 신뢰, 함께 있을 때의 에너지와 거리 조절을 중심으로 쓴다.",
    mustCover: ["연락 빈도", "약속 신뢰", "함께 하기 좋은 활동", "서로 필요한 거리", "갈등 후 어색함을 푸는 방식", "관계 피로가 쌓이는 패턴", "신뢰를 회복하는 행동"],
    avoidAssumptions: ["연애 감정", "성적 긴장", "질투와 소유권", "결혼·이별 프레임"],
    sceneExamples: ["연락이 뜸해졌을 때", "약속이 반복해서 어긋날 때", "여행·취미를 같이 할 때", "친구 사이에 서운함이 쌓일 때"],
    ui: {
      strategyTitle: "오래 편한 친구로 지내는 전략",
      strategyIntro: "친구 관계에서는 자주 보는 것보다 서로의 연락 방식과 약속 기준을 얼마나 편하게 맞추는지가 중요합니다.",
      flowTitle: "친해질수록 드러나는 우정의 흐름",
      closenessTitle: "친구 사이의 편안함과 거리감",
      actionTitle: "우정을 덜 소모시키는 실행 플랜",
    },
  },
  coworker: {
    label: "직장동료",
    premise: "업무 관계를 전제로 하며 연애적 해석을 배제한다. 역할, 속도, 보고·의사결정, 피드백, 갈등 관리와 협업 효율을 중심으로 쓴다. 제공된 직장 위계가 있으면 그 권한 차이를 실제 행동 조언에 반영한다.",
    mustCover: ["업무 속도", "역할 분담", "보고·의사결정 방식", "피드백 주고받기", "갈등을 업무 이슈로 분리하는 법", "책임 경계가 모호할 때의 대응", "협업 피로를 줄이는 루틴"],
    avoidAssumptions: ["연애 감정", "사적 친밀감을 업무 궁합으로 해석", "입력되지 않은 직급·평가권을 추가 추정", "승진·이직 시기 예언"],
    sceneExamples: ["업무 우선순위가 다를 때", "보고 속도가 엇갈릴 때", "피드백을 주고받을 때", "책임 경계가 모호할 때"],
    ui: {
      strategyTitle: "협업 마찰을 줄이는 업무 전략",
      strategyIntro: "직장동료 궁합은 친밀감보다 역할과 속도, 보고 방식, 의사결정 기준을 얼마나 명확히 맞추는지가 핵심입니다.",
      flowTitle: "협업이 반복될수록 드러나는 업무 흐름",
      closenessTitle: "함께 일할 때의 호흡과 거리감",
      actionTitle: "바로 적용하는 협업 실행 플랜",
    },
  },
};

const COWORKER_HIERARCHY_RULES: Record<CoworkerHierarchy, string[]> = {
  boss: [
    "[직장 위계: 두 번째 사람이 첫 번째 사람의 상사]",
    "첫 번째 사람의 행동 조언은 보고 타이밍, 요청 방식, 이견 제시, 우선순위 재확인, 피드백 수용을 우선합니다.",
    "상사의 권한을 이유로 무조건 복종하라고 하지 말고, 근거를 갖춘 확인·보고·경계 설정처럼 실무적으로 안전한 방법을 제시하세요.",
    "두 번째 사람의 반응은 평가권이나 인사권을 실제로 보유한다고 추가 추정하지 말고, 입력된 '상사'라는 관계 범위 안에서만 해석하세요.",
  ],
  peer: [
    "[직장 위계: 두 사람은 동급 동료]",
    "행동 조언은 합의 방식, 역할 분담, 일정 조율, 상호 피드백, 책임 경계와 공동 의사결정을 우선합니다.",
    "한쪽이 다른 쪽의 공식 지휘권을 가진다고 가정하지 마세요. 충돌 시 누가 이기느냐보다 의사결정 기준과 책임 소재를 명확히 하는 방법을 제시하세요.",
  ],
  subordinate: [
    "[직장 위계: 두 번째 사람이 첫 번째 사람의 부하]",
    "첫 번째 사람의 행동 조언은 지시 명확화, 위임 범위, 체크인 주기, 피드백 전달, 질문하기 쉬운 분위기와 책임 배분을 우선합니다.",
    "권한 차이를 압박이나 통제의 근거로 쓰지 말고, 업무 기준을 명확히 하면서 두 번째 사람이 의견과 위험 신호를 말할 수 있게 하는 방법을 제시하세요.",
    "두 번째 사람의 직급·근속·평가 결과는 추가로 추정하지 마세요.",
  ],
};

export function getRelationshipEditorialProfile(type: RelationshipType) {
  return RELATIONSHIP_EDITORIAL[type];
}

export function getRelationshipEditorialProfileByLabel(label: string) {
  return Object.values(RELATIONSHIP_EDITORIAL).find((profile) => profile.label === label) ?? RELATIONSHIP_EDITORIAL.lover;
}

export function relationshipPromptRules(
  type: RelationshipType,
  coworkerHierarchy: CoworkerHierarchy | null = null,
) {
  const profile = RELATIONSHIP_EDITORIAL[type];
  const hierarchyRules = type === "coworker"
    ? coworkerHierarchy
      ? COWORKER_HIERARCHY_RULES[coworkerHierarchy]
      : [
          "[직장 위계: 기존 저장 결과로 위계 정보 없음]",
          "상사·동급·부하 중 어느 관계인지 임의 추정하지 말고 공통 협업 조언만 작성하세요.",
        ]
    : [];

  return [
    `[관계 유형: ${profile.label}]`,
    profile.premise,
    ...hierarchyRules,
    `반드시 다룰 현실 항목: ${profile.mustCover.join(", ")}.`,
    `현실 장면 예시: ${profile.sceneExamples.join(", ")}.`,
    `금지 가정: ${profile.avoidAssumptions.join(", ")}.`,
    "첫 번째 사람을 자연스럽게 직접 부를 필요가 있을 때는 {{SELF}}, 두 번째 사람은 {{PARTNER}}, 두 사람을 함께 직접 부를 때는 {{BOTH}} 자리표시자를 사용하세요. 실제 이름·별칭은 서버가 응답 뒤에 결합하므로 임의 이름이나 실명을 만들지 마세요.",
    "이름 자리표시자는 강조가 필요한 각 주요 항목의 첫 호칭 중심으로만 사용하세요. 하나의 문자열 필드에서는 {{SELF}}와 {{PARTNER}}를 각각 원칙적으로 1회만 쓰고, 매우 긴 필드도 각각 최대 2회를 넘기지 마세요. 이후 같은 사람을 다시 가리킬 때는 '나', '상대', '두 사람' 같은 자연스러운 역할 표현을 사용해 이름을 매 문장 반복하지 마세요.",
    "자리표시자 뒤 조사는 {{SELF}}는, {{PARTNER}}가, {{PARTNER}}와처럼 일반 한국어 문장대로 붙여도 됩니다. 서버가 '님' 호칭에 맞는 은/이/을/과 조사로 교정합니다.",
    "관계 기간은 사용자가 제공한 현재 맥락일 뿐 궁합의 강점·진정성·지속 가능성을 증명하는 계산 근거가 아닙니다. '오래 만났으니 궁합이 좋다'처럼 인과를 만들지 마세요.",
    "2026년·2027년 같은 특정 연도, 대운·세운·월운과 미래 시기 판정은 이 AI 해설에서 절대 작성하지 마세요. 해당 정보는 서버가 CH5에서 별도로 계산·표시합니다.",
    "역할 공급도, 배우자 역할 점수, 유용신 적합도, 범위값, WEAK/STRONG/confidence 같은 내부 계산 변수명을 사용자 문장에 노출하지 말고 쉬운 관계 언어로 번역하세요.",
    "관찰할 수 없는 무의식·갈망·트라우마·사랑받을 자격·확정된 심리 상태를 사실처럼 쓰지 마세요. 반드시 계산 근거 → 관찰 가능한 반응 가능성 → 확인하거나 배려할 행동의 순서로 씁니다.",
    "1:1 리포트의 정보 우선순위는 상대 해부 > 이 상대에게 통하는 나의 강점 > 관계 유형별 행동 전략 > 일반적인 내 성향 순서입니다.",
    "상대 관련 설명은 단순 성격 요약으로 끝내지 말고, 관계에서 중요하게 여길 가능성이 있는 것·예민해질 수 있는 상황·편해지기 쉬운 방식·실제 장면을 연결하세요.",
    "상대의 약점이나 방어 지점을 다룰 때는 공략법이 아니라 배려법으로 씁니다. 트라우마, 가족사, 외모 결점, 금전 취약점은 추정하지 마세요.",
    "전체 조언 중 최소 40%는 사용자가 바로 실행할 수 있는 행동 기준이어야 합니다. 추상적인 '잘 소통하세요'보다 누가·언제·무엇을 할지 구체화하세요.",
    "같은 계산 근거를 쓰더라도 이 관계 유형에서 실제로 사용자가 궁금해할 행동 기준으로 번역하세요.",
  ].join("\n");
}
