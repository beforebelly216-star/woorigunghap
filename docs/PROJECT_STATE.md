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
- 궁합 scoring **v1.6**: 5개 관계유형별 최종 가중치 + 실제 도달 가능한 공개 점수 30~100 절대 범위
- 관계별 별도 ceiling 없음. 모든 관계가 동일 공개 30~100 척도를 사용하며 절대 최대 100은 유지
- 세부 지표 raw 범위의 공통 교집합을 공개 30~100에 선형 정규화하므로 약한 결과를 재미 목적으로 끌어올리지 않음
- 무료 천생연분: 입력 → 결정론 사주 분석 → 결과 화면
- 1:1 / 1:N 입력·결제·결과·저장·재열람
- PortOne 결제 검증 / webhook 멱등 처리
- 결제 검증 후에만 유료 AI 서술 생성
- `claude-sonnet-5`, structured output 우선
- 1:1 segment 저장 + single-flight/idempotency
- 1:N 중복 생성 방지 + 저장 결과 재사용
- 비회원 복구 / Kakao 로그인 / 계정 보관함
- Shared View / Web Share / 1080×1920 공유 이미지

## UI / UX 현재 기준

### 홈 / 무료

- 사용자 승인 390px 모바일 레퍼런스가 UI 최우선 기준이다.
- 홈 진입 순서: **무료 천생연분 → 1:1 궁합 → 1:N 궁합**.
- 기존 `/free` 관계 성향 분석은 폐기·삭제 완료.
- `/api/free/soulmate`가 기존 만세력 원국으로 무료 결정론 결과를 생성한다.
- `/free/result`: 원국 → 4개 요약 → 추천 일간 TOP 2~3 → 잘 맞는 사주 구성 → 주토피 해설 → 1:1 CTA.

### 1:1 / 1:N 입력

- 기존 desktop-like 입력 UI를 폐기하고 모바일 레퍼런스형으로 재구성 완료.
- 출생시간은 오전/오후 선택 없이 **24시간제 HHMM**.
- 1:1: `내 정보 → 상대방 정보 → 확인` 3단계.
- 1:N: `기본 정보 → 후보 정보 → 확인`, 후보 2~5명.

### 1:1 결과 재설계 진행 기준

- 기존 결과 UI/UX는 새 390px 모바일 결과 디자인으로 전면 교체 예정.
- 목표 본문 약 5,000자, 허용 약 4,000~6,000자.
- 결과 호칭은 사용자가 입력한 별칭을 그대로 사용하고 `나/상대방/A/B` 대체 호칭을 쓰지 않는다.
- 일상언어 해석은 사주 계산 근거가 자연스럽게 읽히도록 구성한다.
- 내부 시스템 지침은 결과 화면에 노출하지 않는다.
- Claude Sonnet 5는 계산값을 바꾸지 않고 깊은 유료 서술에 사용한다.

## 검증 상태

- **PR #67 / Core calculation validation #791 PASS** — scoring v1.6 full-range normalization, 5개 관계 가중치, 전체 calculation/payment/AI/1:N/account/Growth contracts, lint, production build PASS.
- #791 샘플: 연인 72(raw 73.625), 짝사랑 74(raw 74.585), 썸 73(raw 74.022), 친구 시간미상 73(raw 73.975), 직장동료 양쪽 시간미상 72(raw 73.63).
- 공통 raw 하단 → 공개 30, 공통 raw 상단 → 공개 100 계약 검증 완료. 낮은 raw 60은 공개점수에서 60보다 낮아져 임의 상향이 없음을 확인.
- PR #66 / validation #787 PASS — 5개 관계 가중치 분리 및 과거 raw30→45 uplift 제거.
- PR #65 / validation #778 PASS — 무료 천생연분 결정론 결과.

## 배포 상태

- 천생연분 결과 Preview: `preview/soulmate-result-v1`, Vercel success.
- Production에는 최신 무료 천생연분 및 scoring v1.6 변경을 아직 배포하지 않았다.
- `main` Git 자동배포 OFF 유지.

## 남은 핵심 작업 / 리스크

1. **1:1 새 결과 리포트 구조·Claude Sonnet 5 narrative·390px UI 구현**
2. 천생연분/1:1 새 결과 390px 실화면 pixel-level QA
3. 360 / 390 / 430px 핵심 플로우 overflow/spacing QA
4. 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
5. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View

## 출시 blocker

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 개인정보·비밀값·내부 지표 부적절 노출
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 후 timeout/무한 재시도로 결과 미도달
