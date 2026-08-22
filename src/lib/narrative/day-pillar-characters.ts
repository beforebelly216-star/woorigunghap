export type DayPillarCharacter = {
  pillar: string;
  title: string;
  tagline: string;
  strengths: readonly [string, string];
  watchOut: string;
  relationshipCue: string;
};

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;

const STEM_ARCHETYPES = {
  갑: { name: "큰 숲의 개척자", drive: "방향을 먼저 정하고 앞으로 나아가는 힘", strength: "큰 그림을 잡는 추진력", caution: "상대의 속도보다 결론을 먼저 정하지 않기" },
  을: { name: "덩굴숲의 조율자", drive: "상황을 읽고 유연하게 길을 만드는 힘", strength: "관계의 미세한 변화를 알아채는 감각", caution: "맞춰주다가 자기 기준을 잃지 않기" },
  병: { name: "한낮의 불빛", drive: "감정과 의사를 밖으로 환하게 드러내는 힘", strength: "분위기를 띄우고 관계를 움직이는 표현력", caution: "상대가 생각할 틈까지 밝히려 들지 않기" },
  정: { name: "등불의 관찰자", drive: "가까운 사람에게 집중해 온기를 오래 유지하는 힘", strength: "섬세한 배려와 집중력", caution: "작은 반응을 너무 오래 해석하지 않기" },
  무: { name: "산맥의 수호자", drive: "한 번 정한 관계를 안정적으로 지키는 힘", strength: "버티는 힘과 신뢰감", caution: "변화를 거부하며 익숙함만 고집하지 않기" },
  기: { name: "정원의 설계자", drive: "생활 속에서 관계를 정돈하고 돌보는 힘", strength: "현실적인 배려와 관리 감각", caution: "상대를 관리 대상처럼 대하지 않기" },
  경: { name: "검날의 결단가", drive: "애매함을 줄이고 기준을 선명하게 세우는 힘", strength: "문제를 빠르게 잘라내는 결단력", caution: "정답을 말하기 전에 감정의 맥락도 듣기" },
  신: { name: "보석의 감별사", drive: "작은 차이와 완성도를 예민하게 읽는 힘", strength: "섬세한 기준과 매력 포착력", caution: "완벽한 반응을 기대해 관계를 시험하지 않기" },
  임: { name: "큰물의 항해자", drive: "넓게 보고 흐름이 바뀌면 길도 바꾸는 힘", strength: "포용력과 상황 전환 능력", caution: "자유를 지키느라 약속을 흐리지 않기" },
  계: { name: "밤비의 기록자", drive: "조용히 관찰하며 필요한 순간에 스며드는 힘", strength: "세밀한 관찰과 정서적 온도 감지", caution: "말하지 않고 알아주길 기다리지 않기" },
} as const;

const BRANCH_MOTIFS = {
  자: { motif: "새벽의 문", scene: "연락과 첫 반응에서 관계의 온도를 빠르게 읽는 편", cue: "첫 반응보다 이후 흐름이 이어지는지 보세요" },
  축: { motif: "겨울 창고", scene: "천천히 쌓인 신뢰와 생활 리듬을 중요하게 보는 편", cue: "작은 약속을 꾸준히 지키는 장면이 중요해요" },
  인: { motif: "숲길의 출발점", scene: "관계가 움직일 이유가 생기면 먼저 행동으로 옮기기 쉬운 편", cue: "좋은 신호가 보이면 다음 행동을 구체적으로 잡아보세요" },
  묘: { motif: "봄 정원의 문", scene: "말투와 거리감 같은 미세한 분위기에 민감한 편", cue: "부드러운 표현과 경계 존중이 관계의 핵심이에요" },
  진: { motif: "안개 낀 성문", scene: "겉으로 단순해 보여도 여러 조건을 함께 따져 움직이는 편", cue: "애매함을 오래 두기보다 기준을 하나씩 확인하세요" },
  사: { motif: "불꽃 회랑", scene: "호기심과 긴장감이 생기면 관계 몰입도가 빠르게 높아지는 편", cue: "강한 끌림과 실제 지속 가능성을 따로 확인하세요" },
  오: { motif: "태양 광장", scene: "좋고 싫은 반응이 비교적 빠르게 관계 표면에 드러나는 편", cue: "감정이 뜨거울 때보다 한 박자 뒤의 선택을 보세요" },
  미: { motif: "여름 정원", scene: "관계를 편안하고 오래 가게 만드는 생활 감각을 중시하는 편", cue: "함께 있을 때 편안한 루틴이 만들어지는지 보세요" },
  신: { motif: "기계탑의 교차로", scene: "상황을 빠르게 파악하고 역할과 이해득실을 조정하는 편", cue: "서로의 역할과 기대를 명확히 하면 강점이 살아나요" },
  유: { motif: "은빛 시계탑", scene: "표현의 정확도와 관계의 완성도를 세밀하게 보는 편", cue: "사소한 표현 차이가 쌓이지 않게 바로 확인하세요" },
  술: { motif: "성벽의 망루", scene: "신뢰 여부를 오래 보고 관계의 안전선을 중요하게 여기는 편", cue: "말보다 일관된 행동이 신뢰를 만드는 열쇠예요" },
  해: { motif: "달빛 항구", scene: "감정과 상황을 넓게 받아들이며 관계의 여지를 남기는 편", cue: "여지를 주되 중요한 경계와 약속은 선명하게 하세요" },
} as const;

export const SIXTY_DAY_PILLARS = Array.from({ length: 60 }, (_, index) => `${STEMS[index % STEMS.length]}${BRANCHES[index % BRANCHES.length]}`) as readonly string[];

function buildCharacter(pillar: string): DayPillarCharacter | null {
  const stem = pillar[0] as keyof typeof STEM_ARCHETYPES;
  const branch = pillar[1] as keyof typeof BRANCH_MOTIFS;
  const stemInfo = STEM_ARCHETYPES[stem];
  const branchInfo = BRANCH_MOTIFS[branch];
  if (!stemInfo || !branchInfo || !SIXTY_DAY_PILLARS.includes(pillar)) return null;

  return {
    pillar,
    title: `${pillar} · ${stemInfo.name}, ${branchInfo.motif}`,
    tagline: `${stemInfo.drive}이 ${branchInfo.scene}과 만나는 캐릭터예요.`,
    strengths: [stemInfo.strength, branchInfo.scene],
    watchOut: stemInfo.caution,
    relationshipCue: branchInfo.cue,
  };
}

export const DAY_PILLAR_CHARACTER_CATALOG: Readonly<Record<string, DayPillarCharacter>> = Object.freeze(
  Object.fromEntries(SIXTY_DAY_PILLARS.map((pillar) => [pillar, buildCharacter(pillar)])) as Record<string, DayPillarCharacter>,
);

export function getDayPillarCharacter(pillar: string | null | undefined): DayPillarCharacter | null {
  if (!pillar) return null;
  return DAY_PILLAR_CHARACTER_CATALOG[pillar] ?? null;
}
