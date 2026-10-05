import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { IAP } from '@apps-in-toss/web-framework';
import { FULLBUY_CHAPTERS } from './fullbuy-policy';
import { createIapClient } from './iap-client';

function narrative(raw) {
  const value=JSON.parse(raw);
  if(typeof value?.title!=='string'||typeof value.action!=='string'||!Array.isArray(value.paragraphs)||value.paragraphs.length!==2||!value.paragraphs.every(p=>typeof p==='string'))throw new Error('저장된 해설을 확인하지 못했습니다.');
  return value;
}
function Explanation({content}) {
  const value=narrative(content);
  return <div className="chapter-explanation"><h3>{value.title}</h3>{value.paragraphs.map((p,i)=><p key={i}>{p}</p>)}<p className="notice">함께 해보기: {value.action}</p><p className="field-help">AI가 계산 지표를 바탕으로 작성한 참고 해설입니다. 실제 성격이나 미래를 단정하지 않습니다.</p></div>;
}
export function FullbuyPanel({session,pair,onExpired,libraryOnly=false}) {
  const [wallet,setWallet]=useState(null),[states,setStates]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[library,setLibrary]=useState(null),[product,setProduct]=useState(null);
  const [uncertain,setUncertain]=useState(false);
  const pending=useRef(null),purchaseCleanup=useRef(null),iap=useRef(null),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current?.abort();purchaseCleanup.current?.();};},[]);
  const request=(action,chapter,signal)=>session.request('/api/toss/chapters',{method:'POST',body:JSON.stringify({action,chapter,...pair}),signal});
  async function run(task) {
    if(pending.current||purchaseCleanup.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
    try{await task(controller.signal);}catch(e){if(!controller.signal.aborted){setError(e.message);if(e.status===401)onExpired();}}
    finally{if(mounted.current&&!controller.signal.aborted)setBusy(false);if(pending.current===controller)pending.current=null;}
  }
  async function refresh(signal) {
    const response=await session.request('/api/toss/wallet',{signal});
    if(!Number.isSafeInteger(response?.balance)||response.balance<0)throw new Error('풀매수 잔액을 확인하지 못했습니다.');
    if(signal.aborted)return;setWallet(response);
    if(pair){const values=await Promise.all(FULLBUY_CHAPTERS.map(async c=>[c.id,await request('status',c.id,signal)]));if(!signal.aborted)setStates(Object.fromEntries(values));}
    if(!signal.aborted)setUncertain(false);
  }
  async function open(chapter,signal) {
    // An uncertain request stays locked until an explicit server status check.
    setStates(previous=>({...previous,[chapter]:{status:'unknown'}}));
    setUncertain(true);
    const response=await request('open',chapter,signal);if(signal.aborted)return;
    if(!['ready','pending','insufficient','exhausted'].includes(response?.status))throw new Error('상세 처리 상태를 확인하지 못했습니다.');
    if(response.status==='ready')narrative(response.content);
    setStates(previous=>({...previous,[chapter]:response}));if(response.wallet)setWallet(previous=>({...previous,...response.wallet}));
    setUncertain(false);
  }
  async function showProduct(signal) {
    const response=await IAP.getProductItemList();if(signal.aborted)return;
    const selected=response?.products?.find(p=>p.sku===wallet.purchase.sku);
    if(!selected||typeof selected.displayName!=='string'||typeof selected.displayAmount!=='string')throw new Error('등록된 상품 정보를 불러오지 못했습니다.');
    setProduct(selected);
  }
  function purchase() {
    if(busy||pending.current||purchaseCleanup.current||!wallet?.purchase||!product)return;
    setBusy(true);setError('');
    iap.current=createIapClient({sdk:IAP,grant:input=>session.request('/api/toss/iap/grant',{method:'POST',body:JSON.stringify(input)})});
    let finished=false;
    const finish=()=>{finished=true;purchaseCleanup.current=null;if(mounted.current){setBusy(false);setProduct(null);}};
    try{const cleanup=iap.current.purchase(product.sku,()=>{finish();if(mounted.current)run(refresh);},e=>{finish();if(mounted.current)setError(e?.message||'결제를 완료하지 못했습니다. 미결 주문 확인으로 지급 상태를 확인해 주세요.');});if(mounted.current&&!finished)purchaseCleanup.current=cleanup;}
    catch(e){finish();setError(e.message);}
  }
  async function recover(signal) {
    const client=createIapClient({sdk:IAP,grant:input=>session.request('/api/toss/iap/grant',{method:'POST',body:JSON.stringify(input),signal})});
    await client.recover();await refresh(signal);
  }
  return <section className="return-section"><h2>{libraryOnly?'내 풀매수와 저장 해설':'어떤 이야기가 더 궁금하세요?'}</h2>
    <p>상세 항목 하나에 풀매수 3개를 사용합니다. 저장된 같은 해설은 다시 사용할 때 차감하지 않습니다.</p>
    {error&&<p role="alert" className="notice">{error}</p>}
    <div className="fullbuy-wallet"><img src="/fullbuy.png" alt="" width="48" height="48"/><strong>{uncertain?'처리 후 잔액 확인이 필요합니다':wallet?`내 풀매수 ${wallet.balance}개`:'내 풀매수를 확인해 주세요'}</strong></div>
    <button className="secondary-button" disabled={busy||!session.ready} onClick={()=>run(refresh)}>잔액·항목 상태 확인</button>
    {!libraryOnly&&FULLBUY_CHAPTERS.map(c=>{const state=states[c.id];const known=['unopened','failed'].includes(state?.status);return <article className="fullbuy-chapter" key={c.id}><h3>{c.title}</h3><p>{c.description}</p>
      {state?.status==='ready'?<Explanation content={state.content}/>:<><Button display="block" disabled={busy||uncertain||!pair||!known||!wallet||wallet.balance<3||(state?.attempts>=2)} onClick={()=>run(signal=>open(c.id,signal))}>풀매수 3개로 열기</Button>
        {['pending','unknown'].includes(state?.status)&&<p role="status">처리 결과를 아직 확인하지 못했습니다. 추가 생성 없이 ‘잔액·항목 상태 확인’을 눌러 확인해 주세요.</p>}
        {state?.status==='failed'&&<p className="field-help">생성되지 않은 항목의 풀매수는 반환됩니다. {state.attempts>=2?'재시도 한도에 도달했습니다.':'다시 열기는 직접 선택하실 수 있습니다.'}</p>}
        {state?.status==='exhausted'&&<p className="field-help">재시도 한도에 도달했습니다.</p>}
        {state?.status==='insufficient'&&<p className="field-help">풀매수가 부족합니다. 잔액을 확인해 주세요.</p>}</>}
    </article>;})}
    {!libraryOnly&&!pair&&<p className="field-help">현재 상세 해설은 로그인한 친구 네트워크의 관계에서 연결됩니다.</p>}
    <button className="secondary-button" disabled={busy||!session.ready} onClick={()=>run(async signal=>{const response=await request('library',undefined,signal);if(!Array.isArray(response?.chapters))throw new Error('보관함을 확인하지 못했습니다.');response.chapters.forEach(c=>narrative(c.content));if(!signal.aborted)setLibrary(response.chapters);})}>내 저장 해설 보기</button>
    {library&&<div><h3>내 저장 해설</h3>{library.length?library.map(c=><article key={c.chapterKey}><p className="field-help">저장일 {new Date(c.savedAt).toLocaleDateString('ko-KR')}</p><Explanation content={c.content}/></article>):<p>아직 저장한 해설이 없습니다.</p>}</div>}
    <Button display="block" disabled={busy||!wallet?.purchase} onClick={()=>run(showProduct)}>풀매수 상품 확인</Button>
    {product&&<div className="notice"><p>{product.displayName} · {product.displayAmount}</p><p>풀매수 {wallet.purchase.amount}개 · 상세 항목마다 3개 사용</p><Button disabled={busy} onClick={purchase}>토스 결제로 구매하기</Button><button className="secondary-button" disabled={busy} onClick={()=>setProduct(null)}>닫기</button></div>}
    <button className="secondary-button" disabled={busy||!wallet?.purchase} onClick={()=>run(recover)}>미결 주문 지급 확인</button>
    {!wallet?.purchase&&<p className="field-help">상품 등록과 결제 검증을 준비하고 있습니다. 보상형 광고도 별도 연결 후 제공됩니다.</p>}
  </section>;
}
