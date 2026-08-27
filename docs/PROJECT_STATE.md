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

### 1:1 결과 재설계

- **390px 모바일 layout v3 구현 완료.** 기존 CH0~CH9 직접 렌더 조립 대신 아래 탑다운 구조로 재배치했다.
  - `01 한눈에 보기 → 02 두 사람 사주 → 03 끌림 + 시너지 → 04 관계 구조 → 05 관계 성향 → 06 갈등 루프 → 07 관계 심층 → 08 장기 전망 → 09 관계 사용설명서 → 주토피 마무리`
- 기존 계산·결제·복구·저장·single-flight·공유·보관함 귀속 로직은 변경하지 않았다.
- 현재 layout v3는 **기존 v7 저장/생성 콘텐츠를 새 정보 구조에 재배치하는 1차 단계**다. Claude Sonnet 5 prompt/schema를 새 구조 전용으로 재설계하는 작업은 아직 남아 있다.
- 사용자 화면의 핵심 인물 라벨은 입력 별칭을 그대로 사용하고 `나의 사주/상대의 사주`, `나의 캐릭터/상대의 캐릭터` 같은 고정 대체 호칭을 제거했다.
- 360 / 390 / 430px responsive contract를 추가했다. 실브라우저 pixel-level QA는 별도 남아 있다.
- 목표 본문 약 5,000자, 허용 약 4,000~6,000자.
- 내부 시스템 지침은 결과 화면에 노출하지 않는다.

## 검증 상태

- **PR #68 / Core calculation validation #799 PASS** — 1:1 layout v3 + 전체 calculation/payment/AI/1:N/account/Growth contracts + lint + production build PASS.
- PR #67 / validation #791 PASS — scoring v1.6 full-range normalization, 5개 관계 가중치, 전체 contracts/lint/build PASS.
- #791 샘플: 연인 72(raw 73.625), 짝사랑 74(raw 74.585), 썸 73(raw 74.022), 친구 시간미상 73(raw 73.975), 직장동료 양쪽 시간미상 72(raw 73.63).
- 공통 raw 하단 → 공개 30, 공통 raw 상단 → 공개 100 계약 검증 완료.
- PR #65 / validation #778 PASS — 무료 천생연분 결정론 결과.

## 배포 상태

- 천생연분 결과 Preview: `preview/soulmate-result-v1`, Vercel success.
- **1:1 layout v3는 아직 Preview/Production 배포하지 않았다.**
- Production에는 최신 무료 천생연분 및 scoring v1.6 변경도 아직 배포하지 않았다.
- `main` Git 자동배포 OFF 유지.

## 남은 핵심 작업 / 리스크

1. **1:1 새 결과 구조 전용 Claude Sonnet 5 narrative schema/prompt 및 약 4,000~6,000자 콘텐츠 매핑**
2. 1:1 layout v3 390px 실화면 pixel-level QA 및 360/430px overflow/spacing QA
3. 천생연분 결과 390px 실화면 pixel-level QA
4. 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
5. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View

## 출시 blocker

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 개인정보·비밀값·내부 지표 부적절 노출
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 후 timeout/무한 재시도로 결과 미도달
