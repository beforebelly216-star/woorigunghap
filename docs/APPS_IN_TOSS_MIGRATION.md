# 앱인토스 전환 — 2026-10-02

**최신 사용자 결정: 미니앱 유료 결제 제거, 광고 수익만 사용. 아래 IAP/SKU 준비 계획은 중단된 이전 기록이다. 현재 방향·배치·구현 상태는 `TOSS_AD_MONETIZATION.md`를 따른다.** 기존 웹 구매 결과는 보존한다.

## .ait 화면 테스트 번들

사용자 제공 앱 이름은 `woorisajoo`다. `apps/toss`에 독립 SDK 3.7.0/React 18/TDS 프로젝트를 추가했다. `npm run build`로 공식 `woorisajoo.ait`를 생성하고 `node scripts/check-bundle.mjs`로 검증한다. 로그인 코드가 추가되었으나 실제 서버 설정은 없고 계산·결제·공유·저장은 미연결이다. 개발 상태를 명시했다. 콘솔 QR 확인용이며 공개 출시 검수용이 아니다.

## 로그인 설정 및 이번 연동 단계

콘솔 workspace `87483`/appName `woorisajoo`를 확인했다. 현재 이름은 필수 고정, 다른 개인정보는 사용 안함이다. 서비스 약관/연결 해제 콜백 미등록, mTLS/SKU 미발급(사용자 확인). 콘솔 표시명 `우리사주우리사이`를 서비스 브랜드와 통일해야 한다. 콘솔 설정 변경/등록/약관 수락은 수행하지 않았다.

- 클라이언트 `TossAuth.login()`과 `/api/auth/toss`를 연결했다. 설정 후 활성화하며 1시간 서버 세션 토큰은 메모리에만 보관한다. 앱 재시작 시 재로그인한다. 이름/이메일/전화번호 저장 없음.
- 허용 Origin: `https://woorisajoo.apps.tossmini.com`, `https://woorisajoo.private-apps.tossmini.com`. 명시적 API만 CORS, 기존 카카오 쿠키 계정과 분리. 로컬 Origin은 개발 전용 플래그로만 허용한다.
- 연결 해제 URL은 승인된 공개 API 서버의 `/api/auth/toss/unlink`, POST 권장. 콘솔에서 설정한 Basic Auth의 전체 Authorization 값과 서버 `APPS_IN_TOSS_UNLINK_AUTHORIZATION`이 일치해야 한다. 인증 없이 호출하면 실패한다. 연결 해제는 세션 폐기이며 구매 삭제/회원탈퇴와 별개다.
- 서버 환경: LOGIN_ENABLED, APP_NAME, MTLS_CERT, MTLS_KEY, UNLINK_AUTHORIZATION, DB. PEM/인증 정보는 서버 비밀 설정에만 입력한다. 공개 API 배포 및 정책 확인을 마치기 전 LOGIN_ENABLED=false 유지. 미니앱에는 공개 `VITE_API_BASE_URL`만 설정한다.
- IAP 서버 상태 검증과 SDK 구매/미결 주문 어댑터는 준비했지만 영구 지급·입력/주문 바인딩·결과 생성/복구/환불은 미완료다. `/api/toss/iap/status`는 항상 productGranted=false이며 구매 버튼을 활성화하지 않는다. SDK success만으로 지급하지 않는다.
- 테스트: root auth/origin/session/IAP/Kakao/library/policy 및 client 세션/지급 중복/확인 실패 테스트 PASS, root lint/build PASS. 실제 토스앱 인증·결제·DB 흐름은 아직 검증하지 않았다.

## 확정 방향

사용자 요청으로 앱인토스를 출시 채널로 선택했다. 기존 웹 서비스와 과거 카카오 구매 계정은 유지한다. 미니앱 안에는 토스 로그인·인앱결제·앱인토스 광고만 제공한다. 유료 1:1 및 무료 1:N 상품은 유지하며 가격은 임의 변경하지 않는다.

## 이번에 구현한 범위

- 토스 인가코드 → mTLS 토큰 교환 → 서버 사용자 조회 프로토콜과 동일 출처 POST `/api/auth/toss` 준비 endpoint.
- 서버가 조회한 userKey만 계정 식별에 사용한다. 토스 토큰과 암호화된 개인정보는 DB·응답·로그에 저장하지 않는다.
- 기존 DB `(provider, provider_user_id)` 고유 키로 kakao/toss를 분리한다. 표시 이름으로 과거 구매 계정을 자동 합치지 않는다.
- 기존 HttpOnly 세션 저장을 재사용한다. 로그인은 기본 OFF이며 인증서·앱 이름·DB가 없으면 503이다.
- 결제 전 생성형 AI 사용 고지와 결과의 AI 생성 라벨 추가.
- SDK 화면/크로스오리진 세션/연결 해제 코드와 IAP 상태 검증 기반을 추가했다. 실제 기능 화면 이식, 공개 서버 연결, 영구 지급·결과 복구·환불·공유·탈퇴 및 실기기 검증은 남았다. 출시용 완성물이 아니다.

## 진행 순서

1. 사용자: 앱인토스 콘솔 가입 → 워크스페이스 → 비게임 앱 생성 → 서비스 표시명 `우리사주`와 고유 appName 등록. 사업자·정산 정보, 고객센터, 약관·개인정보처리방침 준비. 앱 정보 등록이 입점 승인을 보장하지 않는다.
2. 토스용 별도 WebView/Vite 클라이언트를 구성한다. Next.js 서버 API·계산·Neon·AI 엔진을 유지한다. 원격 웹사이트 iframe이나 기존 Next 서버를 통째로 static export하는 우회는 사용하지 않는다. SDK 3.x 설정은 `apps-in-toss.config.ts`, `webBundleDir`, package scripts를 사용한다.
3. 화면 이식 순서: 홈 → 무료 입력/결과 → 토스 로그인/보관함 → 유료 입력/결제/생성/복구 → 관계망/공유. TDS, 토스 상단 내비게이션·뒤로가기·safe area, 키보드/로딩/오류 처리를 확인한다. 기존 단계별 UI 개편은 이 화면 이식과 통합한다.
4. 콘솔: 토스 로그인 약관·최소 스코프, mTLS 인증서 발급. 실제 Neon/Vercel 리전과 국외 이전 대상·기간 확인 후 고지 확정. 인증서·키는 서버 비밀 환경변수에만 설정한다.
5. 인증: 실제 SDK 버전의 Origin 두 개만 명시적으로 허용한다. 메모리 Bearer 세션과 연결 해제 콜백 코드를 추가했다. 실기기 교차 출처 요청/재로그인/세션 폐기와 회원탈퇴 화면을 검증한 뒤 활성화한다. `*` CORS 또는 임의 userKey 신뢰는 금지한다.
6. 결제: 콘솔의 1회 리포트 SKU 등록 → 상품 목록의 실제 판매가 표시 → 서버 주문 상태/소유자/SKU 검증 → 기존 멱등 생성·저장 연결 → 미결 주문 복구 → 실제 지급 후 completeProductGrant. 클라이언트 success만으로 AI 호출·지급 완료 처리하지 않는다. 기존 PortOne 검증을 토스 결제에 재사용하지 않는다. 콘솔 가격 단위/VAT 때문에 현재 1,000원이 동일하게 설정 가능한지 먼저 확인하고 가격 변경은 사용자와 결정한다.
7. 공유: 자사 웹 URL 대신 미니앱 공유 링크로 연결하고 딥링크의 참여/공개 조회 권한을 검증한다. 광고는 결제·결과 보존 검증 후 앱인토스 광고만 연결한다. 광고 시청을 기존 유료 결과 재열람 조건으로 추가하지 않는다.
8. SDK 개발 도구/콘솔 QR·Android/iOS 토스앱에서 로그인, 취소, 앱 재시작, 지급 중 종료, 동일 주문 복구, 환불, 연결 해제, 보관함 재열람 검증 → 번들 업로드 → 검수 요청.

## 남은 출시 차단 항목

appName/콘솔 확인, SDK 로그인·교차 출처 세션·연결 해제 코드와 IAP 검증 기반 있음. 사업자·정산/정책 미확정, mTLS/SKU 없음, 공개 API 연결과 실제 기능 화면 이식·회원탈퇴·영구 지급/결과 복구/환불·실기기 QA 미완료. 기존 카카오 웹 로그인과 PortOne 화면은 유지한다. 토스용 전환 완료 상태가 아니다.

## 공식 근거

- [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide.md): 로그인·결제·광고 제한, 외부 링크 제한, AI 고지/표시.
- [SDK 3.x](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x.md): 최신 설정 구조. 일부 튜토리얼은 구버전 예시이므로 설치 버전 규격 우선.
- [서버 API](https://developers-apps-in-toss.toss.im/documentation/integration/server-api.md): SDK 3.1.1 이상 `apps.tossmini.com`/`private-apps.tossmini.com`, 3.0~3.1.1 미만 `web.tossmini.com`/`private-web.tossmini.com` Origin. 와일드카드 허용 금지.
- [토스 로그인](https://developers-apps-in-toss.toss.im/documentation/common/authentication/toss-login.md), [로그인 설정](https://developers-apps-in-toss.toss.im/guide/authentication/intro.md).
- [인앱결제](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment.md): 사업자/정산, 실제 상품 가격, 지급·복구·환불.
