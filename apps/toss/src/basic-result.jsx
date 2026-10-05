import React from 'react';
import { Button } from '@toss/tds-mobile';
import { FULLBUY_CHAPTERS, FULLBUY_CHAPTER_COST } from './fullbuy-policy';

export function BasicResult({result,sample=false,networkLive=false,onEdit,onPreview,onNetwork}) {
  return <>
    <p className="eyebrow">{sample?'가상 정보로 계산한 예시':'광고 없이 무료 · 기본 계산 결과'}</p>
    <h1>{result.names.join(' · ')}<br />두 사람의 기본 궁합</h1>
    {sample&&<p className="preview-inline">서버 계산 엔진으로 만든 가상 예시입니다. 입력하신 개인 결과가 아닙니다.</p>}
    <section className="basic-score" aria-label="기본 궁합 점수"><span className="pill">{result.relationshipLabel} · {result.grade}등급</span><p><strong>{result.score}</strong><span> / 100</span></p><p className="field-help">관계 이해를 위한 사주 계산 지표이며, 실제 관계의 성공 확률을 뜻하지 않습니다.</p></section>
    <section className="value-summary"><h2>먼저 살펴볼 강점</h2><div className="network-members">{result.strengths.map(item=><span className="member-chip" key={item.id}>{item.label}</span>)}</div><p>계산 지표 중 상대적으로 높은 항목입니다. 두 사람이 편안하게 느끼는 상황을 함께 떠올려 보세요.</p></section>
    <section><h2>서로 맞춰볼 부분</h2><ul className="benefits">{result.adjustments.map(item=><li key={item.id}>{item.label}</li>)}</ul><p>낮은 지표만으로 갈등을 단정하지 않습니다. 평소 서로 다르게 느낀 상황을 대화로 확인해 보세요.</p></section>
    <details className="basic-evidence"><summary>항목별 점수와 결과 범위 보기</summary><p className="field-help">각 항목은 100점 척도의 계산 지표입니다. 총점은 관계 유형별 가중치를 반영하므로 아래 점수의 단순 평균과 다릅니다.</p>{result.dimensions.map(item=><div className="dimension-row" key={item.id}><span>{item.label}</span><strong>{item.score}</strong></div>)}<p className="field-help">계산 범위 {result.scoreRange.min}~{result.scoreRange.max}점. {result.timeUnknown?'출생시간을 몰라 여러 시간대의 결과를 함께 살폈습니다.':'출생시간과 날짜 경계를 반영한 범위입니다.'}</p></details>
    <section className="return-section"><h2>어떤 이야기가 더 궁금하세요?</h2><p>상세 해설은 항목마다 풀매수 {FULLBUY_CHAPTER_COST}개로 이용하도록 준비하고 있습니다.</p>{FULLBUY_CHAPTERS.map(chapter=><article className="fullbuy-chapter" key={chapter.id}><h3>{chapter.title}</h3><p>{chapter.description}</p><Button display="block" disabled>풀매수 3개로 열기 · 연결 준비 중</Button></article>)}<button className="secondary-button" onClick={onPreview}>풀매수 사용 방식 미리 보기</button></section>
    <Button display="block" onClick={onEdit}>{sample?'두 사람 정보 입력하기':'입력 수정하기'}</Button>
    <button className="secondary-button" onClick={onNetwork}>{networkLive?'친구 네트워크로 돌아가기':'친구 네트워크 미리 보기'}</button>
    <p className="field-help">{sample?'예시에는 계정·광고·AI가 사용되지 않습니다.':'현재 결과는 앱을 열어둔 동안만 유지됩니다. 닫거나 새로고침하면 사라집니다.'} 개인 결과의 보관과 추가 해설은 연결 준비 중입니다.</p>
  </>;
}
