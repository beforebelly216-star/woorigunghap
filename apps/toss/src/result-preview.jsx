import React, { useState } from 'react';
import { Button } from '@toss/tds-mobile';

const chapters = [
  { title: '같은 말인데, 왜 다르게 들릴까요?', description: '각자 편안하게 느끼는 대화 방식과 오해를 줄이는 표현', example: '예시: 바로 답을 정리해 주는 것이 배려인 사람도, 충분히 들어주는 것이 배려인 사람도 있습니다. 조언을 하기 전에 “같이 방법을 찾을까요, 조금 더 들어드릴까요?”라고 물으면 대화의 방향을 맞추기 쉽습니다.' },
  { title: '우리의 장점을 더 잘 쓰려면?', description: '두 사람의 성향이 함께 살아나는 상황과 관계의 강점', example: '예시: 계획을 세우는 역할과 새로운 선택지를 찾는 역할을 나누면 서로 다른 성향을 장점으로 활용할 수 있습니다. 실제 해설은 두 사람의 계산 근거에 맞춰 작성됩니다.' },
  { title: '갈등이 생겼을 때, 첫마디는?', description: '반복되는 엇갈림을 정리하고 대화를 시작하는 방법', example: '예시: “왜 늘 그래요?”보다 “그때 저는 이렇게 느꼈어요”처럼 특정 상황과 자신의 느낌부터 말해 보세요. 상대의 속마음을 단정하는 문장은 제공하지 않습니다.' },
];

export function ResultPreview({ onStart }) {
  const [selected, setSelected] = useState(0);
  return <>
    <p className="eyebrow">결과 구성 미리보기</p><h1>점수 다음에,<br />궁금한 이야기가 있습니다.</h1>
    <p>아래는 화면 구성과 문장 예시입니다.<br />입력한 정보의 실제 분석 결과가 아닙니다.</p>
    <section className="free-result"><span className="pill">기본 결과 · 시청 없이 무료</span><h2>먼저, 두 사람을 이해하는 단서</h2>
      <ul className="benefits"><li>두 사람의 궁합 점수와 세부 지표</li><li>각자의 성향과 서로 다른 지점</li><li>잘 맞는 부분과 조율할 부분의 계산 근거</li></ul>
      <p className="field-help">실제 계산 전에는 점수나 개인화된 결과를 표시하지 않습니다.</p>
    </section>
    <section className="detail-preview" aria-labelledby="detail-heading"><p className="eyebrow">더 알고 싶은 순간에</p><h2 id="detail-heading">두 사람에게 맞는 대화의 힌트</h2><p>추가 해설에서는 계산 근거를 일상에서 써볼 수 있는 말과 행동으로 풀어드립니다.</p>
      {chapters.map((chapter, index) => <div className="chapter" key={chapter.title}><button className="chapter-toggle" aria-expanded={selected === index} aria-controls={`chapter-${index}`} onClick={() => setSelected(selected === index ? null : index)}><span className="chapter-index">0{index + 1}</span><span><strong>{chapter.title}</strong><span className="subtitle">{chapter.description}</span></span><span aria-hidden="true">{selected === index ? '−' : '+'}</span></button>
        {selected === index && <p className="example-copy" id={`chapter-${index}`}>{chapter.example}</p>}</div>)}
      <div className="unlock-summary"><span className="pill">선택형 광고</span><h3>광고 1회로 추가 해설 한 묶음</h3><p>위의 세 가지 주제를 함께 열어보는 방식으로 준비하고 있습니다. 기본 결과는 그대로 볼 수 있습니다.</p><Button size="large" display="block" disabled>추가 해설 연결 준비 중</Button><p className="field-help">현재는 광고가 재생되지 않습니다. 실제 해설·저장 기능 연결 후 활성화합니다.</p></div>
    </section>
    <section className="return-section"><h2>어떤 관계가 궁금하신가요?</h2><p>두 사람의 정보 입력 화면을 먼저 살펴보세요.</p><Button size="large" display="block" onClick={onStart}>두 사람 정보 입력하기</Button></section>
  </>;
}
