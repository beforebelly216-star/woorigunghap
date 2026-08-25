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
- 레거시 내부 식별자(`woorigunghap_*`, 기존 repo/domain)는 호환성 때문에 마이그레이션 전까지 유지할 수 있다.

## 현재 구현 상태

- 홈 free-first 퍼널: `무료로 내 관계 성향 보기` → `/free` deterministic 자기 분석 → 1:1/1:N 유료 전환
- 무료 자기 분석은 주문·결제·유료 AI를 만들지 않고 기존 만세력/60일주 편집 레이어만 사용한다.
- 무료 입력은 같은 브라우저에서 1:1 첫 사람으로 prefill할 수 있으며 원본 생년월일시는 URL query에 넣지 않는다.
- 서버 결정론적 만세력 + 9개 궁합 지표 계산
- PortOne 결제 검증 / webhook 멱등 처리
- 결제 검증 뒤 AI 서술 생성, segment single-flight/idempotency
- 1:1 CH0~CH9 장문 리포트 / 1:N 후보 순위·비교 리포트
- Neon 서버 저장 / 비회원 복구 / 선택형 Kakao 로그인 / 계정 보관함
- 보관함 생성중 복구 및 완성 결과 영구 삭제
- public share: 1:1·1:N Relationship Label / Two Sides / Send This / Receipt / Recap / Shared View / 반응 UX / analytics 구현
- Web Share API + 1080×1920 이미지 저장 + public Shared View URL + clipboard fallback 유지
- 개인정보·유료 본문·내부 계산 상세는 public share DTO에 포함하지 않는다.

## 1:1 생성 파이프라인

- `intro`는 단독 생성하고 성공 뒤 `dynamics + action`만 겹칠 수 있는 staged fan-out 구조다.
- route `maxDuration=300`, Vercel Fluid Compute 사용.
- segment별 single-flight lock과 5분 stale 안전창을 유지한다.
- complete lock인데 authoritative report segment가 없으면 reconciliation/reclaim 가능하다.
- 반복 소진된 AI/transport/dependency failure는 무한 재시도로 숨기지 않고 종료 가능한 오류로 분류한다.
- 결제검증/background helper는 1:1 AI 세그먼트를 선점하지 않는다. 1:N background generation은 유지한다.
- **운영 미검증:** PR #45 Production 배포 후 기존 stuck 주문 복구, 신규 실제 1:1 전체 생성시간, 실패 종료 메시지의 실사용 QA가 아직 남아 있다.

## UI / UX — Design Foundation v2

- **2026-08-25 사용자 지시로 기존 오행 스펙을 전면 폐기하고 `docs/DESIGN_FIVE_ELEMENT_SYSTEM.md`를 `우리사주 Design Foundation v2`로 새로 작성했다.**
- 이 문서가 전체 UI/UX의 단일 디자인 Source of Truth다.
- 레퍼런스 원칙: Co–Star의 에디토리얼 절제 / The Pattern의 progressive disclosure / Toss의 모바일 정보 위계 / Spotify Wrapped의 데이터 스토리텔링을 원리만 차용하고 화면을 복제하지 않는다.
- 핵심 시각 문법: neutral canvas + 실제 데이터에만 쓰는 오행 기능색 + 강한 타이포 + 한 화면 한 메시지 + `점수 → 의미 → 관계 장면 → 행동` 구조.
- 공통 토큰은 `src/app/report-theme.css`에 Foundation v2와 일치하도록 반영했다.
- 기본 폭 원칙: 입력·결제 compact 480px / 1:1 report 640px / 1:N compare 960px. 모바일 우선이지만 PC 전체를 480px로 강제하지 않는다.
- 기존 `main`에는 직전 작업의 전 화면 모바일 폭 강제 및 `max-width:99999px` 계열 CSS가 남아 있어 새 원칙과 충돌한다. **이는 2단계 실제 화면 적용 때 화면별로 안전하게 제거/복원해야 한다.**
- 다크모드는 지원하지 않는다. gradient/glow/glassmorphism/과도한 shadow와 카드 남용을 기본 스타일로 사용하지 않는다.
- 1:1 결과 기본 IA: Hero → Snapshot → Relationship Label → Two Sides → 강점 → 충돌/주의 → 관계 흐름 → 행동 가이드 → CH0~CH9 → Share/Save/Next.
- 1:N 기본 IA: ranking → 후보 역할 → 공통 지표 비교 → 후보별 강점/주의 → 선택 기준 해석 → 상세 후보 리포트.
- 사주소년은 화자/브랜드 장치로 유지할 수 있으나 데이터와 문장이 결과 화면의 주인공이다.
- 실제 화면 컴포넌트/레이아웃 전면 개편은 아직 시작 전이다. 1단계는 Foundation 정의와 shared token 정렬까지만 수행한다.

## 검증 상태

- **PR #47 / Core calculation validation #677 PASS**
- 만세력 30 golden cases, 날짜·절입 경계, 궁합 엔진, 결제/AI 경계, 1:N, account/editorial/policy/Growth/report 계약 전부 PASS
- Foundation v2 P5 UI / persona / 1:1·1:N share-card / hotfix runtime UX 계약 PASS
- `npm run lint` PASS
- production build PASS
- 과거 라벤더 색상과 특정 breakpoint 숫자에 과결합된 assertion은 실제 기능/반응형 계약 중심으로 교체했다.
- 검증 과정에서 `vercel.json`의 Git 자동배포가 `true`로 남은 운영 규칙 위반을 발견해 `false`로 복구했고 관련 hotfix 계약도 PASS했다.

## 배포 상태

- 이번 Design Foundation v2 작업에서 Vercel Preview/Production 배포는 실행하지 않는다.
- Production과 최신 `main`은 일시적으로 다를 수 있으며 코드 상태와 배포 상태를 분리해 판단한다.
- 다음 Production 배포는 사용자 명시 승인 뒤 별도 수행한다.

## 남은 핵심 QA / 리스크

1. PR #45 배포본의 실제 1:1 runtime 재검증
2. 1:1·1:N 실제 공유 / 이미지 저장 / Shared View 확인
3. 홈 → 무료 결과 → 1:1 prefill 실제 동작 확인
4. 360 / 390 / 430px 핵심 플로우 육안 QA
5. 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
6. 회원탈퇴/데이터 삭제/Kakao unlink
7. 결과/계정 삭제 뒤 public share 및 analytics 정리 확인
8. Production runtime error / AI 비용 관찰

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
