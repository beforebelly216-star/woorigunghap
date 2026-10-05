// Local Vite QA fixture only; not an entry in the production miniapp bundle.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { FullbuyPanel } from '../src/fullbuy-panel';
import '../src/style.css';
const content=JSON.stringify({title:'서로의 대화를 함께 맞춰보기',paragraphs:[
  '가상 화면 검증을 위한 해설입니다. 계산 지표는 대화 방식을 돌아보는 참고 자료이며 실제 성격을 단정하지 않습니다. 두 사람이 편안했던 대화의 상황을 함께 확인해 보세요.',
  '평소 말하고 싶은 순간과 잠시 쉬고 싶은 순간이 달랐는지 이야기해 보세요. 상대방의 의도를 미리 단정하기보다 직접 질문하고 다음 대화에서 함께 시도할 방법을 정할 수 있습니다.'],
  action:'서로 편안했던 대화 한 가지를 나누고, 다음에는 어떤 방식으로 이야기를 시작하면 좋을지 함께 정해보세요.'});
let balance=9,loseResponse=false;
const saved=new Map();
const session={ready:true,request:async(path,options={})=>{
  if(path==='/api/toss/wallet')return {balance,paid:balance,reward:0,reserved:0,purchase:null};
  const body=JSON.parse(options.body);
  if(body.action==='library')return {chapters:[...saved].map(([chapterKey,value])=>({chapterKey,content:value.content,savedAt:'2026-10-05T00:00:00.000Z'}))};
  const state=saved.get(body.chapter)||{status:'unopened'};
  if(body.action==='open'&&state.status!=='ready'){
    if(balance<3)return {status:'insufficient',wallet:{balance}};
    balance-=3;saved.set(body.chapter,{status:'ready',content});
    if(loseResponse){loseResponse=false;throw new Error('가상 응답 유실: 상태 확인으로 저장 결과를 복구해 주세요.');}
  }
  return {...(saved.get(body.chapter)||state),wallet:{balance}};
}};
createRoot(document.getElementById('root')).render(<TDSMobileAITProvider><main className="shell"><p className="preview-note">가상 QA · 서버·광고·결제·AI 호출 없음</p><h1>풀매수 사용 화면</h1><p>가상 잔액으로 항목 사용과 저장 재열람을 확인합니다.</p><button className="secondary-button" onClick={()=>{loseResponse=true;}}>다음 생성 응답 유실 시뮬레이션</button><FullbuyPanel session={session} pair={{networkId:'fictional',memberAId:'a',memberBId:'b'}} onExpired={()=>{}}/></main></TDSMobileAITProvider>);
