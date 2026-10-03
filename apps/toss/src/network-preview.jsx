import React, { useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { previewPairs, FULLBUY_CHAPTER_COST } from './fullbuy-policy';

const members = [
  { id: 'example-sky', name: '하늘' }, { id: 'example-sea', name: '바다' },
  { id: 'example-star', name: '별' }, { id: 'example-moon', name: '달' },
];
const pairs = previewPairs(members);

export function NetworkPreview({ onPair, onStart }) {
  const [mineOnly, setMineOnly] = useState(false);
  const visible = mineOnly ? pairs.filter(pair => pair.members.some(member => member.id === members[0].id)) : pairs;
  return <>
    <p className="eyebrow">친구 네트워크 · 화면 예시</p><h1>친구가 모이면,<br />궁금한 사이도 늘어납니다.</h1>
    <p>가상 별명 4명으로 만든 예시입니다.<br />실제 초대·계정·분석 결과는 연결 전입니다.</p>
    <div className="network-members" aria-label="예시 참여자">{members.map(member => <span className="member-chip" key={member.id}>{member.name}</span>)}</div>
    <section className="network-summary"><h2>4명 사이, 6개의 연결</h2><p>내 관계부터 친구들 사이까지, 궁금한 두 사람을 선택해 보세요.</p><Button display="block" disabled>친구 초대 연결 준비 중</Button><p className="field-help">실제 참여 시 각자 정보를 입력하고, 참여자 간 관계 공개에 동의하는 흐름으로 준비합니다.</p></section>
    <section aria-labelledby="pairs-heading"><h2 id="pairs-heading">어떤 두 사람이 궁금하세요?</h2><div className="network-filters"><button aria-pressed={!mineOnly} onClick={() => setMineOnly(false)}>전체 6쌍</button><button aria-pressed={mineOnly} onClick={() => setMineOnly(true)}>하늘의 관계 3쌍</button></div>
      {visible.map(pair => <button className="pair-row" key={pair.id} onClick={() => onPair(pair)}><span><strong>{pair.members.map(member => member.name).join(' · ')}</strong><span className="subtitle">기본 결과 무료 · 상세 항목별 풀매수 {FULLBUY_CHAPTER_COST}개</span></span><span aria-hidden="true">›</span></button>)}
    </section>
    <section className="return-section"><h2>우리 친구들로 시작하려면</h2><p>친구 네트워크 입력 흐름을 살펴보세요.</p><Button display="block" onClick={onStart}>네트워크 입력 화면 보기</Button></section>
  </>;
}
