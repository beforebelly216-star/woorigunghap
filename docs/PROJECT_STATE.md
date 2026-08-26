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

- `/free` deterministic 자기 분석
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

### 홈 — A99 기준

- **2026-08-27 사용자가 현재 대화에서 첨부한 A안 390px 모바일 레퍼런스가 홈 UI의 최우선 Source of Truth다.**
- 사용자는 `가깝게`가 아니라 **99% 동일한 구현**을 지시했다.
- 과거 home free-first, neutral desktop landing, Design Foundation v2/v3의 상충하는 홈 규칙은 폐기했다.
- 현재 구현 구조:
  - 상단 우리사주 + 알림
  - 크림/버터 hero + 주토피
  - 1:1 / 1:N 2열 상품 직접 진입
  - 오늘의 궁합 TOP 3
  - 관계 흐름 주간 line chart
  - 주토피 오늘의 한마디
  - 하단 고정 4탭: 홈 / 보관함 / 이벤트 / 마이페이지
- 홈은 390px 앱형 단일 컬럼이며 pastel pink/lavender/butter yellow, rounded card, 제한적 gradient/shadow를 레퍼런스대로 사용한다.
- 홈 경로에서는 기존 글로벌 footer를 숨기고 전용 상단/하단 앱 chrome을 사용한다.

### 기타 화면

- `/free`: 24시간제 HHMM 입력 유지
- 1:1 입력: `내 정보+관계 → 상대방 정보 → 확인`
- 1:N 입력: `기본 정보 → 후보 정보 → 확인`, 후보 2~5명
- 결제·생성 UX v3는 PR #62 병합 `ef8ea140`으로 main에 있음. Production 미배포.
- 캐릭터 원본 시트 최종 asset 교체는 후순위. 현재 홈은 `ZootopiMark`를 임시 공식 렌더 자산으로 사용.

## AI / 유료 결과 안정성

- 1:1 목표 분량: 공백 제외 약 2,500~4,000자
- intro/dynamics/action 저장·복구 유지
- `max_tokens` 잘림 시 제한된 1회 확장 재시도
- transport/API 실패 구조화 로그
- QUALITY_CRITICAL 때문에 유효 결과가 막히지 않도록 서버 보정·재검사 경로 유지
- 실패 lock 해제 후 동일 결제 재시도 가능

## 검증 상태

- PR #63: A안 390px 홈 완전 재구성, 과거 free-first UI 계약 폐기 및 관련 정적 계약 갱신. 최종 Core calculation validation 결과를 HANDOFF에 기록한다.
- PR #62 / validation #752 PASS — 결제·생성 v3 + 전체 contracts/lint/build
- PR #61 / validation #746 PASS — 1:N 입력 v3
- PR #60 / validation #742 PASS — 1:1 입력 v3
- PR #59 / validation #736 PASS — `/free` + 24시간 HHMM

## 배포 상태

- 현재 Production에는 PR #61까지의 홈/무료/입력 v3가 반영되어 있다.
- **PR #62 결제·생성 v3와 PR #63 A99 홈은 아직 Production에 배포하지 않았다.**
- Git 자동배포 OFF 유지.

## 남은 핵심 QA / 리스크

1. A99 홈 Production 배포 후 실제 사용자 첨부 레퍼런스와 390px 실화면 대조
2. 360 / 390 / 430px 홈 spacing/overflow 확인
3. 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
4. 실제 1:1 paid runtime 생성 시간·보관함 재열람
5. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View
6. 비회원 결과 → Kakao 로그인 → 귀속 → 보관함
7. 회원탈퇴 / 데이터 삭제 / Kakao unlink

## 출시 blocker

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 정책 동의 없는 결제
- 개인정보·비밀값·내부 지표 부적절 노출
- 삭제 대상 데이터 잔존
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 후 timeout/무한 재시도로 결과 미도달
