import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { BirthFields } from './input-preview';
import { networkPerson, networkRequest } from './network-client';

const messages={invalid_person:'생년정보와 달력·윤달·출생시간을 다시 확인해 주세요.',network_create_limit:'동시에 유지할 수 있는 네트워크는 5개입니다. 기존 네트워크를 이용해 주세요.',
  network_request_conflict:'처음 만든 정보와 다릅니다. 내 네트워크를 불러와 확인해 주세요.',network_input_conflict:'이미 참여한 정보와 다릅니다. 내 네트워크를 불러와 확인해 주세요.',
  network_join_unavailable:'참여할 수 없습니다. 같은 별칭이 있는지, 12명이 가득 찼는지 방장에게 확인해 주세요.',network_not_available:'만료되었거나 참여 권한이 없는 네트워크입니다.',
  network_version_expired:'계산 기준이 갱신되었습니다. 새 네트워크를 만들어 주세요.',consent_expired:'공개 동의를 다시 확인해야 합니다. 새 네트워크를 이용해 주세요.',pair_not_available:'참여자가 바뀌었습니다. 관계 목록을 새로고침해 주세요.'};

export function NetworkScreen({session,user,flow,onFlow,onLogin,onExpired,onRemoved,onPair,onShare}) {
  const {person,invite,mode,requestId,network,createdInvite}=flow;
  const update=(key,value)=>onFlow(previous=>({...previous,[key]:value}));
  const setPerson=v=>update('person',v),setInvite=v=>update('invite',v),setMode=v=>update('mode',v),setRequestId=v=>update('requestId',v);
  const setNetwork=v=>update('network',v),setCreatedInvite=v=>update('createdInvite',v);
  const [consent,setConsent]=useState(false),[mine,setMine]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
  const [saved,setSaved]=useState(null);
  const pending=useRef(null);
  useEffect(()=>()=>pending.current?.abort(),[]);
  async function run(body) {
    if(pending.current)return; const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
    try {const result=await networkRequest(session,body,controller.signal);if(controller.signal.aborted)return;
      if(result.network){setNetwork(result.network);setCreatedInvite(result.network.invite);}if(result.networks)setSaved(result.networks);if(result.invite)setCreatedInvite(result.invite);
      if(result.result)onPair(result.result,{networkId:body.networkId,memberAId:body.memberAId,memberBId:body.memberBId});if(result.left||result.closed){setNetwork(null);setCreatedInvite('');setRequestId(crypto.randomUUID());setConfirm(false);onRemoved();}
    } catch(e){if(!controller.signal.aborted){setError(messages[e.code]||e.message);if(e.code==='network_not_available'){setNetwork(null);setCreatedInvite('');setRequestId(crypto.randomUUID());onRemoved();}if(e.status===401)onExpired();}}
    finally{if(!controller.signal.aborted)setBusy(false);if(pending.current===controller)pending.current=null;}
  }
  const own=network?.members.find(m=>m.isSelf);
  const pairs=network?.pairs.filter(p=>!mine||p.memberAId===own?.id||p.memberBId===own?.id)||[];
  const name=id=>network.members.find(m=>m.id===id)?.displayName;
  return <>
    <p className="eyebrow">각자 참여하는 친구 네트워크</p><h1>함께 모여,<br/>우리 사이를 살펴보세요.</h1>
    <p>각자 자신의 정보로 참여합니다. 공개에 동의한 참여자만 모든 두 사람의 기본 결과를 볼 수 있습니다.</p>
    {error&&<p role="alert" className="notice">{error}</p>}
    {network?<>
      <section className="network-summary"><h2>{network.members.length}명 사이, {network.pairs.length}개의 연결</h2>
        <div className="network-members">{network.members.map(m=><span key={m.id} className="member-chip">{m.displayName}{m.isSelf?' · 나':''}</span>)}</div>
        <p className="field-help">{new Date(network.expiresAt).toLocaleDateString('ko-KR')}까지 유지됩니다. 참여자에게 생년월일과 출생시간은 공개하지 않습니다.</p>
        {createdInvite&&<><Button display="block" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onShare(createdInvite);}catch{setError('토스 앱에서 초대 링크를 공유해 주세요.');}finally{setBusy(false);}}}>친구 초대 링크 공유하기</Button><p className="field-help">초대 링크를 받아도 로그인하고 직접 참여하기 전에는 결과를 볼 수 없습니다.</p></>}
        <button className="secondary-button" disabled={busy} onClick={()=>run({action:'view',networkId:network.id})}>참여자 새로고침</button>
      </section>
      <div className="network-filters"><button disabled={busy} aria-pressed={!mine} onClick={()=>setMine(false)}>전체 관계</button><button disabled={busy} aria-pressed={mine} onClick={()=>setMine(true)}>내 관계</button></div>
      {pairs.length?pairs.map(p=><button disabled={busy} className="pair-row" key={`${p.memberAId}:${p.memberBId}`} onClick={()=>run({action:'pair',networkId:network.id,...p})}><span><strong>{name(p.memberAId)} · {name(p.memberBId)}</strong><span className="subtitle">기본 결과 무료 · 상세 항목별 풀매수 3개</span></span><span aria-hidden="true">›</span></button>):<p>친구가 참여하면 두 사람의 연결이 생깁니다.</p>}
      {confirm?<div className="notice"><strong>{network.isOwner?'네트워크 전체를 삭제할까요?':'네트워크에서 나갈까요?'}</strong><p>{network.isOwner?'참여자 정보가 삭제되고 초대 링크도 만료됩니다.':'내 정보가 삭제되고 모든 관계 결과에 대한 접근이 종료됩니다.'}</p><Button disabled={busy} onClick={()=>run({action:network.isOwner?'close':'leave',networkId:network.id})}>확인하고 {network.isOwner?'삭제하기':'나가기'}</Button><button disabled={busy} onClick={()=>setConfirm(false)}>취소</button></div>:<button className="text-button muted" disabled={busy} onClick={()=>setConfirm(true)}>{network.isOwner?'네트워크 삭제':'네트워크 나가기'}</button>}
    </>:<>
      {user&&<section><h2>참여한 네트워크</h2><button className="secondary-button" disabled={busy} onClick={()=>run({action:'list'})}>내 네트워크 불러오기</button>{saved?.length===0&&<p>아직 참여한 네트워크가 없습니다.</p>}{saved?.map((n,i)=><button key={n.id} disabled={busy} className="pair-row" onClick={()=>run({action:'view',networkId:n.id})}>{n.isOwner?'내가 만든':'참여한'} 네트워크 {i+1} · {new Date(n.expiresAt).toLocaleDateString('ko-KR')}까지</button>)}</section>}
      <div className="network-filters"><button aria-pressed={mode==='create'} disabled={busy} onClick={()=>{setMode('create');setConsent(false);}}>새로 만들기</button><button aria-pressed={mode==='join'} disabled={busy} onClick={()=>{setMode('join');setConsent(false);}}>초대로 참여하기</button></div>
      <form onSubmit={e=>{e.preventDefault();if(user&&consent&&session.ready)run({action:mode,person:networkPerson(person),consent,requestId,invite});}}>
        <fieldset disabled={busy}><BirthFields title="내 정보" value={person} onChange={v=>{setPerson(v);setConsent(false);}}/>
        {mode==='join'&&<label>초대 코드<input required pattern="[a-f0-9]{64}" value={invite} onChange={e=>setInvite(e.target.value.trim())} placeholder="초대 링크로 들어오면 자동 입력됩니다"/></label>}
        <div className="notice"><strong>참여 전 확인해 주세요</strong><p>별칭과 나를 포함한 모든 두 사람의 궁합 결과를 이 네트워크 참여자에게 공개합니다. 생년정보는 암호화하여 서버에 보관하며, 네트워크는 30일 후 만료됩니다. 직접 나가면 내 정보가 삭제됩니다.</p></div>
        <label className="check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>참여자 간 별칭·모든 쌍의 결과 공개와 내 생년정보 이용에 동의합니다</label>
        </fieldset>
        {user?<Button type="submit" display="block" disabled={busy||!consent||!session.ready}>{busy?'네트워크 확인 중':mode==='create'?'동의하고 네트워크 만들기':'동의하고 참여하기'}</Button>:<Button type="button" display="block" disabled={!session.ready} onClick={onLogin}>토스 로그인 후 참여하기</Button>}
      </form>
      {!session.ready&&<p className="field-help">현재 개발 화면입니다. 서버 연결 전에는 정보를 전송하지 않습니다.</p>}
    </>}
  </>;
}
