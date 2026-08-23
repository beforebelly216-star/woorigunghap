import type { CompatibilityShareArchetype } from "@/lib/narrative/compatibility-share-card";
import type { RelationshipType } from "@/lib/report-input";

export const SHARE_COPY_TONES = ["clean", "tease", "curiosity"] as const;
export type ShareCopyTone = (typeof SHARE_COPY_TONES)[number];

export const SHARE_COPY_PURPOSES = ["relationship_label", "two_sides", "send_this"] as const;
export type ShareCopyPurpose = (typeof SHARE_COPY_PURPOSES)[number];

export const SHARE_RELATIONSHIP_PATTERNS = [
  "stable",
  "banter",
  "twist",
  "distance",
  "effort",
  "opposites",
] as const;
export type ShareRelationshipPattern = (typeof SHARE_RELATIONSHIP_PATTERNS)[number];

export const SHARE_RELATIONSHIP_PATTERN_LABELS: Record<ShareRelationshipPattern, string> = {
  stable: "안정형",
  banter: "티키타카형",
  twist: "반전형",
  distance: "거리조절형",
  effort: "노력형",
  opposites: "극과극형",
};

export const CURIOSITY_MASK_TOKEN = "███" as const;

export type RelationshipShareCopy = {
  id: string;
  relationshipType: RelationshipType;
  pattern: ShareRelationshipPattern;
  tone: ShareCopyTone;
  purpose: ShareCopyPurpose;
  copy: string;
};

const RELATIONSHIP_CODE: Record<string, RelationshipType> = {
  CR: "crush",
  FL: "flirting",
  LO: "lover",
  FR: "friend",
  CO: "coworker",
};

const PATTERN_CODE: Record<string, ShareRelationshipPattern> = {
  ST: "stable",
  BA: "banter",
  TW: "twist",
  DI: "distance",
  EF: "effort",
  OP: "opposites",
};

const SUFFIX_META: Record<number, { tone: ShareCopyTone; purpose: ShareCopyPurpose }> = {
  1: { tone: "clean", purpose: "relationship_label" },
  2: { tone: "clean", purpose: "two_sides" },
  3: { tone: "clean", purpose: "send_this" },
  4: { tone: "clean", purpose: "two_sides" },
  5: { tone: "tease", purpose: "relationship_label" },
  6: { tone: "tease", purpose: "send_this" },
  7: { tone: "curiosity", purpose: "relationship_label" },
  8: { tone: "curiosity", purpose: "send_this" },
};

const TONE_FALLBACK_ORDER: Record<ShareCopyTone, readonly ShareCopyTone[]> = {
  clean: ["clean", "tease", "curiosity"],
  tease: ["tease", "clean", "curiosity"],
  curiosity: ["curiosity", "clean", "tease"],
};

/**
 * Editorial-only mapping from the existing deterministic compatibility archetype
 * to the six Growth share patterns. This does not calculate or alter compatibility.
 */
export const SHARE_PATTERN_BY_ARCHETYPE: Record<
  CompatibilityShareArchetype["id"],
  ShareRelationshipPattern
> = {
  spark: "banter",
  complement: "opposites",
  interlock: "twist",
  journey: "stable",
  growth: "effort",
  tuning: "distance",
};

const APPROVED_SHARE_COPY_DATA = [
  ["CR-ST-01", "마음은 천천히 커지지만, 한 번 믿음이 생기면 쉽게 흔들리지 않는 짝사랑."],
  ["CR-ST-02", "급하게 가까워지기보다 편안한 대화가 쌓일수록 가능성이 보이는 사이."],
  ["CR-ST-03", "큰 이벤트보다 꾸준한 연락 한 번이 더 오래 남는 관계."],
  ["CR-ST-04", "서두르지 않을수록 상대가 당신의 진짜 장점을 알아보기 쉬운 조합."],
  ["CR-ST-06", "불꽃놀이는 없는데 자꾸 생각나는, 은근히 오래 가는 관심."],
  ["CR-ST-07", "이 관계가 움직이는 순간은 고백보다 ███이 먼저 바뀔 때예요."],
  ["CR-ST-08", "상대가 당신을 편한 사람에서 다른 사람으로 보기 시작하는 단서는 ███에 있어요."],
  ["CR-BA-01", "말이 잘 통할수록 호감이 빨리 드러나는, 대화가 중요한 짝사랑."],
  ["CR-BA-02", "장난과 반응 속에서 서로의 관심을 확인하기 쉬운 사이."],
  ["CR-BA-04", "대화 템포가 맞으면 거리가 빨리 줄지만, 타이밍을 놓치면 친구처럼 굳기 쉬운 조합."],
  ["CR-BA-06", "대화는 장난인데 마음은 생각보다 안 장난인 짝사랑."],
  ["CR-BA-07", "둘 사이에서 장난이 호감으로 넘어가는 경계는 ███에서 갈려요."],
  ["CR-BA-08", "상대가 그냥 재밌어하는 건지, 조금 더 궁금해하는 건지는 ███을 보면 보여요."],
  ["CR-TW-01", "처음엔 별생각 없던 쪽이 나중에 더 오래 마음에 남길 수 있는 짝사랑."],
  ["CR-TW-02", "겉으로 보이는 반응보다 관계가 뒤늦게 깊어질 여지가 있는 사이."],
  ["CR-TW-03", "처음의 거리감이 꼭 낮은 가능성을 뜻하지는 않는 조합."],
  ["CR-TW-04", "빠른 확신보다 예상 밖의 순간에 호감이 커지는 흐름."],
  ["CR-TW-05", "초반엔 내가 더 신경 쓰는 것 같다가, 어느 순간 상대가 더 궁금해질 수 있는 사이."],
  ["CR-TW-07", "이 짝사랑의 반전 포인트는 처음 호감보다 ███에서 나타나요."],
  ["CR-TW-08", "상대의 반응이 달라질 가능성이 가장 큰 순간은 ███일 때예요."],
  ["CR-DI-02", "연락을 늘리는 것보다 적당한 여백을 지키는 게 중요한 사이."],
  ["CR-DI-03", "다가갈수록 좋지만, 속도를 맞춰야 매력이 더 잘 보이는 관계."],
  ["CR-DI-05", "보내고 싶은 카톡은 많은데 결국 두 줄만 보내는 짝사랑."],
  ["CR-DI-06", "한 발 다가갔다가 답장 온도 보고 다시 반 발 물러나는 사이."],
  ["CR-DI-07", "이 관계에서 가장 위험한 건 연락 부족이 아니라 ███의 속도예요."],
  ["CR-DI-08", "상대가 부담보다 호감으로 느끼는 거리의 기준은 ███에 있어요."],
  ["CR-EF-02", "호감만 기다리기보다 관계를 만들기 위한 한 번의 시도가 필요한 사이."],
  ["CR-EF-03", "꾸준한 관심 표현이 상대에게 당신을 새롭게 보게 할 수 있는 조합."],
  ["CR-EF-04", "한 번에 승부보기보다 신뢰와 익숙함을 천천히 만드는 관계."],
  ["CR-EF-05", "운명처럼 마주치길 기다리기엔, 약속 한 번 잡는 게 훨씬 빠른 짝사랑."],
  ["CR-EF-07", "이 관계에서 가장 효과가 큰 한 번의 행동은 ███ 쪽이에요."],
  ["CR-EF-08", "지금 필요한 건 더 오래 기다리기보다 ███을 바꾸는 거예요."],
  ["CR-OP-01", "끌리는 이유와 어려운 이유가 같은 곳에서 나오는 짝사랑."],
  ["CR-OP-02", "서로 다른 리듬 때문에 궁금함이 커지지만 오해도 쉽게 생기는 사이."],
  ["CR-OP-04", "나와 다른 방식이 자꾸 눈에 들어오는 만큼 해석을 서두르지 않는 게 중요한 조합."],
  ["CR-OP-05", "왜 저렇게 하지 싶은데, 그래서 더 신경 쓰이는 짝사랑."],
  ["CR-OP-06", "안 맞는 것 같은데 이상하게 자꾸 확인하고 싶은 사이."],
  ["CR-OP-07", "둘의 차이가 매력으로 남을지 피로가 될지는 ███에서 갈려요."],
  ["CR-OP-08", "당신이 특히 약해지는 상대의 다른 점은 ███ 쪽이에요."],
  ["FL-ST-01", "확신을 조금씩 주고받을수록 자연스럽게 관계가 깊어지는 썸."],
  ["FL-ST-02", "밀고 당기기보다 꾸준한 반응이 더 잘 통하는 사이."],
  ["FL-ST-03", "연락 횟수보다 태도의 일관성이 관계를 앞으로 보내는 조합."],
  ["FL-ST-05", "답장은 평범한데 매일 끊기지 않는 게 제일 수상한 썸."],
  ["FL-ST-07", "이 썸이 연애로 넘어가는 핵심 신호는 연락량보다 ███이에요."],
  ["FL-ST-08", "둘 중 먼저 확신이 필요한 쪽은 ███에서 드러나요."],
  ["FL-BA-01", "대화가 즐거울수록 관계 온도가 빠르게 올라가는 썸."],
  ["FL-BA-02", "장난과 리액션이 자연스러워 서로의 호감을 확인하기 쉬운 사이."],
  ["FL-BA-06", "대화는 이미 커플인데 관계 정의만 아직 안 한 사이."],
  ["FL-BA-07", "이 썸에서 장난이 진심으로 바뀌는 순간은 ███일 때예요."],
  ["FL-BA-08", "상대가 가장 듣고 싶어 하는 한마디는 의외로 ███에 가까워요."],
  ["FL-TW-01", "처음엔 가벼워 보여도 시간이 갈수록 진지함이 커질 수 있는 썸."],
  ["FL-TW-04", "예상한 역할이 뒤집히면서 관계가 더 선명해질 수 있는 흐름."],
  ["FL-TW-05", "먼저 들이댄 사람이 나중엔 더 조심스러워질 수 있는 썸."],
  ["FL-TW-07", "이 썸의 주도권이 바뀌는 지점은 ███에서 보여요."],
  ["FL-TW-08", "처음 인상과 달리 더 오래 고민하는 쪽은 ███일 가능성이 커요."],
  ["FL-DI-01", "서로 호감은 있지만 속도 차이를 조절해야 편안해지는 썸."],
  ["FL-DI-02", "연락이 줄었다고 바로 식었다고 해석하지 않는 게 중요한 사이."],
  ["FL-DI-06", "밀당하려다 둘 다 진짜로 멀어질 수 있는 사이."],
  ["FL-DI-07", "이 썸이 멈추는 원인은 마음 부족보다 ███ 차이일 수 있어요."],
  ["FL-DI-08", "지금 더 필요한 건 한 번 더 연락하기보다 ███을 맞추는 거예요."],
  ["FL-EF-01", "호감만으로는 애매함이 길어지고, 한 번의 분명한 표현이 필요한 썸."],
  ["FL-EF-04", "말보다 실제 만남과 일관된 행동이 관계를 앞으로 보내는 흐름."],
  ["FL-EF-06", "서로 눈치는 다 챘는데 아무도 다음 버튼을 안 누르는 썸."],
  ["FL-EF-07", "이 관계를 가장 빨리 움직이는 행동은 ███이에요."],
  ["FL-EF-08", "애매함을 끝낼 타이밍은 감정이 더 커질 때보다 ███일 때예요."],
  ["FL-OP-01", "끌림은 강하지만 표현 방식이 달라 서로 확신을 놓치기 쉬운 썸."],
  ["FL-OP-02", "한쪽은 빠르게 확인하고 싶고 다른 쪽은 천천히 보고 싶은 사이."],
  ["FL-OP-06", "좋아하는 방식이 달라서 자꾸 서로 관심 없는 척 보이는 사이."],
  ["FL-OP-07", "둘이 가장 자주 오해하는 포인트는 ███ 방식이에요."],
  ["FL-OP-08", "차이를 설렘으로 남기려면 먼저 맞춰야 할 건 ███예요."],
  ["LO-ST-01", "크게 흔들리기보다 일상의 신뢰가 관계를 오래 붙잡아 주는 연인."],
  ["LO-ST-02", "감정 기복보다 꾸준한 행동에서 사랑을 확인하기 쉬운 사이."],
  ["LO-ST-06", "싸워도 저녁 뭐 먹을지는 같이 고민하는 현실형 연인."],
  ["LO-ST-07", "이 관계가 오래가는 진짜 이유는 설렘보다 ███에 있어요."],
  ["LO-ST-08", "둘이 익숙함에 빠질 때 가장 먼저 놓치기 쉬운 건 ███이에요."],
  ["LO-BA-01", "대화와 장난이 관계의 활력을 계속 살려주는 연인."],
  ["LO-BA-02", "함께 있을 때 웃음이 많고 갈등도 대화로 풀 여지가 큰 사이."],
  ["LO-BA-06", "서로 놀리는 수준은 높은데 남이 놀리면 먼저 발끈하는 사이."],
  ["LO-BA-07", "둘의 티키타카가 가장 잘 살아나는 순간은 ███할 때예요."],
  ["LO-BA-08", "장난이 상처가 되기 시작하는 경계는 ███에서 갈려요."],
  ["LO-TW-01", "겉으로 더 표현하는 사람과 실제로 더 오래 고민하는 사람이 다를 수 있는 연인."],
  ["LO-TW-02", "초반에 보였던 관계 역할이 시간이 지나며 자연스럽게 바뀌는 사이."],
  ["LO-TW-05", "평소엔 쿨한 사람이 싸우고 나면 더 오래 생각하는 커플."],
  ["LO-TW-07", "이 연애에서 의외로 더 예민한 쪽은 ███에서 드러나요."],
  ["LO-TW-08", "둘의 관계 역할이 뒤집히는 순간은 보통 ███할 때예요."],
  ["LO-DI-01", "가까움과 개인 시간을 함께 지켜야 더 편안한 연인."],
  ["LO-DI-02", "사랑의 크기보다 연락·거리·혼자 있는 시간의 기준을 맞추는 게 중요한 사이."],
  ["LO-DI-06", "같이 있고 싶은 사람과 혼자 있고 싶은 사람이 같은 사람일 수 있는 연애."],
  ["LO-DI-07", "둘이 가장 자주 서운해지는 건 애정 부족보다 ███ 차이예요."],
  ["LO-DI-08", "관계를 더 편하게 만드는 적정 거리는 ███에서 찾을 수 있어요."],
  ["LO-EF-01", "좋은 궁합도 관리가 필요하고, 이 관계는 노력한 만큼 안정되는 연인."],
  ["LO-EF-02", "갈등을 피하는 것보다 같은 문제를 다르게 푸는 법을 배우는 게 중요한 사이."],
  ["LO-EF-05", "사랑은 충분한데 사용설명서는 같이 만들어야 하는 커플."],
  ["LO-EF-07", "이 관계에서 가장 투자 대비 효과가 큰 노력은 ███이에요."],
  ["LO-EF-08", "반복 갈등을 줄이려면 먼저 바꿔야 할 한 가지는 ███예요."],
  ["LO-OP-01", "서로 다른 성향이 강한 끌림과 반복 갈등을 동시에 만드는 연인."],
  ["LO-OP-02", "같은 상황을 다르게 해석하지만 그 차이가 관계의 폭을 넓혀주는 사이."],
  ["LO-OP-05", "왜 저렇게 생각하지 싶다가도, 그래서 내가 좋아했지 싶어지는 커플."],
  ["LO-OP-07", "둘의 차이가 가장 크게 폭발하는 장면은 ███일 때예요."],
  ["LO-OP-08", "이 커플이 오래가려면 절대 같아질 필요 없는 부분은 ███이에요."],
  ["FR-ST-01", "자주 연락하지 않아도 다시 만나면 금방 편해지는 친구."],
  ["FR-ST-02", "서로의 생활을 존중하면서 필요한 순간에는 자연스럽게 곁을 지키는 사이."],
  ["FR-ST-06", "카톡은 뜸한데 중요한 날엔 이상하게 제일 먼저 나타나는 사이."],
  ["FR-ST-07", "이 우정이 오래가는 핵심은 연락 빈도보다 ███이에요."],
  ["FR-ST-08", "둘 사이가 멀어질 때 가장 먼저 사라지는 신호는 ███예요."],
  ["FR-BA-01", "같이 있으면 대화가 끊기지 않고 웃음으로 친밀감이 커지는 친구."],
  ["FR-BA-02", "장난을 주고받는 속도가 잘 맞아 함께 있을수록 에너지가 살아나는 사이."],
  ["FR-BA-06", "놀리는 건 제일 심한데 편 들어줄 때는 또 제일 빠른 사이."],
  ["FR-BA-07", "둘의 웃음 코드가 가장 강하게 터지는 건 ███할 때예요."],
  ["FR-BA-08", "장난이 진짜 서운함으로 넘어가는 선은 ███에서 갈려요."],
  ["FR-TW-01", "처음엔 안 맞아 보였는데 알수록 의외로 편해지는 친구."],
  ["FR-TW-02", "성격은 달라도 중요한 순간의 기준이 맞아 오래 갈 수 있는 사이."],
  ["FR-TW-05", "처음엔 절대 친해질 줄 몰랐는데 지금은 서로 흑역사까지 아는 사이."],
  ["FR-TW-07", "이 친구의 의외의 장점은 평소보다 ███ 상황에서 더 잘 보여요."],
  ["FR-TW-08", "둘이 생각보다 잘 맞는 이유는 취향보다 ███이 같아서예요."],
  ["FR-DI-01", "각자의 생활 반경을 존중할수록 더 오래 편하게 이어지는 친구."],
  ["FR-DI-02", "친하다고 모든 시간을 공유하기보다 필요한 거리감을 아는 사이."],
  ["FR-DI-05", "읽씹해도 다음 주에 아무렇지 않게 밥 먹을 수 있는 친구."],
  ["FR-DI-07", "둘에게 가장 편한 연락 간격은 생각보다 ███ 쪽이에요."],
  ["FR-DI-08", "우정에서 거리감이 서운함으로 바뀌는 순간은 ███일 때예요."],
  ["FR-EF-01", "저절로 친해지는 타입은 아니어도 시간을 쓸수록 신뢰가 커지는 친구."],
  ["FR-EF-02", "함께 경험을 쌓고 약속을 지킬수록 관계가 단단해지는 사이."],
  ["FR-EF-06", "약속 잡기는 힘든데 만나고 나면 늘 잘 왔다 싶은 사이."],
  ["FR-EF-07", "이 우정을 더 가까워지게 만드는 가장 쉬운 행동은 ███이에요."],
  ["FR-EF-08", "둘 사이에 필요한 노력은 연락 횟수보다 ███에 가까워요."],
  ["FR-OP-01", "취향과 성격은 달라도 서로에게 없는 시선을 주는 친구."],
  ["FR-OP-02", "다름 때문에 부딪히지만 그만큼 새로운 경험을 끌어내는 사이."],
  ["FR-OP-06", "왜 친한지 설명은 잘 안 되는데 만나면 또 재밌는 사이."],
  ["FR-OP-07", "둘이 가장 다르게 생각하는 지점은 ███인데, 오히려 그게 장점이 될 수 있어요."],
  ["FR-OP-08", "이 우정이 깨지지 않으려면 서로 건드리지 말아야 할 차이는 ███이에요."],
  ["CO-ST-01", "역할과 기준이 분명할수록 안정적으로 성과를 내는 직장동료."],
  ["CO-ST-02", "업무 속도와 책임 범위를 맞추면 서로 믿고 맡기기 쉬운 사이."],
  ["CO-ST-05", "회의는 짧고 할 일은 또렷한, 같이 일하기 편한 조합."],
  ["CO-ST-07", "둘이 가장 안정적으로 성과를 내는 조건은 ███이 분명할 때예요."],
  ["CO-ST-08", "협업 신뢰가 깨지기 시작하는 첫 신호는 ███이에요."],
  ["CO-BA-01", "아이디어를 빠르게 주고받을수록 결과가 좋아지는 직장동료."],
  ["CO-BA-02", "대화 속도가 잘 맞아 문제를 발견하고 해결하는 흐름이 빠른 사이."],
  ["CO-BA-05", "회의하다 농담 한 번 했는데 아이디어 세 개 나오는 동료."],
  ["CO-BA-07", "둘의 협업 효율이 가장 올라가는 순간은 ███을 같이 할 때예요."],
  ["CO-BA-08", "대화가 많은데도 일이 꼬이는 순간은 ███이 빠졌을 때예요."],
  ["CO-TW-01", "첫인상과 실제 업무 궁합이 다르게 느껴질 수 있는 직장동료."],
  ["CO-TW-02", "평소 조용한 사람이 중요한 순간에 주도권을 잡을 수 있는 사이."],
  ["CO-TW-05", "평소 말 없던 사람이 마감 직전에 제일 든든해지는 조합."],
  ["CO-TW-07", "이 동료의 진짜 강점은 평소보다 ███ 상황에서 보여요."],
  ["CO-TW-08", "둘의 역할이 뒤집힐수록 오히려 잘 풀리는 업무는 ███ 쪽이에요."],
  ["CO-DI-01", "업무 경계와 소통 간격을 분명히 할수록 편한 직장동료."],
  ["CO-DI-02", "친밀함보다 필요한 정보가 제때 오가는 게 중요한 사이."],
  ["CO-DI-06", "서로 일하는 방식은 존중하는데 파일명 규칙은 꼭 맞춰야 하는 사이."],
  ["CO-DI-07", "둘이 가장 자주 피로해지는 건 업무량보다 ███ 경계가 흐릴 때예요."],
  ["CO-DI-08", "협업 거리를 편하게 만드는 기준은 ███을 명확히 하는 거예요."],
  ["CO-EF-01", "처음부터 잘 맞기보다 협업 규칙을 만들수록 성과가 좋아지는 직장동료."],
  ["CO-EF-02", "피드백 방식과 역할을 조율하면 서로의 강점을 더 잘 쓰는 사이."],
  ["CO-EF-06", "처음엔 답답했는데 템플릿 하나 만들고 갑자기 편해지는 사이."],
  ["CO-EF-07", "둘의 협업에서 가장 효과 큰 개선은 ███을 표준화하는 거예요."],
  ["CO-EF-08", "갈등을 줄이려면 성격보다 먼저 ███ 방식을 맞춰야 해요."],
  ["CO-OP-01", "업무 방식은 다르지만 역할을 나누면 서로의 빈틈을 채우는 직장동료."],
  ["CO-OP-02", "한쪽의 속도와 다른 쪽의 꼼꼼함이 균형을 만들 수 있는 사이."],
  ["CO-OP-05", "한 명은 일단 시작, 한 명은 일단 검토인데 합치면 의외로 잘 굴러가는 팀."],
  ["CO-OP-07", "둘의 차이가 성과로 바뀌는 핵심 역할 분담은 ███이에요."],
  ["CO-OP-08", "서로 가장 답답해하는 지점이 사실 팀에 필요한 이유는 ███ 때문이에요."],
] as const;

function parseApprovedCopy(id: string, copy: string): RelationshipShareCopy {
  const match = /^(CR|FL|LO|FR|CO)-(ST|BA|TW|DI|EF|OP)-(0[1-8])$/.exec(id);
  if (!match) throw new Error(`Invalid approved share copy id: ${id}`);

  const relationshipType = RELATIONSHIP_CODE[match[1] ?? ""];
  const pattern = PATTERN_CODE[match[2] ?? ""];
  const meta = SUFFIX_META[Number(match[3] ?? "0")];

  if (!relationshipType || !pattern || !meta) {
    throw new Error(`Incomplete approved share copy metadata: ${id}`);
  }

  return {
    id,
    relationshipType,
    pattern,
    tone: meta.tone,
    purpose: meta.purpose,
    copy,
  };
}

export const PRODUCTION_RELATIONSHIP_SHARE_COPY: readonly RelationshipShareCopy[] =
  APPROVED_SHARE_COPY_DATA.map(([id, copy]) => parseApprovedCopy(id, copy));

export function sharePatternForArchetype(
  archetypeId: CompatibilityShareArchetype["id"],
): ShareRelationshipPattern {
  return SHARE_PATTERN_BY_ARCHETYPE[archetypeId];
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizedSeed(seed: number) {
  return Number.isFinite(seed) ? Math.trunc(seed) : 0;
}

export function resolveDefaultShareCopyTone(input: {
  relationshipType: RelationshipType;
  pattern: ShareRelationshipPattern;
  purpose: ShareCopyPurpose;
  variantSeed: number;
}): ShareCopyTone {
  const hash = stableHash(
    `${input.relationshipType}|${input.pattern}|${input.purpose}|${normalizedSeed(input.variantSeed)}|tone`,
  );

  if (hash % 3 === 1) return "tease";
  if (hash % 3 === 2) return "curiosity";
  return "clean";
}

export function selectRelationshipShareCopy(input: {
  relationshipType: RelationshipType;
  pattern: ShareRelationshipPattern;
  purpose: ShareCopyPurpose;
  variantSeed: number;
  tone?: ShareCopyTone;
}): RelationshipShareCopy {
  const purposeCandidates = PRODUCTION_RELATIONSHIP_SHARE_COPY.filter(
    (entry) => (
      entry.relationshipType === input.relationshipType
      && entry.pattern === input.pattern
      && entry.purpose === input.purpose
    ),
  );

  if (purposeCandidates.length === 0) {
    throw new Error(
      `No approved share copy for ${input.relationshipType}/${input.pattern}/${input.purpose}`,
    );
  }

  const preferredTone = input.tone ?? resolveDefaultShareCopyTone({
    relationshipType: input.relationshipType,
    pattern: input.pattern,
    purpose: input.purpose,
    variantSeed: input.variantSeed,
  });

  const resolvedTone = TONE_FALLBACK_ORDER[preferredTone].find(
    (tone) => purposeCandidates.some((entry) => entry.tone === tone),
  );
  const toneCandidates = resolvedTone
    ? purposeCandidates.filter((entry) => entry.tone === resolvedTone)
    : purposeCandidates;

  const hash = stableHash(
    `${input.relationshipType}|${input.pattern}|${input.purpose}|${normalizedSeed(input.variantSeed)}|copy`,
  );
  const selected = toneCandidates[hash % toneCandidates.length] ?? purposeCandidates[0];

  if (!selected) {
    throw new Error(
      `Failed to select approved share copy for ${input.relationshipType}/${input.pattern}/${input.purpose}`,
    );
  }

  return selected;
}

export function selectRelationshipShareCopyForArchetype(input: {
  relationshipType: RelationshipType;
  archetypeId: CompatibilityShareArchetype["id"];
  purpose: ShareCopyPurpose;
  variantSeed: number;
  tone?: ShareCopyTone;
}): RelationshipShareCopy {
  return selectRelationshipShareCopy({
    relationshipType: input.relationshipType,
    pattern: sharePatternForArchetype(input.archetypeId),
    purpose: input.purpose,
    variantSeed: input.variantSeed,
    ...(input.tone ? { tone: input.tone } : {}),
  });
}

/**
 * Replaces the curiosity placeholder with a full opaque mask for the supplied
 * answer phrase. The answer itself never becomes part of the returned string.
 */
export function maskCuriosityAnswer(copy: string, hiddenAnswer: string) {
  if (!copy.includes(CURIOSITY_MASK_TOKEN)) return copy;

  const answerLength = Array.from(hiddenAnswer.trim().replace(/\s+/g, "")).length;
  const maskLength = Math.max(6, Math.min(18, answerLength || 6));

  return copy.replace(CURIOSITY_MASK_TOKEN, "█".repeat(maskLength));
}
