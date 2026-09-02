import { normalizeReturnTo } from "@/lib/auth-policy";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "카카오 로그인이 취소됐어. 원할 때 다시 시도해 줘.",
  state: "로그인 요청이 만료됐거나 안전하게 확인되지 않았어. 다시 시작해 줘.",
  provider: "카카오 로그인 요청을 완료하지 못했어.",
  callback: "카카오 계정 확인 중 문제가 생겼어. 잠시 후 다시 시도해 줘.",
  session: "로그인 세션을 저장하지 못했어. 잠시 후 다시 시도해 줘.",
  config: "카카오 로그인 설정이 아직 완료되지 않았어.",
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = normalizeReturnTo(params.returnTo);
  const errorKey = typeof params.error === "string" ? params.error : "";
  const loginUrl = `/api/auth/kakao/start?${new URLSearchParams({ returnTo }).toString()}`;

  return <main className="login-page">
    <section className="login-card">
      <p className="eyebrow">주토피 시작하기</p>
      <h1>카카오로 로그인하고<br />모든 궁합을 시작해 봐.</h1>
      <p>무료 분석부터 인연 네트워크, 1:1 궁합까지 로그인 뒤에 이용할 수 있어. 만든 결과는 보관함에서 다시 볼 수 있게 안전하게 연결해 둘게.</p>
      {ERROR_MESSAGES[errorKey] ? <p className="login-error" role="alert">{ERROR_MESSAGES[errorKey]}</p> : null}
      <a className="kakao-login-button" href={loginUrl}>카카오로 계속하기</a>
      <p className="login-privacy">카카오 회원번호만 계정 식별에 쓰고 이메일·전화번호·생년정보는 요청하지 않아.</p>
    </section>
  </main>;
}
