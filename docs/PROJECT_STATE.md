# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. GitHub 최신 `main`과 실제 코드가 최우선이다. 과거 작업 일지는 누적하지 않고 현재 실제 상태만 유지한다.

## 기준선

- 공식 서비스명: **우리사주**
- 기준 브랜치: `main`
- 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 + 운영 QA 단계
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 상품: 1:1 1,000원 / 1:N 3,000원
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 배포: Vercel Production. Git 자동배포는 기본 비활성화이며 Preview/Production은 사용자 명시 승인 후 별도 실행한다.

## 핵심 기능 상태

- 홈 free-first 퍼널과 `/free` deterministic 자기 분석 구현
- 서버 결정론적 만세력 + 9개 궁합 지표 계산
- 1:1 및 1:N 입력·결제·결과·저장·재열람 흐름 구현
- PortOne 결제 검증 / webhook 멱등 처리
- 결제 검증 후에만 AI 서술 생성
- 유료 AI 기본 모델 `claude-sonnet-5`, structured output 우선
- 1:1 segment별 PostgreSQL 원자 저장, 완료 segment 재사용, single-flight/idempotency 유지
- 1:N도 동일 결제 중복 생성 방지 및 저장 결과 재사용 유지
- 비회원 결과 복구 / Kakao 로그인 / 계정 보관함 구현
- Shared View / 1:1·1:N Web Share / 1080×1920 공유 이미지 생성 경로 구현
- public share DTO에는 원본 생년월일시·유료 본문·paymentId·accessToken 등 민감/유료 식별 정보를 포함하지 않는다.

## UI / UX v3 진행 상태

기준 문서: `docs/JOOTOPI_UI_REDESIGN.md`

확정 조합: Typography B / Iconography B / Data Visualization A / Motion A / Layout Grammar A / Character Rules B.
핵심 문장: **정보는 빠르고 명확하게, 주토피는 적재적소에.**

- **홈 v3 완료:** 390px mobile-first, White/Off-white + Black/Yellow, free-first 유지
- **`/free` v3 완료:** 단일 정보 카드, 짧은 설명, 24시간제 HHMM
- **1:1 입력 v3 완료:** `내 정보+관계 → 상대방 정보 → 확인` 3단계
- **1:N 입력 v3 완료:** `기본 정보 → 후보 정보 → 확인` 3단계, 후보 2~5명
- **결제·생성 UX v3 코드 완료:** PR #62 병합 `ef8ea140`
  - 1:1·1:N 모두 `입력 완료 → 결제 → 생성` 진행 맥락 표시
  - 결제 직전 상품 요약, 가격, 제공 내용, 자동 저장·복구 안내 재구성
  - 모바일 sticky 결제 CTA 적용
  - 1:1 생성 대기 상태와 1:N 생성/복구/실패 상태를 neutral v3 surface로 정리
  - 기존 결제 검증·계산·AI·저장·single-flight/idempotency backend contract는 변경하지 않음
- 캐릭터 시트·신규 포즈 최종 Production 검수는 사용자 요청에 따라 후순위로 보류

## AI / 유료 결과 안정성

- 1:1 리포트 목표 분량: 공백 제외 약 2,500~4,000자
- intro/dynamics/action 단계 생성과 진행 저장 유지
- `max_tokens` 중단 시 제한된 1회 확장 재시도
- transport/API 실패를 구조화 로그로 분류
- 구조적으로 유효한 결과가 편집 취향 수준의 품질 검사 때문에 결제 결과 전체를 막지 않도록 서버 보정·재검사 경로 유지
- 실패 lock은 해제되어 같은 결제로 안전하게 재시도 가능

## 검증 상태

- **PR #62 / Core calculation validation #752 PASS** — v3 결제·생성 presentation, 기존 payment/AI/single-flight/storage/recovery 계약, 전체 account/editorial/policy/Growth/system QA, lint, production build 통과
- PR #61 / validation #746 PASS — 1:N 입력 v3 + 전체 contracts/lint/build
- PR #60 / validation #742 PASS — 1:1 입력 v3 + 전체 contracts/lint/build
- PR #59 / validation #736 PASS — `/free` v3 + 24시간 HHMM + 전체 contracts/lint/build
- PR #58 / validation #732 PASS — 홈 v3 + 전체 contracts/lint/build
- 만세력/경계/궁합/결제/AI/1:N/account/editorial/policy/Growth/report 계약 현재 PASS

## 배포 상태

- 현재 Production에는 **홈 + `/free` + 1:1 입력 + 1:N 입력 v3**까지 반영되어 있다.
- 해당 Production 배포는 PR #61 기능 병합 `79d8307a` 이후 승인된 트리거 `430c5538`에서 Vercel status `success`, 이후 `41730e8b`에서 Git 자동배포를 다시 비활성화했다.
- **PR #62 결제·생성 UX v3 (`ef8ea140`)는 `main`에는 병합됐지만 아직 Production에 배포하지 않았다.** 이번 작업에는 별도 배포 승인이 없었다.
- Git 자동배포는 `deploymentEnabled=false` 상태를 유지한다.
- Vercel connector는 현재 team 조회는 가능하지만 project/deployment 목록 조회가 정상 동작하지 않아 자동 Production 육안 QA가 제한된다. 이는 코드 실패로 판정하지 않는다.

## 남은 핵심 QA / 리스크

1. 실패했던 동일 결제로 실제 Production 1:1 생성 → 저장 → 재열람 복구 확인
2. 신규 실제 결제의 전체 생성 시간 및 보관함 재열람 확인
3. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크 확인
4. 홈 → `/free` → 유료 CTA → 1:1 prefill 실제 동작 확인
5. **v3 홈·`/free`·1:1·1:N 360 / 390 / 430px Production 실기기 UX 확인**
6. PR #62 결제·생성 UX v3의 Production 배포 후 360/390/430px 결제·대기·실패 상태 육안 QA
7. 768 / 1280px spacing/overflow 최종 QA
8. 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
9. 회원탈퇴 / 데이터 삭제 / Kakao unlink
10. 결과/계정 삭제 뒤 public share 및 analytics 정리 확인

## 출시 blocker 정의

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 정책 동의 없는 결제
- 개인정보·비밀값·내부 지표의 부적절한 노출
- 탈퇴 후 삭제 대상 데이터 잔존
- 친구/직장동료 결과에 구조적으로 잘못된 연애/성적 프레임 혼입
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 완료 후 플랫폼 timeout/무한 재시도로 결과에 도달하지 못함

문체 취향, 재미, 일부 반복/분량 편차는 blocker가 아니다.
