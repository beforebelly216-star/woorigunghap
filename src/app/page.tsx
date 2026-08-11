import Link from "next/link";

export default function Home() {
  return <main className="landing-page">
    <section className="hero">
      <p className="eyebrow">사주 원국 기반 관계 리포트</p>
      <h1>우리 사이,<br />조금 더 선명하게.</h1>
      <p className="hero-copy">두 사람의 생년월일시와 관계 유형을 바탕으로<br />실용적인 관계 궁합을 정리해 드려요.</p>
    </section>
    <section className="product-grid" aria-label="리포트 선택">
      <article className="product-card featured">
        <p className="card-label">가장 먼저 시작하기</p>
        <h2>1:1 관계 궁합</h2>
        <p>짝사랑 · 썸 · 연인 · 친구 · 직장동료<br />두 사람의 강점과 조율 포인트를 확인하세요.</p>
        <strong>1,000원</strong>
        <Link href="/one-to-one" className="product-action">정보 입력하고 시작하기</Link>
      </article>
      <article className="product-card muted">
        <p className="card-label">준비 중</p>
        <h2>1:다 비교 궁합</h2>
        <p>여러 관계의 흐름을 한눈에 비교하고<br />나에게 맞는 관계 포인트를 찾아보세요.</p>
        <strong>3,000원</strong>
        <button disabled>곧 오픈할게요</button>
      </article>
    </section>
    <p className="notice">이 리포트는 전통 명리 해석을 바탕으로 관계의 흐름을 가볍게 살펴보는 참고용 콘텐츠입니다.</p>
  </main>;
}
