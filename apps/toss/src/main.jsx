import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@toss/tds-mobile';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { SafeArea, graniteEvent } from '@apps-in-toss/web-framework';
import './style.css';

const services = {
  '/one-to-one': { name: '두 사람 궁합', description: '서로의 강점과 반복되는 갈등, 관계에서 조율할 부분을 살펴보세요.', status: '로그인과 인앱결제 연결 후 이용할 수 있습니다.' },
  '/one-to-many': { name: '친구들과 관계 보기', description: '초대 링크로 함께 만드는 인연 네트워크입니다.', status: '토스 로그인과 미니앱 초대 링크 연결을 준비하고 있습니다.' },
  '/free': { name: '나와 잘 맞는 사람', description: '내 성향을 바탕으로 잘 맞는 사람의 모습을 알아보세요.', status: '토스 로그인과 계산 서버 연결 후 이용할 수 있습니다.' },
};

function Icon({ kind }) {
  const paths = { heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    people: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" /></>,
    spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /> };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function BirthFields({ title }) {
  return <fieldset><legend>{title}</legend>
    <label>이름 또는 별칭<input autoComplete="off" maxLength={20} placeholder="실명 대신 별칭도 괜찮습니다" /></label>
    <div className="field-row"><label>성별<select defaultValue=""><option value="" disabled>선택해 주세요</option><option>여성</option><option>남성</option></select></label>
      <label>달력<select defaultValue="solar"><option value="solar">양력</option><option value="lunar">음력</option></select></label></div>
    <label>생년월일<input type="date" /></label><label>출생시간<input type="time" /></label>
    <label className="check"><input type="checkbox" />출생시간을 모릅니다</label>
  </fieldset>;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const go = (next) => { window.history.pushState({}, '', next); setPath(next); window.scrollTo(0, 0); };
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
      <div className="preview-note" role="status">화면 확인용 테스트 버전 · 분석과 결제는 아직 연결되지 않았습니다.</div>
      {path === '/' ? <>
        <section className="intro"><p className="eyebrow">우리 사이를 이해하는 시간</p><h1>잘 맞는 순간도,<br />다른 이유도 알아보세요.</h1><p>두 사람의 성향부터 친구들과의 관계까지.<br />우리 사이를 조금 더 선명하게 살펴보세요.</p></section>
        <section><h2>어떤 관계가 궁금하세요?</h2>
          <button className="feature" onClick={() => go('/one-to-one')}><span className="feature-top"><span className="icon"><Icon kind="heart" /></span><span className="tag">인앱결제 연결 준비 중</span></span><strong>두 사람 궁합</strong><p>{services['/one-to-one'].description}</p><span className="action">두 사람 궁합 살펴보기 →</span></button>
          <button className="service-row" onClick={() => go('/one-to-many')}><span className="icon"><Icon kind="people" /></span><span><strong>친구들과 관계 보기 <small>무료</small></strong><span className="subtitle">초대 링크로 함께 만드는 인연 네트워크</span></span><span aria-hidden="true">›</span></button>
          <button className="service-row" onClick={() => go('/free')}><span className="icon"><Icon kind="spark" /></span><span><strong>나와 잘 맞는 사람 <small>무료</small></strong><span className="subtitle">내 성향을 바탕으로 살펴보는 이상형</span></span><span aria-hidden="true">›</span></button>
        </section>
      </> : service ? <>
        <button className="back" onClick={() => go('/')}>← 홈으로</button><p className="eyebrow">우리사주</p><h1>{service.name}</h1><p>{service.description}</p>
        <div className="notice"><strong>서비스 연결 준비 중입니다</strong><p>{service.status}</p><p>아래 입력 화면은 미리보기입니다. 입력한 정보는 전송하거나 저장하지 않습니다.</p></div>
        <form onSubmit={(event) => event.preventDefault()}>
          <BirthFields title="내 정보" />
          {path === '/one-to-one' && <><BirthFields title="상대방 정보" /><label>관계 유형<select defaultValue=""><option disabled value="">선택해 주세요</option>{['짝사랑', '썸', '연인', '친구', '직장동료'].map(value => <option key={value}>{value}</option>)}</select></label></>}
          {path === '/one-to-one' && <p className="disclosure">상세 해설은 사주·궁합 계산 근거를 바탕으로 생성형 AI가 작성합니다. 미래나 상대의 마음을 확정하지 않습니다.</p>}
          <Button size="large" display="block" disabled>서비스 연결 준비 중</Button>
        </form>
      </> : path === '/account/reports' ? <><h1>보관함</h1><div className="notice"><strong>토스 로그인 연결을 준비하고 있습니다</strong><p>연결을 마치면 만든 결과를 이곳에서 다시 볼 수 있습니다.</p><p>테스트 버전에서는 구매하거나 분석한 결과가 없습니다.</p></div></> : path === '/login' ? <><h1>우리사주 시작하기</h1><p>만든 결과를 안전하게 보관하고 다시 확인하세요.</p><div className="notice"><strong>토스 로그인 연결 준비 중</strong><p>이 테스트 버전에서는 로그인 정보와 개인정보를 수집하지 않습니다.</p></div><Button size="large" display="block" disabled>토스 로그인 준비 중</Button></> : <><h1>이용 안내</h1><p>우리사주는 사주 계산 근거를 관계 이해와 대화의 참고자료로 풀어내는 서비스입니다. 의료·법률·재무·심리 진단이나 확정적인 미래 예측을 제공하지 않습니다.</p><div className="notice"><strong>테스트 버전 안내</strong><p>이 번들은 화면 확인용입니다. 로그인·분석·결제·광고·초대 링크는 아직 연결되지 않았습니다. 입력값은 서버에 전송하거나 기기에 저장하지 않습니다.</p><p>정식 출시 전 운영자·고객지원 연락처와 개인정보처리방침, 이용약관, 환불 정책을 확정할 예정입니다.</p></div></>}
      <footer><button onClick={() => go('/guide')}>이용 안내</button><span>우리사주</span></footer>
    </main>
    <nav className="bottom-nav" aria-label="주요 메뉴">{[['/', '홈'], ['/account/reports', '보관함'], ['/login', '내 계정']].map(([url, title]) => <button key={url} onClick={() => go(url)} aria-current={path === url ? 'page' : undefined}>{title}</button>)}</nav>
  </TDSMobileAITProvider>;
}

createRoot(document.getElementById('root')).render(<App />);
