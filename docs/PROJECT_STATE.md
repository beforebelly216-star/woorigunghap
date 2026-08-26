# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. GitHub 최신 `main`과 실제 코드가 최우선이다.

## 기준선

- 공식 서비스명: **우리사주**
- 기준 브랜치: `main`
- 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 + 운영 QA
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic
- 상품: 1:1 1,000원 / 1:N 3,000원
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- Vercel Git 자동배포는 기본 OFF. Production 배포는 사용자 명시 승인 후 별도 실행.

## 핵심 기능

- 서버 결정론적 만세력 + 9개 궁합 지표
- 1:1 / 1:N 입력·결제·결과·저장·재열람
- PortOne 결제 검증 / webhook 멱등 처리
- 결제 검증 후에만 AI 서술 생성
- `claude-sonnet-5`, structured output 우선
- 1:1 segment 저장 + single-flight/idempotency
- 1:N 중복 생성 방지 + 저장 결과 재사용
- 비회원 복구 / Kakao 로그인 / 계정 보관함
- Shared View / Web Share / 1080×1920 공유 이미지
- public share DTO에 원본 생년월일시·유료 본문·paymentId·accessToken 미포함

## UI / UX 현재 기준

### 홈

- 2026-08-27 사용자 첨부 A안 390px 모바일 레퍼런스가 홈 UI의 최우선 기준이다.
- 홈은 390px 앱형 단일 컬럼, pastel pink/lavender/butter yellow, rounded card 기반이다.
- 현재 상품 진입 순서: **무료 천생연분 → 1:1 궁합 → 1:N 궁합**.
- TOP 3 / 관계 흐름 / 주토피 한마디 / 하단 4탭 구조 유지.

### 무료 천생연분

- 기존 `/free` 관계 성향 자기분석 UI/API/결과 생성기는 **폐기·삭제 완료**.
- `/free`는 사용자 첨부 모바일 폼 레퍼런스를 기준으로 **무료 내 천생연분 보기 입력 UI**로 교체.
- 입력: 이름/별칭 → 성별 → 양력/음력 → YYYYMMDD → 24시간제 HHMM → 시간 모름.
- 현재는 **UI/UX만 구현**. 입력값은 sessionStorage 보조 사본으로 저장 가능.
- 사주원국을 기준으로 잘 어울리는 사주 팔자를 설명하는 천생연분 결과 계산/서술 로직은 아직 미구현.

### 1:1 / 1:N 입력

- 기존 desktop-like 입력 UI는 폐기하고 사용자 첨부 모바일 레퍼런스형으로 전면 재구성.
- 공통 입력 컨트롤은 무료/1:1/1:N이 같은 디자인 언어를 사용.
- 출생시간은 오전/오후 선택 없이 **24시간제 HHMM**.
- 1:1 기능 구조: `내 정보 → 상대방 정보 → 확인` 3단계. 기존 관계 유형·prefill·주문/결제 진입 로직 유지.
- 1:N 기능 구조: `기본 정보 → 후보 정보 → 확인`, 후보 2~5명. 기존 draft·주문/결제 진입 로직 유지.
- 결제·계산·AI·저장 backend contract는 변경하지 않음.

## AI / 유료 결과 안정성

- 1:1 목표 분량: 공백 제외 약 2,500~4,000자
- intro/dynamics/action 저장·복구 유지
- `max_tokens` 잘림 시 제한된 1회 확장 재시도
- transport/API 실패 구조화 로그
- 실패 lock 해제 후 동일 결제 재시도 가능

## 검증 상태

- **PR #64 / Core calculation validation #767 PASS** — 무료 천생연분 입력 UI, 기존 무료 분석 runtime 제거, 1:1·1:N 입력 레퍼런스형 재구성, 전체 calculation/payment/AI/1:N/account/Growth contracts, lint, production build 통과.
- PR #63 / validation #761 PASS — A99 홈 재구성
- PR #62 / validation #752 PASS — 결제·생성 v3

## 배포 상태

- PR #64 변경은 아직 Production에 배포하지 않았다.
- 현재 Production은 최신 UI 코드보다 이전 상태일 수 있다.
- Git 자동배포 OFF 유지.

## 남은 핵심 작업 / 리스크

1. **무료 천생연분 deterministic 결과 로직 설계·구현** — 사용자 사주원국 → 잘 어울리는 상대 사주 팔자/오행·일간·지지 조건 설명
2. PR #64 Preview 또는 Production 배포 후 첨부 레퍼런스와 390px 실화면 pixel-level 대조·보정
3. 360 / 390 / 430px 홈·무료·1:1·1:N 입력 overflow/spacing QA
4. 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
5. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View
6. 비회원 결과 → Kakao 로그인 → 귀속 → 보관함

## 출시 blocker

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 개인정보·비밀값·내부 지표 부적절 노출
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 후 timeout/무한 재시도로 결과 미도달
