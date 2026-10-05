import { validateBasicResult } from './basic-client';
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function validateNetwork(network) {
  if(!id.test(network?.id)||!/^[a-f0-9]{64}$/.test(network.invite||'')||!Number.isFinite(Date.parse(network.expiresAt))||network.memberLimit!==12
    ||typeof network.isOwner!=='boolean'||!Array.isArray(network.members)||network.members.length<1||network.members.length>12
    ||!network.members.every(m=>id.test(m?.id)&&typeof m.displayName==='string'&&m.displayName.length>0&&m.displayName.length<=20&&typeof m.isSelf==='boolean')
    ||new Set(network.members.map(m=>m.id)).size!==network.members.length||network.members.filter(m=>m.isSelf).length!==1
    ||!Array.isArray(network.pairs)||network.pairs.length!==network.members.length*(network.members.length-1)/2) throw new Error('네트워크 응답을 확인하지 못했습니다.');
  const seen=new Set();
  for(const p of network.pairs){const key=[p.memberAId,p.memberBId].sort().join(':');
    if(p.memberAId===p.memberBId||![p.memberAId,p.memberBId].every(v=>network.members.some(m=>m.id===v))||seen.has(key))throw new Error('관계 목록을 확인하지 못했습니다.');seen.add(key);}
  return network;
}
export function networkPerson(value) {
  return {displayName:value.name.trim(),gender:value.gender,calendarType:value.calendar,birthDate:value.date,
    birthTimeKnown:!value.unknownTime,birthTime:value.unknownTime?null:value.time,isLeapMonth:value.calendar==='lunar'&&value.leapMonth};
}
export async function networkRequest(session,body,signal) {
  const response=await session.request('/api/toss/network',{method:'POST',body:JSON.stringify(body),signal});
  if(['create','join','view'].includes(body.action))validateNetwork(response?.network);
  if(body.action==='create'&&!/^[a-f0-9]{64}$/.test(response?.invite))throw new Error('초대 응답을 확인하지 못했습니다.');
  if(body.action==='pair')validateBasicResult(response?.result);
  if(body.action==='list'&&(!Array.isArray(response?.networks)||response.networks.length>50||!response.networks.every(n=>id.test(n?.id)&&Number.isFinite(Date.parse(n.expiresAt))&&typeof n.isOwner==='boolean')))throw new Error('네트워크 목록을 확인하지 못했습니다.');
  return response;
}
