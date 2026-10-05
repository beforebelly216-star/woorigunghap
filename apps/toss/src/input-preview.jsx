import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@toss/tds-mobile';

export const emptyPerson = () => ({ name: '', gender: '', calendar: 'solar', date: '', time: '', unknownTime: false, leapMonth: false });

export function BirthFields({ title, value, onChange }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  const today = new Date();
  const maximumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <fieldset><legend>{title}</legend>
    <label>이름 또는 별칭<input required pattern=".*\S.*" autoComplete="off" maxLength={20} value={value.name} onChange={e => update('name', e.target.value)} placeholder="실명 대신 별칭도 괜찮습니다" /></label>
    <div className="field-row"><label>성별<select required value={value.gender} onChange={e => update('gender', e.target.value)}><option value="" disabled>선택해 주세요</option><option value="female">여성</option><option value="male">남성</option></select></label>
      <label>달력<select value={value.calendar} onChange={e => onChange({ ...value, calendar: e.target.value, leapMonth: false })}><option value="solar">양력</option><option value="lunar">음력</option></select></label></div>
    {value.calendar === 'lunar' && <label className="check"><input type="checkbox" checked={value.leapMonth} onChange={e => update('leapMonth', e.target.checked)} />음력 윤달에 태어났습니다</label>}
    <label>생년월일<input required type={value.calendar === 'solar' ? 'date' : 'text'} pattern="[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|30)" placeholder={value.calendar === 'lunar' ? '예: 1995-02-30' : undefined} min="1900-01-01" max={maximumDate} value={value.date} onChange={e => update('date', e.target.value)} /></label>
    {value.calendar === 'lunar' && <p className="field-help">음력 날짜를 YYYY-MM-DD 형식으로 입력해 주세요. 실제 날짜의 유효성은 분석 연결 후 서버에서 확인합니다.</p>}
    <label>출생시간<input type="time" required={!value.unknownTime} disabled={value.unknownTime} value={value.unknownTime ? '' : value.time} onChange={e => update('time', e.target.value)} /></label>
    <label className="check"><input type="checkbox" checked={value.unknownTime} onChange={e => update('unknownTime', e.target.checked)} />출생시간을 모릅니다</label>
    <p className="field-help">시간을 몰라도 기본 결과를 볼 수 있습니다. 일부 해석의 범위는 달라질 수 있습니다.</p>
  </fieldset>;
}

export function InputPreview({ path, draft, onChange, onPreview, onCalculate, onCalculated, authenticated=false, serverReady=false, onLogin, onSessionExpired, resumeReview=false }) {
  const [step, setStep] = useState(resumeReview ? path==='/one-to-one'?2:1 : 0);
  const [partnerConsent,setPartnerConsent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [fieldErrors,setFieldErrors]=useState([]);
  const pending=useRef(null);
  useEffect(()=>()=>pending.current?.abort(),[]);
  useEffect(()=>{setPartnerConsent(false);setError('');setFieldErrors([]);},[draft]);
  async function calculate() {
    if (pending.current || !onCalculate || !partnerConsent) return;
    const controller=new AbortController(); pending.current=controller;
    setBusy(true);setError('');setFieldErrors([]);
    try {
      const result=await onCalculate(draft,partnerConsent,controller.signal);
      if (!controller.signal.aborted) onCalculated(result);
    } catch(failure) {
      if (!controller.signal.aborted) {
        setError(failure.message);setFieldErrors(Object.values(failure.fieldErrors||{}));
        if (failure.status===401) onSessionExpired?.();
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (pending.current===controller) pending.current=null;
    }
  }
  const formRef = useRef(null);
  useEffect(() => {
    const heading = formRef.current?.querySelector('legend, h2');
    heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
  }, [step]);
  const pair = path === '/one-to-one';
  const stages = pair ? ['내 정보', '상대방 정보', '입력 확인'] : ['내 정보', '입력 확인'];
  const reviewing = step === stages.length - 1;
  const next = e => { e.preventDefault(); if (!reviewing) { setStep(value => value + 1); window.scrollTo(0, 0); } };
  const personSummary = (person, title) => <div className="review-person"><h3>{title}</h3><strong>{person.name.trim()}</strong><p>{person.date} · {person.calendar === 'solar' ? '양력' : person.leapMonth ? '음력 윤달' : '음력'} · {person.unknownTime ? '출생시간 모름' : person.time}</p></div>;
  return <>
    <ol className="steps" aria-label="입력 단계">{stages.map((title, index) => <li key={title} aria-current={step === index ? 'step' : undefined}><span>{index + 1}</span>{title}</li>)}</ol>
    <form ref={formRef} onSubmit={next}>
      {!reviewing ? <><BirthFields title={stages[step]} value={step === 0 ? draft.self : draft.partner} onChange={person => onChange({ ...draft, [step === 0 ? 'self' : 'partner']: person })} />
        {pair && step === 1 && <label>관계 유형<select required value={draft.relationship} onChange={e => onChange({ ...draft, relationship: e.target.value })}><option disabled value="">선택해 주세요</option>{['짝사랑', '썸', '연인', '친구', '직장동료'].map(value => <option key={value}>{value}</option>)}</select></label>}
        {pair && step===1 && draft.relationship==='직장동료' && <label>상대방의 직장 내 위치<select required value={draft.coworkerHierarchy||''} onChange={e=>onChange({...draft,coworkerHierarchy:e.target.value})}><option value="" disabled>선택해 주세요</option><option value="boss">내 상사</option><option value="peer">동급 동료</option><option value="subordinate">내 부하</option></select></label>}
        <Button type="submit" size="large" display="block">{step === stages.length - 2 ? '입력 내용 확인하기' : '상대방 정보 입력하기'}</Button>
      </> : <>
        <h2>입력 내용을 확인해 주세요</h2>{personSummary(draft.self, '내 정보')}{pair && personSummary(draft.partner, '상대방 정보')}
        {pair && <p className="relationship-summary">관계 · {draft.relationship}{draft.relationship === '직장동료' && ` · ${{boss:'내 상사',peer:'동급 동료',subordinate:'내 부하'}[draft.coworkerHierarchy] || '위치 미선택'}`}</p>}
        <div className="value-summary"><strong>기본 결과는 광고 시청 없이</strong><p>기본 점수와 계산 지표는 무료입니다. 추가 해설은 항목마다 풀매수 3개로 선택하도록 준비하고 있습니다.</p></div>
        {pair && serverReady ? <><p className="disclosure">계산하기를 누르면 두 사람의 별칭과 생년정보를 우리사주 서버에 전송합니다. 이 기본 계산에는 외부 AI를 사용하지 않습니다.</p><label className="check"><input type="checkbox" checked={partnerConsent} disabled={busy} onChange={e=>setPartnerConsent(e.target.checked)} />상대방의 정보 사용에 동의를 받았습니다</label>{error&&<div className="notice" role="alert"><strong>{error}</strong>{fieldErrors.length>0&&<ul>{fieldErrors.map((value,index)=><li key={index}>{value}</li>)}</ul>}</div>}{authenticated?<Button size="large" display="block" disabled={busy||!partnerConsent} onClick={calculate}>{busy?'기본 결과 계산 중':'무료 기본 결과 계산하기'}</Button>:<Button size="large" display="block" onClick={onLogin}>토스 로그인 후 무료로 계산하기</Button>}</>:<><p className="disclosure">서버 연결 전에는 정보를 전송하지 않습니다. 현재는 입력 화면을 확인하실 수 있습니다.</p><Button size="large" display="block" disabled>분석 연결 준비 중</Button></>}
        {pair && <button type="button" className="secondary-button" onClick={onPreview}>어떤 결과를 받는지 미리 보기</button>}
      </>}
      {step > 0 && <button type="button" disabled={busy} className="text-button" onClick={() => { setStep(value => value - 1); window.scrollTo(0, 0); }}>← 이전 정보 수정하기</button>}
    </form>
    <p className="field-help">입력값은 앱을 열어둔 동안만 유지됩니다. 앱을 닫거나 새로고침하면 사라집니다.</p>
    <button className="text-button muted" disabled={busy} onClick={() => { onChange({ self: emptyPerson(), partner: emptyPerson(), relationship: '' }); setStep(0); }}>입력 내용 지우기</button>
  </>;
}
