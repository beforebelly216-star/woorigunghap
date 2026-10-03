export const FULLBUY_REWARD = 3;
export const FULLBUY_CHAPTER_COST = 3;
export const FULLBUY_CHAPTERS = Object.freeze([
  { id: 'conversation', title: '같은 말인데, 왜 다르게 들릴까요?', description: '대화 방식의 차이와 오해를 줄이는 표현', example: '문장 예시: 조언을 하기 전에 “같이 방법을 찾을까요, 조금 더 들어드릴까요?”라고 물으면 대화의 방향을 맞추기 쉽습니다.' },
  { id: 'strengths', title: '우리의 장점을 더 잘 쓰려면?', description: '함께할 때 살아나는 강점과 역할 나누기', example: '문장 예시: 계획을 세우는 역할과 새로운 선택지를 찾는 역할을 나누면 서로 다른 성향을 장점으로 활용할 수 있습니다.' },
  { id: 'conflict', title: '갈등이 생겼을 때, 첫마디는?', description: '반복되는 엇갈림과 대화를 시작하는 방법', example: '문장 예시: “왜 늘 그래요?”보다 “그때 저는 이렇게 느꼈어요”처럼 특정 상황과 자신의 느낌부터 말해 보세요.' },
]);

// Same unordered pair, regardless of who opened the relationship.
export function previewPairs(members) {
  return members.flatMap((left, index) => members.slice(index + 1).map(right => ({
    id: [left.id, right.id].sort().join(':'), members: [left, right],
  })));
}
