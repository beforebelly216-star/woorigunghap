# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. GitHub 최신 `main`과 실제 코드가 최우선이다.

## 기준선

- 공식 서비스명: **우리사주**
- 기준 브랜치: `main`
- 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 + 운영 QA
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic
- 상품: 이상형 찾기 무료 / 링크형 1:N 인연 네트워크 무료 / 1:1 1,000원
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- Vercel Git 자동배포는 기본 OFF. Preview는 사용자 상시 승인에 따라 검증 후 자동 실행하며, Production은 사용자 명시 승인 후에만 실행한다.

## 핵심 기능

- 서버 결정론적 만세력 + 9개 궁합 지표
- 궁합 scoring **v1.6**: 관계유형별 가중치 + 실제 도달 가능한 공개 점수 30~100, 절대 최대 100
- 관계별 별도 ceiling 없음. 약한 결과를 보기 좋게 끌어올리는 숨은 가점 없음
- 무료 천생연분: 입력 → 결정론 사주 분석 → 결과 화면
- 1:1 입력·결제·결과·저장·재열람
- 무료 1:N: 방장 1회 입력 → 초대 링크 → 참여자 자기정보 입력 → 최대 12명의 모든 쌍 관계망
- 결제 검증 후에만 유료 AI 서술 생성
- 1:1: `claude-sonnet-5`, structured output, segment 저장 + single-flight/idempotency
- 무료 1:N 생성·참여 멱등성, 4초 polling, 참여/관리 권한 분리, 30일 자동 만료
- 레거시 유료 1:N 구매 결과·복구·저장 호환 유지(신규 주문은 중단)
- 비회원 복구 / Kakao 로그인 / 계정 보관함
- Shared View / Web Share / 1080×1920 공유 이미지

## UI / UX 현재 기준

### 전 화면 mobile app theme v4 — 2026-08-29

- 새 1:1 결과의 390px 보라–핑크 UI를 전 제품 공통 디자인 기준으로 확정했다.
- 홈, 무료, 1:1/1:N 입력, 로그인, 보관함, 정책, 결제, 결제 상태, 1:1/1:N 결과, Shared View와 1080×1920 공유 이미지가 같은 캔버스·색상·카드·버튼 언어를 사용한다.
- 공통 토큰은 `#FBFAF7` 캔버스, `#7652D8` 액션, `#8F70E9 → #B792EF → #F3B1DB` 히어로 그라데이션, 390px 셸이다.
- 루트 레이아웃에서 Foundation v2/구버전 전역 CSS import를 제거하고 `report-theme.css` + `app-theme-v4.css`만 공통 렌더 경로로 유지한다.
- 1:N 결과의 후행 route CSS보다 app theme가 우선하도록 선택자 계약을 고정했다.
- 360/390/430px 홈·로그인·1:N 결과에서 가로 overflow 없음, 오류 overlay 없음, 모바일 카드 렌더를 실브라우저로 확인했다.
- 주토피 공통 마스코트와 생성 대기 일러스트는 사용자 승인 캐릭터 시트에서 추출한 실제 픽셀 자산으로 교체했다. 기존 코드 생성/손그림 토끼 SVG는 사용자 화면에서 사용하지 않는다.
- 1:1/1:N 공용 히트맵은 낮은 점수 빨강 → 중간 노랑 → 높은 점수 녹색의 주가형 5단계 팔레트를 사용한다. 숫자와 지표 라벨은 항상 함께 표시한다.

### 홈 / 무료

- 사용자 승인 390px 모바일 레퍼런스가 UI 최우선 기준이다.
- 홈 진입 순서: **이상형 찾기 → 1:N 궁합 보기 → 1:1 궁합 보기**.
- 기능이 없는 `이벤트` 하단 메뉴와 샘플 `관계 흐름 한눈에 보기` 섹션은 제거했다. 하단 메뉴는 홈·보관함·마이페이지 3개만 유지한다.
- `주토피의 오늘의 한마디`는 기존 단일 문구에서 중복 없는 365개 문구로 확장했다. 서울 날짜의 월·일에 맞춰 하루 한 문구를 표시하며 윤일은 2월 28일 문구를 재사용한다.
- 홈 우측 상단에서 로그인 상태를 확인하고 카카오 로그인 또는 로그아웃을 바로 실행한다.
- 홈의 최근 결과 영역은 고정 샘플이 아니라 로그인 계정 보관함의 최신 3개를 표시한다. 1:1은 상대 이름·관계·점수와 이름 앞 3글자 프로필을, 1:N은 `1:다`·관계·최고점을 표시한다.
- 기존 `/free` 관계 성향 분석은 폐기·삭제 완료.
- `/api/free/soulmate`가 기존 만세력 원국으로 무료 결정론 결과를 생성한다.
- `/free/result`: 원국 → 4개 요약 → 추천 일간 TOP 2~3 → 잘 맞는 사주 구성 → 주토피 해설 → 1:1 CTA.

### 1:1 / 무료 1:N 입력

- 기존 desktop-like 입력 UI 폐기, 모바일 레퍼런스형 재구성 완료.
- 출생시간은 오전/오후 선택 없이 **24시간제 HHMM**.
- 1:1: `내 정보 → 상대방 정보 → 확인` 3단계.
- 무료 1:N: 방장은 자기 정보만 입력해 링크를 만들고, 방문자는 링크에서 자기 정보만 직접 입력한다.

### 무료 1:N 인연 네트워크 — 2026-09-01 전면 개편

- 결제 없이 최대 12명이 참여하며, N명 전원의 `N(N-1)/2` 관계를 기존 결정론 1:1 엔진의 친구·지인 기준으로 계산한다.
- SVG 인물 네트워크에서 노드/관계선을 누르면 두 사람의 총점, E~S 등급, 점수 범위, 강점·조율 축을 확인한다.
- 등급은 저장 점수에 대해 E 30~49 / D 50~59 / C 60~69 / B 70~79 / A 80~89 / S 90~100으로 결정하며 방 안 분포를 억지로 보정하지 않는다.
- 초대 링크에는 불투명 방 식별자만 포함한다. 방장 권한과 참여자 삭제 권한은 별도 token으로 분리하고 서버에는 해시만 저장한다.
- 생년정보는 전용 서버 키로 AES-256-GCM 암호화하며 공개 API에는 별칭·점수·등급·사용자용 축만 포함한다. 외부 AI는 호출하지 않는다.
- 새 참여는 약 4초 polling과 ETag로 갱신한다. 방장은 참여 중단·재개, 참여자 제거, 방 삭제를 할 수 있고 참여자는 자신을 삭제할 수 있다.
- 참여 완료 뒤에도 `다른 사람 연결하기`로 같은 브라우저에서 여러 사람이 순서대로 직접 입력할 수 있으며, 각 참여자의 삭제 자격을 브라우저에 함께 보존한다.
- 방장이 만든 네트워크는 같은 브라우저의 `내가 만든 네트워크` 목록에 자동 저장한다. 공개 참여 링크와 별도로 방장 권한이 든 관리 링크를 복사해 다른 기기 재접속에 사용할 수 있다.
- 방은 생성 30일 뒤 조회를 차단하고 일일 자동 정리에서 삭제한다. 요청 남용 방지 식별값은 키 기반 HMAC으로 최대 1일 보관한다.
- 신규 유료 1:N 주문과 checkout은 무료 네트워크로 안내한다. 기존 3,000원 구매 결과·공유·복구·저장 계약은 하위 호환으로 유지한다.

### 1:1 결과

- **390px 모바일 layout v3 구현 완료.**
- 구조: `01 한눈에 보기 → 02 두 사람 사주 → 03 끌림 + 시너지 → 04 관계 구조 → 05 관계 성향 → 06 갈등 루프 → 07 관계 심층 → 08 장기 전망 → 09 관계 사용설명서 → 주토피 마무리`.
- 기존 계산·결제·복구·저장·single-flight·공유·보관함 귀속은 유지.
- 사용자 화면에서는 입력 별칭을 그대로 사용하고 `나/상대방/A/B`를 인물 호칭으로 쓰지 않는다.
- **layout v3 전용 유료 narrative v8 구현 완료.** 기존 API/storage 호환을 위해 `intro/dynamics/action` 3-segment 계약은 유지한다.
- 전체 유료 본문 목표는 **약 5,000자, 허용 4,000~6,000자**.
  - intro 목표 1,050~1,400자
  - dynamics 목표 1,450~1,900자
  - action 목표 1,800~2,400자
- 분량은 새 화면에서 실제 사용하는 핵심 필드에 집중한다.
- 일상어 결론은 일간·일지·오행·천간/지지 상호작용 등 제공된 사주 근거와 같은 문단에서 연결한다.
- Claude는 점수·순위·원국을 변경하지 않으며 내부 시스템 문구를 사용자 결과에 노출하지 않는다.
- **생성 대기 화면 v4:** 주토피 `궁합 떡상 기원` 일러스트 + 단계 문구 + 진행 시각화.
- 로딩과 fatal/config 상태를 동일한 390px 주토피 카드 UI로 통일했다.
- 구형 `60일주 캐릭터` 카드와 원국 아래의 `달빛 항구`, `정원의 설계자` 같은 시적 한줄평은 1:1 결과 렌더 경로에서 제거했다.
- 마지막 공유 영역은 선택 탭 없이 개인정보를 제외한 `한 장 요약` 카드 하나만 제공한다.
- 히트맵 아래 각 점수는 접이식 `근거 보기`로 계산 근거를 3문장 이내에서 확인한다.
- 1:1 결과의 관계 타이밍 지표와 대운·세운 기반 3년 흐름 섹션은 사용자 화면에서 제거했다. 내부 계산·기존 저장 호환은 유지한다.
- `정보 수준 A/B`는 사용자 화면에서 사용하지 않는다. 출생시간이 없을 때만 시주를 제외하고 년·월·일 기준으로 해석한다는 안내를 표시한다.

### 1:1 결제/생성 blocker — 2026-08-28 전수조사

- PR #70~#73의 부분 hotfix 후에도 실기기 Preview에서 `0/3` 장기대기와 `결제를 확인하고 있어요` 반복이 재현되어 이전 완전 해결 판정은 취소했다.
- 결제 → PortOne 조회 → Neon 주문 → 결과 prepare → AI segment → 저장 → 브라우저 retry 관련 코드 일괄 전수조사
- `/api/payments/verify`는 이제 `paymentId + product + exact input + access token`을 함께 검증하고 PortOne input binding을 유지한다.
- PortOne에서 검증된 결제를 DB에 반영할 때 `UPDATE ... RETURNING` 결과가 정확히 1건이어야 성공한다. 0건 업데이트를 성공으로 취급하지 않는다.
- 서버 주문 행이 유실된 경우 PortOne customData가 해당 입력을 bind한 주문에 한해서만 같은 paymentId/accessToken으로 authoritative row를 복구한다.
- PortOne 조회 10초, trusted paid receipt 조회 6초 timeout을 둔다.
- PortOne webhook도 authoritative paid row 갱신이 1건 확인되지 않으면 처리 완료로 ACK하지 않는다.
- 1:1 API를 두 번 연속 실행하던 `one-to-one-resilient` wrapper와 `beforeFiles` rewrite를 제거했다. `/api/compatibility/one-to-one` 한 경로만 권위 API다.
- 결제 redirect의 무한 polling을 제거하고 최대 7회, 요청당 12초로 제한했다. 소진 시 재결제 버튼이 아니라 `같은 결제 다시 확인`만 노출한다.

### 결제 전 저장소 preflight hotfix — 2026-08-28

- 실기기 화면의 `결제 결과 저장소 설정을 확인해야 합니다` 문구는 현재 코드상 `PAYMENT_STORE_NOT_CONFIGURED`, 즉 해당 배포 런타임의 `DATABASE_URL` 부재에서만 발생한다.
- 1:1 입력 화면이 서버 주문 저장 API 실패를 브라우저 전용 주문으로 대체해, DB 저장소가 없는 배포에서도 결제 화면과 PortOne까지 진행할 수 있던 직접 결함을 확인했다.
- 1:1의 브라우저 전용 주문 fallback을 제거했다. 서버 주문 행 저장에 실패하면 결제 화면으로 이동하지 않는다.
- 1:1/1:N 결제 버튼은 PortOne을 열기 전에 `/api/orders/payment-ready`에서 서버 주문 행, access-token hash, 상품/금액, 입력 hash, 삭제/기결제 상태를 확인한다.
- 이미 paid인 주문은 새 결제를 열지 않고 기존 결과로 이동한다.
- `PAYMENT_STORE_NOT_CONFIGURED`와 `PAYMENT_SERVER_NOT_CONFIGURED`는 자동 7회 재시도하지 않고 즉시 같은 결제 수동 재확인 상태로 종료한다.
- 결제 preflight/verify는 비밀값·입력 원문 없이 payment hash reference와 오류 code, 환경변수 존재 여부를 구조화 로그로 남긴다.
- 코드 hotfix만으로 기존 결제가 복구되지는 않는다. 실패한 Preview 환경에 `DATABASE_URL`을 연결하고 이 hotfix를 배포한 뒤 같은 결제로 재확인해야 한다.

### 1:1 action 생성 형식 오류 hotfix — 2026-08-29

- Preview 런타임 로그에서 결제·DB가 아니라 `action` 세그먼트의 `ANTHROPIC_SEGMENT_ACTION_INVALID_JSON` 및 `ANTHROPIC_SEGMENT_ACTION_SCHEMA_MISMATCH`가 422 종료의 직접 원인임을 확인했다.
- 새 화면의 핵심 본문에 쓰지 않는 `situationStrategy`, `actionPlan30`을 Anthropic의 필수 ACTION JSON 스키마에서 제거했다.
- 두 호환 필드는 생성된 핵심 관계 해설에서 서버가 결정론적으로 조립해 기존 저장 형식과 UI 호환을 유지한다.
- JSON 스키마 실패 로그에는 원문 대신 누락/추가 키와 타입의 안전한 경로만 기록하고, 두 번째 모델 시도에 해당 경로를 전달한다.
- `AI_FORMAT`은 같은 결제로 한 번만 자동 재시도한다. 재실패 시 무한 호출하지 않고 화면 안의 `같은 결제로 다시 시도` 버튼을 제공한다.
- 런타임 버전: `paid-report-v8-action-core-bounded-retry-20260828`.

## 검증 상태

- **무료 1:N 다중 참여·방장 재열람 hotfix local/Preview build PASS — 2026-09-01:** 같은 브라우저 연속 입력, 복수 참여자 삭제 자격 보존, 방장 로컬 목록, 공개/관리 링크 분리 계약 + Day 23 system QA + TypeScript + lint(0 errors, 기존 warnings 5) + production build PASS. Preview `dpl_9sMvDue51VZooy1tgQe3w7KA5ApQ` READY. Preview는 `NETWORK_PII_ENCRYPTION_KEY` 미설정으로 생성 실동작 QA를 중단했고 기존 데이터 호환성 영향 때문에 환경값을 자동 변경하지 않았다. Production 승인 배치에서 가명 생성·연속 참여·재열람·삭제 스모크를 수행한다.
- **타인 초대 링크 입력 폼 hotfix Production validation PASS — 2026-09-01:** source `674e50cac4cf50188081a00b17b6b454f2af38b9`, Preview `dpl_8NK4jXLFrVSV66vacaUzBHVSkKrD` READY, Production `dpl_4rfsn8ZebWzEXpC5C2Zpyo2TxL17` READY. 초대 폼 360/390/430px와 browser console error 0을 확인했고 가명 테스트 네트워크를 삭제했다. Preview에는 `DATABASE_URL`·PortOne·Anthropic 관련 환경변수가 존재하며 값은 노출하지 않았다. 비과금 합성 미존재 주문의 `payment-ready` 응답은 HTTP 409 `PAYMENT_ORDER_NOT_READY`로, DB 미설정 오류가 아니다.
- **무료 1:N Production validation PASS — 2026-09-01:** source `c8e642d`, Core calculation validation #33437750277, Vercel production build/TypeScript PASS. 분리 배포에서 4명·6관계선, S=91/E=43, ETag 304, PII 비노출, 삭제를 확인했고 공개 운영 별칭에서도 생성 201·참여 201·S=91·PII 비노출·삭제 200을 확인했다.
- **1:N 순위 전용 결과 local validation PASS** — Day 15 UI/Day 16 paid E2E/runtime/share contracts + lint(0 errors, 기존 warnings 5) + production build + demo route local 200 응답 PASS.
- **홈 섹션 정리/365일 한마디 local validation PASS** — 365개·중복 없음·서울 날짜/윤일 매핑·제거 UI contract + lint(0 errors, 기존 warnings 5) + production build + local 200 응답 PASS.
- **홈 최근 보관함/점수 근거 UI local validation PASS** — source `fcdb9eb`, 보관함·정보안내·결과 UI·editorial/privacy contracts + TypeScript + lint + production build PASS.
- **1:1 결과 UI 정리 local validation PASS** — 히트맵/구형 캐릭터 UI/단일 공유카드 contracts + TypeScript + lint(0 errors, 기존 warnings 5) + production build PASS.
- **PR #78 / Core calculation validation #850 PASS** — 승인 주토피 원본 자산 교체 + 현재 relationship editorial v4 계약 정합화 + 전체 contracts + lint + production build PASS.
- **mobile app theme v4 local validation PASS** — UI/runtime/account/report/shared-view/1:N/policy/system/beta contracts + TypeScript + lint(0 errors, 기존 warnings 5) + production build + 360/390/430px browser QA PASS.
- **1:1 action 형식 오류 hotfix local validation PASS** — AI generation/runtime UX/paid-result/relationship editorial/quality gate + TypeScript + lint(0 errors, 기존 warnings 5) + production build PASS.
- **결제 전 저장소 preflight local validation PASS** — paid-result/day8/runtime UI/server-store/1:N paid E2E/1:1 form contracts + lint(0 errors, 기존 warnings 5) + production build PASS.
- **PR #75 / Core calculation validation #832 PASS** — 결제/DB/생성 경로 전수조사 hotfix + 전체 contracts + lint + production build PASS.
- **Production deploy 후 Git 자동배포 OFF 복구 validation #838 PASS** — latest `main` 기준 전체 Core calculation validation 성공.
- PR #73 / validation #827 PASS — 부분 prepare-loop hotfix였으나 실기기에서 이후 결제 확인 반복이 재현되어 최종 해결로 보지 않는다.
- PR #72 / validation #821 PASS — server-verified paid order 재사용.
- PR #70 / validation #812 PASS — loading/failure UI 통일.
- PR #69 / validation #809 PASS — 1:1 narrative v8 4,000~6,000자 설계 + bullish Jootopi loading UX.
- PR #68 / validation #799 PASS — 1:1 layout v3.
- PR #67 / validation #791 PASS — scoring v1.6.
- PR #65 / validation #778 PASS — 무료 천생연분 결정론 결과.

## 배포 상태

- 천생연분 결과 Preview: `preview/soulmate-result-v1`, Vercel success.
- **1:1 v8 Preview:** `preview/one-to-one-v8`, PR #75 포함 최신 `main` (`ab8a6006`) 재배포 완료. trigger `8a8f903f`, Vercel SUCCESS, 이후 Git 자동배포 OFF (`a5fba970`).
- **1:1 action 형식 오류 hotfix Preview 배포 완료:** source `8051e2f`, trigger `a875c09`, Vercel SUCCESS (`6csk1Za5MNqsNVosYrN6aCU35b2A`). 이후 자동배포 OFF 복구 `07e3858`.
- **mobile app theme v4 Preview 배포 완료:** source `3b09c34`, trigger `69388ee`, Vercel SUCCESS (`EGPxrFmHorhKoa9kCEwWNfW1rsiK`). 고정 Preview alias 실브라우저 확인 완료, 자동배포 OFF 복구 `4208ec1`.
- **주토피 원본 캐릭터 자산 Preview 배포 완료:** source PR #78, trigger `7cb538b`, Vercel SUCCESS (`Gjv1vd6wMAn74cvxFTPQFJH4es6s`). 이후 자동배포 OFF 복구 `7d37dd8`.
- **Production 최신 Preview 기준 배포 완료 — 2026-08-29:** trigger `d8186ab`, Vercel SUCCESS (`E9hgx8qjpxdCBv9jAk4YXRYfZuGN`). 이후 Git 자동배포 OFF 복구 commit `8051554`, validation #838 PASS.
- **무료 1:N Production 배포 완료 — 2026-09-01:** source `c8e642d`, deployment `dpl_H8A6Fkkjq9MpfvMc2aK2QNLpDNcA`, 운영 주소 `https://woorigunghap-uty7-beforebelly216-stars-projects.vercel.app`. Production의 `NETWORK_PII_ENCRYPTION_KEY`·`CRON_SECRET` 설정 및 공개 스모크 PASS. 운영 별칭만 공개하고 Preview·개별 배포 URL은 Vercel Authentication 보호를 유지한다.
- **타인 초대 링크 입력 폼 hotfix Preview/Production 배포 완료 — 2026-09-01:** source `674e50cac4cf50188081a00b17b6b454f2af38b9`, Preview `dpl_8NK4jXLFrVSV66vacaUzBHVSkKrD` READY, Production `dpl_4rfsn8ZebWzEXpC5C2Zpyo2TxL17` READY. 360/390/430px 운영 검증과 테스트 네트워크 삭제 완료.
- **무료 1:N 다중 참여·방장 재열람 Preview build 완료 — 2026-09-01:** deployment `dpl_9sMvDue51VZooy1tgQe3w7KA5ApQ` READY. Production 배포 승인 수신, 정확한 `main` 커밋 배포 후 운영 스모크 예정.
- `main` Git 자동배포 OFF 유지.

## 남은 핵심 작업 / 리스크

1. Production에서 기존 실패 실결제 1,000원 건으로 `payment verify → prepare → intro → dynamics → action → 결과 저장 → 재열람` 실복구 및 중복 생성·중복 비용 방지 확인
2. 실제 Sonnet 5 생성 샘플에서 사용자 노출 본문 4,000~6,000자 준수 여부와 중복/근거 밀도 확인
3. 360 / 390 / 430px overflow/spacing QA
4. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View

## 출시 blocker

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 개인정보·비밀값·내부 지표 부적절 노출
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 후 timeout/무한 재시도로 결과 미도달
