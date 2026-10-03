import React, { useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { FULLBUY_CHAPTERS, FULLBUY_REWARD, FULLBUY_CHAPTER_COST } from './fullbuy-policy';

export function ResultPreview({ onStart, onNetwork, pair }) {
  const [selected, setSelected] = useState(null);
  return <>
    <p className="eyebrow">결과 구성 미리보기</p><h1>점수 다음에,<br />궁금한 이야기가 있습니다.</h1>
    <p>아래는 화면 구성과 문장 예시입니다.<br />입력한 정보의 실제 분석 결과가 아닙니다.</p>
    {pair && <p className="pill">예시 관계 · {pair.members.map(member => member.name).join(' · ')}</p>}
    <section className="free-result"><span className="pill">기본 결과 · 시청 없이 무료</span><h2>먼저, 두 사람을 이해하는 단서</h2>
      <ul className="benefits"><li>두 사람의 궁합 점수와 세부 지표</li><li>각자의 성향과 서로 다른 지점</li><li>잘 맞는 부분과 조율할 부분의 계산 근거</li></ul>
      <p className="field-help">실제 계산 전에는 점수나 개인화된 결과를 표시하지 않습니다.</p>
    </section>
    <section className="detail-preview" aria-labelledby="detail-heading"><p className="eyebrow">더 알고 싶은 순간에</p><h2 id="detail-heading">두 사람에게 맞는 대화의 힌트</h2><p>추가 해설에서는 계산 근거를 일상에서 써볼 수 있는 말과 행동으로 풀어드립니다.</p>
      <div className="wallet-preview"><div className="wallet-heading"><img src="/fullbuy.png" width="64" height="64" alt="해설 이용권을 안고 있는 풀매수 새싹" /><div><h3>풀매수 · 상세 해설 이용권</h3><p className="field-help">보유 수량 연결 준비 중</p></div></div><p>광고 완료 시 {FULLBUY_REWARD}개 받기.<br />궁금한 항목 하나를 열 때 {FULLBUY_CHAPTER_COST}개 사용.</p><Button size="large" display="block" disabled>광고 보고 풀매수 3개 받기 · 준비 중</Button><button className="secondary-button" disabled>풀매수 구매 · 준비 중</button><p className="field-help">실제 광고·차감·구매는 연결 전입니다. 보상형 광고와 구매 상품 등록 후 활성화합니다.</p></div>
      {FULLBUY_CHAPTERS.map((chapter, index) => <article className="fullbuy-chapter" key={chapter.id}><span className="chapter-index">0{index + 1}</span><h3>{chapter.title}</h3><p>{chapter.description}</p><button className="secondary-button" aria-expanded={selected === chapter.id} aria-controls={`chapter-${chapter.id}`} onClick={() => setSelected(selected === chapter.id ? null : chapter.id)}>풀매수 {FULLBUY_CHAPTER_COST}개로 열기 · 미리보기</button>
        {selected === chapter.id && <div className="unlock-confirm" id={`chapter-${chapter.id}`}><strong>이 항목에 풀매수 3개를 사용할까요?</strong><p>연결 후에는 해설이 저장됐을 때만 차감하고, 같은 결과의 같은 항목은 다시 차감하지 않도록 구현합니다.</p><Button display="block" disabled>풀매수 사용 연결 준비 중</Button><details><summary>차감 없이 문장 예시 살펴보기</summary><p className="example-copy">{chapter.example}</p></details></div>}</article>)}
      <p className="field-help">세 항목을 모두 열면 총 9개입니다. 항목마다 선택하며, 광고가 아닌 구매로도 충전할 수 있도록 준비합니다.</p>
    </section>
    <section className="return-section"><h2>어떤 관계가 궁금하신가요?</h2><p>두 사람의 정보 입력 화면을 먼저 살펴보세요.</p><Button size="large" display="block" onClick={onStart}>두 사람 정보 입력하기</Button></section>
    {onNetwork && <button className="secondary-button" onClick={onNetwork}>친구 네트워크의 다른 관계 보기</button>}
  </>;
}
