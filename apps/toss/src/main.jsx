import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@toss/tds-mobile';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { SafeArea, graniteEvent, TossAuth, Environment, Share } from '@apps-in-toss/web-framework';
import { createSessionClient } from './session-client';
import { BannerAd } from './ad-components';
import { InputPreview, emptyPerson } from './input-preview';
import { ResultPreview } from './result-preview';
import { NetworkPreview } from './network-preview';
import { NetworkScreen } from './network-screen';
import { networkInvite, networkSharePath } from './network-share';
import { BasicResult } from './basic-result';
import { calculateBasic, validateBasicResult } from './basic-client';
import basicSample from './basic-sample.json';
import './style.css';

const session = createSessionClient({ apiBase: import.meta.env.VITE_API_BASE_URL, login: () => TossAuth.login() });

const services = {
  '/one-to-one': { name: '두 사람 궁합', description: '서로의 강점과 반복되는 갈등, 관계에서 조율할 부분을 살펴보세요.', status: '토스 로그인과 계산 서버 연결 후 이용할 수 있습니다. 기본 결과는 무료로 제공할 예정입니다.' },
  '/one-to-many': { name: '친구들과 관계 보기', description: '초대 링크로 함께 만드는 인연 네트워크입니다.', status: '토스 로그인과 미니앱 초대 링크 연결을 준비하고 있습니다.' },
  '/free': { name: '나와 잘 맞는 사람', description: '내 성향을 바탕으로 잘 맞는 사람의 모습을 알아보세요.', status: '토스 로그인과 계산 서버 연결 후 이용할 수 있습니다.' },
};

function Icon({ kind }) {
  const paths = { heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    people: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" /></>,
    spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /> };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reports, setReports] = useState(null);
  const [reportsError, setReportsError] = useState('');
  const [reloadReports, setReloadReports] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [previewPair, setPreviewPair] = useState(null);
  const [basicResult,setBasicResult]=useState(null);
  const [loginReturnTo,setLoginReturnTo]=useState(null);
  const [resumeInput,setResumeInput]=useState(false);
  const [networkFlow,setNetworkFlow]=useState(()=>{
    let invite=networkInvite(window.location.href);
    if(!invite){try{invite=networkInvite(Environment.initialURL);}catch{/* Native only. */}}
    return {person:emptyPerson(),invite,mode:invite?'join':'create',requestId:crypto.randomUUID(),network:null,createdInvite:''};
  });
  const clearNetwork=()=>setNetworkFlow(previous=>({...previous,network:null,createdInvite:''}));
  async function shareNetwork(invite) {
    const path=networkSharePath(invite,Environment.initialURL);
    const link=await Share.createLink({path});
    await Share.sendMessage({message:`우리 친구들 사이가 궁금하다면, 각자 참여해 보세요.\n${link}`});
  }
  const currentDraft = drafts[path] || { self: emptyPerson(), partner: emptyPerson(), relationship: '' };
  async function signIn() {
    setBusy(true); setMessage('');
    try { const result = await session.signIn(); setUser(result.user); setBasicResult(null); clearNetwork(); if (loginReturnTo) { go(loginReturnTo); setResumeInput(true); setLoginReturnTo(null); } }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setMessage('');
    try { await session.signOut(); }
    catch (error) { setMessage(error.message); }
    finally { setUser(null); setReports(null); setBasicResult(null); clearNetwork(); setBusy(false); }
  }
  useEffect(() => {
    if (path !== '/account/reports' || !user) return;
    let active = true;
    setReports(null); setReportsError('');
    session.request('/api/account/reports').then(result => { if (!Array.isArray(result?.reports)) throw new Error('보관함 응답을 확인하지 못했습니다. 다시 시도해 주세요.'); if (active) setReports(result.reports); })
      .catch(error => { if (active) { setReportsError(error.message); if (error.status === 401) setUser(null); } });
    return () => { active = false; };
  }, [path, user, reloadReports]);
  const go = (next) => { if (next !== window.location.pathname) window.history.pushState({}, '', next); setMessage(''); setResumeInput(false); setPath(next); window.scrollTo(0, 0); };
  useEffect(() => {
    const heading = document.querySelector('h1');
    heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
    document.title = `${services[path]?.name || ({ '/': '우리 사이를 이해하는 시간', '/result-preview': '결과 구성 미리보기', '/network-preview': '친구 네트워크 미리보기', '/basic-result': '무료 기본 결과', '/basic-sample': '무료 계산 결과 예시', '/login': '내 계정', '/account/reports': '보관함', '/guide': '이용 안내' })[path] || '페이지를 찾을 수 없습니다'} | 우리사주`;
  }, [path]);
  useEffect(() => {
    const pop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', pop);
    let cleanupBack; let cleanupInsets;
    try {
      const apply = ({ bottom, left, right }) => {
        document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`);
        document.documentElement.style.setProperty('--safe-left', `${left}px`);
        document.documentElement.style.setProperty('--safe-right', `${right}px`);
      };
      apply(SafeArea.get());
      cleanupInsets = SafeArea.subscribe({ onEvent: apply });
      cleanupBack = graniteEvent.addEventListener('backEvent', { onEvent: () => window.history.back() });
    } catch { /* Ordinary browser preview has no native bridge. */ }
    return () => { window.removeEventListener('popstate', pop); cleanupBack?.(); cleanupInsets?.(); };
  }, []);
  const service = services[path];
  return <TDSMobileAITProvider brandPrimaryColor="#245B45">
    <main className="shell">
      <div className="preview-note" role="status">개발 버전 · 분석·풀매수·광고·결제 연결 준비 중</div>
      {message && <p role="alert" className="notice">{message}</p>}
      {path === '/' ? <>
        <section className="intro"><p className="eyebrow">우리 사이를 이해하는 시간</p><h1>잘 맞는 순간도,<br />다른 이유도 알아보세요.</h1><p>두 사람의 성향부터 친구들과의 관계까지.<br />우리 사이를 조금 더 선명하게 살펴보세요.</p></section>
        <section><h2>어떤 관계가 궁금하세요?</h2>
          <button className="feature" onClick={() => go('/one-to-one')}><span className="feature-top"><span className="icon"><Icon kind="heart" /></span><span className="tag">기본 결과 무료</span></span><strong>두 사람 궁합</strong><p>{services['/one-to-one'].description}</p><span className="action">두 사람 궁합 살펴보기 →</span></button>
          <button className="service-row" onClick={() => go('/one-to-many')}><span className="icon"><Icon kind="people" /></span><span><strong>친구들과 관계 보기 <small>무료</small></strong><span className="subtitle">초대 링크로 함께 만드는 인연 네트워크</span></span><span aria-hidden="true">›</span></button>
          <button className="service-row" onClick={() => go('/free')}><span className="icon"><Icon kind="spark" /></span><span><strong>나와 잘 맞는 사람 <small>무료</small></strong><span className="subtitle">내 성향을 바탕으로 살펴보는 이상형</span></span><span aria-hidden="true">›</span></button>
        </section>
        <button className="secondary-button" onClick={() => go('/network-preview')}>친구 4명, 모든 관계 6쌍 살펴보기 →</button><button className="secondary-button" onClick={() => go('/basic-sample')}>실제 엔진으로 계산한 무료 결과 예시 →</button><section className="home-preview"><p className="eyebrow">점수만 보고 끝내기 아쉬우셨나요?</p><h2>두 사람의 차이를<br />대화의 힌트로 바꿔보세요.</h2><p>기본 계산 결과는 무료로, 더 깊은 해설은 풀매수로. 어떤 내용을 받는지 먼저 살펴보세요.</p><button className="secondary-button" onClick={() => { setPreviewPair(null); go('/result-preview'); }}>결과 구성 미리 보기 →</button></section>
      </> : path === '/one-to-many' ? <><button className="back" onClick={() => go('/')}>← 홈으로</button><NetworkScreen key={user?'authenticated':'guest'} session={session} user={user} flow={networkFlow} onFlow={setNetworkFlow} onLogin={()=>{setLoginReturnTo(path);go('/login');}} onExpired={()=>{setUser(null);setBasicResult(null);clearNetwork();}} onRemoved={()=>setBasicResult(null)} onPair={result=>{setBasicResult({owner:user,result,network:true});go('/basic-result');}} onShare={shareNetwork}/></> : path === '/result-preview' ? <><button className="back" onClick={() => go('/')}>← 홈으로</button><ResultPreview key={previewPair?.id || 'standalone'} pair={previewPair} onStart={() => go('/one-to-one')} onNetwork={() => go('/network-preview')} /></> : path === '/network-preview' ? <><button className="back" onClick={() => go('/')}>← 홈으로</button><NetworkPreview onPair={pair => { setPreviewPair(pair); go('/result-preview'); }} onStart={() => go('/one-to-many')} /></> : path === '/basic-sample' || path === '/basic-result' ? <><button className="back" onClick={() => go('/')}>← 홈으로</button>{path === '/basic-sample' || (basicResult && user && basicResult.owner === user) ? <BasicResult result={path === '/basic-sample' ? validateBasicResult(basicSample) : basicResult.result} sample={path === '/basic-sample'} networkLive={path==='/basic-result'&&basicResult?.network} onEdit={() => go('/one-to-one')} onPreview={() => { setPreviewPair(null);go('/result-preview'); }} onNetwork={() => go(path==='/basic-result'&&basicResult?.network?'/one-to-many':'/network-preview')} /> : <><h1>아직 계산한 결과가 없습니다</h1><p>두 사람의 정보를 입력해 무료 기본 결과를 확인해 주세요.</p><Button onClick={() => go('/one-to-one')}>두 사람 정보 입력하기</Button></>}</> : service ? <>
        <button className="back" onClick={() => go('/')}>← 홈으로</button><p className="eyebrow">우리사주</p><h1>{service.name}</h1><p>{service.description}</p>
        <p className="preview-inline">{path === '/one-to-one' && session.ready ? '무료 기본 결과 · 계산 버튼을 누르기 전에는 전송하지 않습니다' : '입력 화면 미리보기 · 서버에 전송되지 않습니다'}</p>
        <InputPreview key={`${path}:${user ? 'authenticated' : 'guest'}`} resumeReview={resumeInput} authenticated={Boolean(user)} serverReady={path === '/one-to-one' && session.ready} onLogin={() => { setLoginReturnTo(path);go('/login'); }} onSessionExpired={() => {setResumeInput(true);setUser(null);setBasicResult(null);setMessage('로그인 시간이 만료되었습니다. 입력값은 유지되며 다시 로그인할 수 있습니다.');}} onCalculate={(draft,consent,signal)=>calculateBasic(session,draft,consent,signal)} onCalculated={result=>{setBasicResult({owner:user,result});go('/basic-result');}} path={path} draft={currentDraft} onChange={value => setDrafts(previous => ({ ...previous, [path]: value }))} onPreview={() => { setPreviewPair(null); go(path === '/one-to-many' ? '/network-preview' : '/result-preview'); }} />
      </> : path === '/account/reports' ? <><h1>보관함</h1><p>한 번 만든 결과를 다시 읽는 공간입니다.</p>{user ? reportsError ? <div className="notice" role="alert"><strong>보관함을 불러오지 못했습니다</strong><p>{reportsError}</p><Button onClick={() => setReloadReports(value => value + 1)}>다시 불러오기</Button></div> : <div className="notice" role="status"><strong>{reports === null ? '보관함을 불러오고 있습니다' : reports.length === 0 ? '아직 저장된 결과가 없습니다' : `${reports.length}개의 결과를 확인했습니다`}</strong><p>{reports?.length === 0 ? '분석 기능이 연결되면 만든 결과가 여기에 보관됩니다.' : '리포트 상세 화면의 연결은 준비 중입니다.'}</p></div> : <div className="notice"><strong>로그인하면 결과를 모아볼 수 있습니다</strong><p>계정을 연결하면 내 결과를 안전하게 보관할 수 있습니다.</p><Button onClick={() => go('/login')}>내 계정으로 이동</Button></div>}<button className="secondary-button" onClick={() => { setPreviewPair(null); go('/result-preview'); }}>결과 구성 미리 보기</button></>
      : path === '/login' ? <><h1>{user ? '내 계정' : '결과를 내 계정에 보관하세요'}</h1><p>한 번 확인한 결과를 다시 찾아볼 수 있습니다.</p>{user ? <><div className="notice"><strong>{user.displayName}</strong><p>토스 계정으로 연결되었습니다.</p></div><Button size="large" display="block" disabled={busy} onClick={signOut}>로그아웃</Button></> : <><div className="notice"><strong>{session.ready ? '토스 계정으로 시작하세요' : '토스 로그인 연결 준비 중입니다'}</strong><p>결과 보관에 필요한 계정 식별자를 사용합니다. 토스의 이름·이메일·전화번호는 저장하지 않습니다.</p></div><Button size="large" display="block" disabled={!session.ready || busy} onClick={signIn}>{busy ? '로그인 확인 중' : '토스로 계속하기'}</Button><button className="secondary-button" onClick={() => { setPreviewPair(null); go('/result-preview'); }}>로그인 전에 결과 구성 살펴보기</button></>}</>
      : path === '/guide' ? <><h1>이용 안내</h1><p>우리사주는 사주 계산 근거를 관계 이해와 대화의 참고자료로 풀어내는 서비스입니다. 의료·법률·재무·심리 진단이나 확정적인 미래 예측을 제공하지 않습니다.</p><section className="value-summary"><h2>무료 결과와 추가 해설</h2><p>기본 계산은 광고·외부 AI 없이 제공하도록 연결했습니다. 토스 로그인과 서버 설정이 완료된 환경에서 이용할 수 있습니다. 본문에 배너 광고가 표시될 수 있으며, 추가 AI 해설은 광고 시청을 직접 선택하는 방식으로 준비하고 있습니다. 추가 해설은 풀매수 항목별 3개로 이용하며, 광고 완료 시 3개 받기 또는 인앱 구매로 충전하도록 준비합니다. 실제 광고·구매·차감은 아직 활성화되지 않았습니다.</p></section><div className="notice"><strong>개발 버전 안내</strong><p>로그인·실제 분석·광고·결과 저장·초대 링크는 연결 준비 중입니다. 서버 미설정 상태에서는 생년정보를 전송하지 않습니다. 서버 연결 후에는 확인 화면의 계산 버튼을 눌렀을 때만 전송합니다. 입력값은 이 앱을 열어둔 동안만 메모리에 유지되며 닫거나 새로고침하면 사라집니다.</p><p>정식 출시 전 운영자·고객지원 연락처와 개인정보처리방침, 이용약관을 확정할 예정입니다.</p></div></>
      : <><h1>페이지를 찾을 수 없습니다</h1><p>홈에서 궁금한 관계를 선택해 주세요.</p><Button onClick={() => go('/')}>홈으로 이동</Button></>}
      {(path === '/' || (path === '/account/reports' && user && reports?.length > 0)) && <BannerAd key={path} />}
      <footer><button onClick={() => go('/guide')}>이용 안내</button><span>우리사주</span></footer>
    </main>
    <nav className="bottom-nav" aria-label="주요 메뉴">{[['/', '홈'], ['/account/reports', '보관함'], ['/login', '내 계정']].map(([url, title]) => <button key={url} onClick={() => go(url)} aria-current={path === url ? 'page' : undefined}>{title}</button>)}</nav>
  </TDSMobileAITProvider>;
}

const root = import.meta.hot?.data.root || createRoot(document.getElementById('root'));
if (import.meta.hot) import.meta.hot.dispose(data => { data.root = root; });
root.render(<App />);
