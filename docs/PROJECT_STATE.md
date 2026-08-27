# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. GitHub 최신 `main`과 실제 코드가 최우선이다.

## 기준선

- 공식 서비스명: **우리사주**
- 기준 브랜치: `main`
- 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 + 운영 QA
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic
- 상품: 1:1 1,000원 / 1:N 3,000원
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- Vercel Git 자동배포는 기본 OFF. Production/Preview 배포는 사용자 명시 승인 후 별도 실행.

## 핵심 기능

- 서버 결정론적 만세력 + 9개 궁합 지표
- 궁합 scoring **v1.6**: 관계유형별 가중치 + 실제 도달 가능한 공개 점수 30~100, 절대 최대 100
- 관계별 별도 ceiling 없음. 약한 결과를 보기 좋게 끌어올리는 숨은 가점 없음
- 무료 천생연분: 입력 → 결정론 사주 분석 → 결과 화면
- 1:1 / 1:N 입력·결제·결과·저장·재열람
- 결제 검증 후에만 유료 AI 서술 생성
- 1:1: `claude-sonnet-5`, structured output, segment 저장 + single-flight/idempotency
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

- 기존 desktop-like 입력 UI 폐기, 모바일 레퍼런스형 재구성 완료.
- 출생시간은 오전/오후 선택 없이 **24시간제 HHMM**.
- 1:1: `내 정보 → 상대방 정보 → 확인` 3단계.
- 1:N: `기본 정보 → 후보 정보 → 확인`, 후보 2~5명.

### 1:1 결과

- **390px 모바일 layout v3 구현 완료.**
- 구조: `01 한눈에 보기 → 02 두 사람 사주 → 03 끌림 + 시너지 → 04 관계 구조 → 05 관계 성향 → 06 갈등 루프 → 07 관계 심층 → 08 장기 전망 → 09 관계 사용설명서 → 주토피 마무리`.
- 기존 계산·결제·복구·저장·single-flight·공유·보관함 귀속은 유지.
- 사용자 화면에서는 입력 별칭을 그대로 사용하고 `나/상대방/A/B`를 인물 호칭으로 쓰지 않는다.
- **layout v3 전용 유료 narrative v8 구현 완료.** 기존 API/storage 호환을 위해 `intro/dynamics/action` 3-segment 계약은 유지한다.
- 전체 유료 본문 목표는 **약 5,000자, 허용 4,000~6,000자**. 짧은 이미지 샘플 분량이 아니라 실제 생성 본문을 길게 작성하도록 세그먼트별 품질 하한과 필드별 목표 길이를 설정했다.
  - intro 목표 1,050~1,400자
  - dynamics 목표 1,450~1,900자
  - action 목표 1,800~2,400자
- 분량은 새 화면에서 실제 사용하는 `총평/개인 성향/끌림·시너지/양방향 영향/갈등 3개/관계유형 심층 4개/장기 조건/사용설명서`에 집중한다. 저장 호환용 보조 필드는 짧게 유지한다.
- 일상어 결론은 일간·일지·오행·천간/지지 상호작용 등 제공된 사주 근거와 같은 문단에서 연결한다.
- Claude는 점수·순위·원국을 변경하지 않으며 내부 시스템 문구를 사용자 결과에 노출하지 않는다.
- **생성 대기 화면 v4 구현 완료:** 주토피가 빨간 상승 흐름을 두고 궁합 `떡상 기원`하는 전면 일러스트, 단계 문구, 애니메이션 진행 바, reduced-motion 대응. 가짜 정밀 퍼센트 대신 실제 생성 단계와 연결된 대기 경험을 사용한다.
- 360 / 390 / 430px responsive contract가 있다. 실브라우저 pixel-level QA는 별도 남아 있다.

## 검증 상태

- **PR #69 / Core calculation validation #806 PASS** — 1:1 narrative v8 4,000~6,000자 설계 + bullish Jootopi loading UX + 전체 calculation/payment/AI/1:N/account/Growth contracts + lint + production build PASS.
- PR #68 / validation #799 PASS — 1:1 layout v3.
- PR #67 / validation #791 PASS — scoring v1.6.
- PR #65 / validation #778 PASS — 무료 천생연분 결정론 결과.

## 배포 상태

- 천생연분 결과 Preview: `preview/soulmate-result-v1`, Vercel success.
- **1:1 layout v3 + narrative v8 + 새 로딩 화면은 아직 Preview/Production 배포하지 않았다.**
- Production에는 최신 무료 천생연분 및 scoring v1.6 변경도 아직 배포하지 않았다.
- `main` Git 자동배포 OFF 유지.

## 남은 핵심 작업 / 리스크

1. 1:1 layout v3 + 5천자 narrative + 로딩 화면 Preview 배포 승인 후 390px 실제 생성 QA
2. 실제 Sonnet 5 생성 샘플에서 사용자 노출 본문 4,000~6,000자 준수 여부와 중복/근거 밀도 확인
3. 360 / 390 / 430px overflow/spacing QA
4. 기존 실패 결제의 1:1 생성 → 저장 → 재열람 Production 복구 확인
5. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View

## 출시 blocker

- 결제 성공 후 결과 유실
- 동일 결제 AI 중복 생성/중복 비용
- 권한 없는 유료 결과 열람
- 개인정보·비밀값·내부 지표 부적절 노출
- JSON/API/저장 실패로 유료 결과 생성 불가
- 결제 후 timeout/무한 재시도로 결과 미도달
