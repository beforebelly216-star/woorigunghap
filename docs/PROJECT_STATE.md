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
- 무료 천생연분: 입력 → 결정론 사주 분석 → 결과 화면
- 1:1 / 1:N 입력·결제·결과·저장·재열람
- PortOne 결제 검증 / webhook 멱등 처리
- 결제 검증 후에만 유료 AI 서술 생성
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

### 무료 천생연분

- 기존 `/free` 관계 성향 자기분석 UI/API/결과 생성기는 폐기·삭제 완료.
- 입력: 이름/별칭 → 성별 → 양력/음력 → YYYYMMDD → 24시간제 HHMM → 시간 모름.
- `/api/free/soulmate`가 기존 만세력 원국을 사용해 무료 결정론 결과를 생성하며 외부 AI/결제를 사용하지 않는다.
- `/free/result`는 승인된 390px 레퍼런스 기반 앱형 결과 화면이다.
- 결과 순서: Hero → 사주팔자 전체 원국 → 일간/성향 키워드/강점/보완점 → 추천 일간 TOP 2~3 → 잘 맞는 사주의 구체적 구성 → 주토피 마지막 해설 → 1:1 CTA.
- `천생연분 지수`/퍼센트는 사용하지 않는다.
- `만남 & 관계 가이드`, `인연 시기 흐름`, 추천 활동/컬러는 제외한다.
- 추천 근거: 일간 생극, 오행 분포, 음양 보완, 일지 합충. 용신은 현재 EVIDENCE_ONLY라 확정 판정하지 않는다.
- 주토피는 Hero + 중간 Commentary + 마지막 해설 + CTA companion 수준으로 사용한다.

### 1:1 / 1:N 입력

- 기존 desktop-like 입력 UI는 폐기하고 사용자 첨부 모바일 레퍼런스형으로 재구성.
- 출생시간은 오전/오후 선택 없이 **24시간제 HHMM**.
- 1:1: `내 정보 → 상대방 정보 → 확인` 3단계.
- 1:N: `기본 정보 → 후보 정보 → 확인`, 후보 2~5명.
- 유료 결제·계산·AI·저장 backend contract는 변경하지 않음.

## AI / 유료 결과 안정성

- 1:1 목표 분량: 공백 제외 약 2,500~4,000자
- intro/dynamics/action 저장·복구 유지
- `max_tokens` 잘림 시 제한된 1회 확장 재시도
- transport/API 실패 구조화 로그
- 실패 lock 해제 후 동일 결제 재시도 가능

## 검증 상태

- **PR #65 / Core calculation validation #778 PASS** — 무료 천생연분 결정론 결과, 결과 UI 계약, 기존 calculation/payment/AI/1:N/account/Growth contracts, lint, production build 전체 통과.
- PR #65 → `main` 병합 완료: `4740c240`.
- PR #64 / validation #773 PASS — 무료 천생연분 입력 + 1:1·1:N 입력 재구성.
- PR #63 / validation #761 PASS — A99 홈 재구성.
- PR #62 / validation #752 PASS — 결제·생성 v3.

## 배포 상태

- **천생연분 결과 Preview 배포 완료**: branch `preview/soulmate-result-v1`, deploy trigger `7f0b031c`, Vercel status `success`.
- Vercel deployment detail: `https://vercel.com/beforebelly216-stars-projects/woorigunghap-uty7/GQzipRKZLGcmTEKfnBMdwu3YAvrf`
- Preview 배포 후 branch `vercel.json`은 `4182eb52`에서 `deploymentEnabled:false`로 원복.
- Production에는 최신 무료 천생연분 변경을 배포하지 않았다.
- `main` Git 자동배포 OFF 유지.

## 남은 핵심 작업 / 리스크

1. 천생연분 결과 Preview 390px 실화면을 승인 레퍼런스와 pixel-level 대조·보정
2. 360 / 390 / 430px 홈·무료·천생연분 결과·1:1·1:N overflow/spacing QA
3. 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
4. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View
5. 비회원 결과 → Kakao 로그인 → 귀속 → 보관함

## 출시 blocker

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 개인정보·비밀값·내부 지표 부적절 노출
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 후 timeout/무한 재시도로 결과 미도달
