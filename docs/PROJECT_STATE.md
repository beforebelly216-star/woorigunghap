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
- 공통 토큰은 `src/app/report-theme.css`에 반영되어 있다.
- 기본 폭 원칙: 입력·결제 compact 480px / 1:1 report 640px / 1:N compare 960px.
- **2단계 공통 shell + 홈 적용 완료:** 전역 `body max-width:480px` 강제를 제거하고 header/footer를 1120px content rail 기반으로 전환했다.
- 홈은 desktop 2-column editorial hero + 2-column 상품 비교, 820px 이하 single-column, 480px 이하 compact mobile 구조로 전환했다. free-first CTA와 기존 상품/라우팅은 유지한다.
- `theme-unification.css`의 과거 lavender override와 shell용 `max-width:99999px` 강제 media query를 제거했다.
- 정책 페이지의 footer 중복 소유를 제거하고 shared shell에서 header/footer를 관리한다.
- 입력/결제/결과/1:N 등 화면별 레거시 `max-width:99999px` 규칙은 각 후속 rollout 단계에서 기능 회귀 없이 제거한다.
- 다크모드는 지원하지 않는다. gradient/glow/glassmorphism/과도한 shadow와 카드 남용을 기본 스타일로 사용하지 않는다.

## 검증 상태

- **PR #48 / Core calculation validation #682 PASS**
- 만세력/경계/궁합/결제/AI/1:N/account/editorial/policy/Growth/report 전체 계약 PASS
- Foundation v2 홈 계약을 legacy `--saju-primary-deep` 문자열이 아니라 action/ink + 실제 responsive breakpoint 계약으로 갱신
- `npm run lint` PASS
- production build PASS
- 계산·결제·AI 생성·저장·권한 로직 변경 없음

## 배포 상태

- Foundation v2 2단계에서 Vercel Preview/Production 배포는 실행하지 않는다.
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
8. 후속 화면의 레거시 `max-width:99999px` CSS 제거

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
