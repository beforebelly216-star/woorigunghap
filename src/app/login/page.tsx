import Link from "next/link";
import { normalizeReturnTo } from "@/lib/auth-policy";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "카카오 로그인이 취소됐어요. 원할 때 다시 시도해 주세요.",
  state: "로그인 요청이 만료되었거나 안전하게 확인되지 않았어요. 다시 시작해 주세요.",
  provider: "카카오 로그인 요청을 완료하지 못했어요.",
  callback: "카카오 계정 확인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
  session: "로그인 세션을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  config: "카카오 로그인 설정이 아직 완료되지 않았어요.",
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
      <p className="eyebrow">선택 로그인</p>
      <h1>구매한 리포트를<br />카카오 계정에 모아보세요.</h1>
      <p>로그인하지 않아도 결제와 결과 확인은 그대로 이용할 수 있어요. 결과 화면에서 로그인하면 구매 리포트를 계정 보관함에 안전하게 연결합니다.</p>
      {ERROR_MESSAGES[errorKey] ? <p className="login-error" role="alert">{ERROR_MESSAGES[errorKey]}</p> : null}
      <a className="kakao-login-button" href={loginUrl}>카카오로 계속하기</a>
      <Link className="login-back-link" href={returnTo}>로그인 없이 돌아가기</Link>
      <p className="login-privacy">카카오 회원번호만 계정 식별에 사용하며 이메일·전화번호·생년정보는 요청하지 않습니다.</p>
    </section>
  </main>;
}
