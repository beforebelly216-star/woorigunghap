# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. GitHub 최신 `main`과 실제 코드가 최우선이며, 의미 있는 작업 완료 후 갱신한다.

## 기준선

- 공식 서비스명: **우리사주**
- 기준 브랜치: `main`
- 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 + 운영 QA 단계
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 상품: 1:1 1,000원 / 1:N 3,000원
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 배포: Vercel Production. Git 자동배포는 **비활성화**가 기본이며 Preview/Production은 사용자 명시 승인 후 별도 실행한다.

## 현재 구현 상태

- 홈 free-first 퍼널: `무료로 내 관계 성향 보기` → `/free` deterministic 자기 분석 → 1:1/1:N 유료 전환
- `/free`는 Foundation v2 compact 480px 전용 shell로 분리되어 레거시 `.input-page` 강제 CSS에 의존하지 않는다.
- 무료 입력의 1:1 sessionStorage prefill, deterministic 분석, 결제/유료 AI 비사용 경계는 그대로 유지한다.
- 1:1 입력/결제는 Foundation v2 compact 480px 전용 flow로 분리했다.
- 1:1 결과 loading / recovery / fatal 상태는 `result-status.css`가 Foundation v2 compact 480px layout owner로 관리한다.
- 1:1 완성 리포트는 Foundation v2 report 640px layout으로 전환했다.
- **1:N 입력/checkout은 `src/app/one-to-many/one-to-many-foundation.css`의 compact 480px layout으로 분리했다.** 기존 `.input-page/.input-shell/.checkout-shell` layout ownership에서 벗어나 관계유형, 기준자/후보 입력, 후보 추가/삭제, 정책 동의, 3,000원 결제 CTA를 Foundation v2 위계로 통일했다.
- **1:N 완성 비교 결과는 Foundation v2 compare 960px layout으로 전환했다.** 결과 IA는 `전체 ranking → 후보 역할 → 공통 지표 비교 → 상황별 비교 → 후보별 강점/주의 → 9개 기준 상세 점수 → 공유/다음 행동` 순서다.
- 1:N 공유 surface는 순위보다 먼저 노출하지 않고 비교 판단 흐름 뒤에 배치했다. public share DTO, Web Share/이미지 저장, access token 비노출 원칙은 유지한다.
- 1:N result loading/generating/missing/failed 상태도 같은 Foundation v2 화면 안에서 표시한다.
- 서버 결정론적 만세력 + 9개 궁합 지표 계산
- PortOne 결제 검증 / webhook 멱등 처리
- 결제 검증 뒤 AI 서술 생성, segment single-flight/idempotency
- 1:1 CH0~CH9 장문 리포트 / 1:N 후보 순위·비교 리포트
- Neon 서버 저장 / 비회원 복구 / 선택형 Kakao 로그인 / 계정 보관함
- public share: 1:1·1:N Relationship Label / Two Sides / Send This / Receipt / Recap / Shared View / 반응 UX / analytics 구현
- 개인정보·유료 본문·내부 계산 상세는 public share DTO에 포함하지 않는다.

## 1:1 생성 파이프라인

- `intro`는 단독 생성하고 성공 뒤 `dynamics + action`만 겹칠 수 있는 staged fan-out 구조다.
- route `maxDuration=300`, Vercel Fluid Compute 사용.
- segment별 single-flight lock과 5분 stale 안전창을 유지한다.
- complete lock인데 authoritative report segment가 없으면 reconciliation/reclaim 가능하다.
- 반복 소진된 AI/transport/dependency failure는 무한 재시도로 숨기지 않고 종료 가능한 오류로 분류한다.
- **운영 미검증:** PR #45 Production 배포 후 기존 stuck 주문 복구, 신규 실제 1:1 전체 생성시간, 실패 종료 메시지의 실사용 QA가 아직 남아 있다.

## UI / UX — Design Foundation v2

- `docs/DESIGN_FIVE_ELEMENT_SYSTEM.md`가 전체 UI/UX의 단일 디자인 Source of Truth다.
- 핵심 시각 문법: neutral canvas + 실제 데이터에만 쓰는 오행 기능색 + typography-first + progressive disclosure.
- 기본 폭 원칙: 입력·결제 compact 480px / 1:1 report 640px / 1:N compare 960px.
- 2단계 공통 shell + 홈 완료.
- 3단계 무료 분석 입력/결과 완료.
- 4단계 1:1 입력/결제 완료.
- 5단계 생성중/복구/실패 상태 완료.
- 6단계 1:1 완성 결과 IA/레이아웃 완료.
- **7단계 1:N 입력/결제/비교 결과 완료.** `one-to-many-foundation.css`가 1:N product 화면의 후순위 layout owner이며 새 화면에서 gradient/glow/큰 shadow/99999px 강제 규칙을 사용하지 않는다.
- 다크모드는 지원하지 않는다.

## 검증 상태

- **PR #53 / Core calculation validation #702 PASS**
- 만세력/경계/궁합/결제/AI/1:N/account/editorial/policy/Growth/report 전체 계약 PASS
- Day 15 1:N UI 계약을 Foundation v2 IA와 compact/compare 폭, share 순서, legacy visual 금지 기준으로 갱신
- `npm run lint` PASS
- production build PASS
- 1:N 계산·결제·서버 저장·복구·single-flight 생성·접근권한·공유 데이터 로직 변경 없음

## 배포 상태

- Foundation v2 7단계에서 Vercel Preview/Production 배포는 실행하지 않는다.
- Git 자동배포는 비활성화 상태를 유지한다.
- Production과 최신 `main`은 일시적으로 다를 수 있다.

## 남은 핵심 QA / 리스크

1. PR #45 배포본의 실제 1:1 runtime 재검증
2. 1:1·1:N 실제 공유 / 이미지 저장 / Shared View 확인
3. 홈 → 무료 결과 → 1:1 prefill 실제 동작 확인
4. 360 / 390 / 430 / 768 / 1280px Foundation 화면 육안 QA
5. 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
6. 회원탈퇴/데이터 삭제/Kakao unlink
7. 결과/계정 삭제 뒤 public share 및 analytics 정리 확인
8. 보관함/계정 및 Shared View/공유 카드의 후속 Foundation 적용

## 출시 blocker 정의

- 결제 성공 후 결과 유실
- 동일 결제의 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 정책 동의 없는 결제
- 개인정보·비밀값·내부 지표의 부적절한 노출
- 탈퇴 후 삭제 대상 데이터 잔존
- 친구/직장동료 결과에 구조적으로 잘못된 연애/성적 프레임 혼입
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 완료 후 플랫폼 timeout/무한 재시도로 1:1 결과에 도달하지 못함

문체 취향, 재미, 일부 반복/분량 편차는 blocker가 아니다.
