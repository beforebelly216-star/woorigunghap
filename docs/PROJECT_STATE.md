# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. GitHub 최신 `main`과 실제 코드가 최우선이며, 의미 있는 작업 완료 후 갱신한다.

## 기준선

- 공식 서비스명: **우리사주**
- 기준 브랜치: `main`
- 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 + 운영 QA 단계
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 상품: 1:1 1,000원 / 1:N 3,000원
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 배포: Vercel Production. Git 자동배포는 비활성화가 기본이며 Preview/Production은 사용자 명시 승인 후 별도 실행한다.

## 현재 구현 상태

- 홈 free-first 퍼널과 `/free` deterministic 자기 분석 구현
- 1:1 입력/결제 compact 480px, 완성 리포트 report 640px Foundation v2 적용
- 1:N 입력/결제 compact 480px, 비교 결과 compare 960px Foundation v2 적용
- 계정/보관함은 `account-foundation.css`가 Foundation v2 layout owner로 관리
- **Shared View는 Foundation v2 neutral canvas + typography/divider 위계로 전환했다.** 기존 lavender radial/linear gradient, 큰 shadow, card wall, `max-width:99999px` 규칙을 제거했다.
- **1:1·1:N 9:16 공유 카드 preview와 실제 1080×1920 canvas export를 같은 Foundation v2 시각체계로 통일했다.** neutral base/card, ink score/CTA, gray hierarchy를 사용하며 장식 gradient/라벤더 원형 장식을 제거했다.
- Receipt / Recap / Relationship Label / Two Sides / Send This 카드 목적과 P6 A/B experiment는 유지한다.
- public share DTO에는 생년월일시·유료 본문·paymentId·accessToken 등 민감/유료 식별 정보를 포함하지 않는다.
- Shared View reaction, analytics, 신규 궁합 CTA, Web Share, 이미지 저장, 이름 opt-in 동작 유지
- 서버 결정론적 만세력 + 9개 궁합 지표 계산
- PortOne 결제 검증 / webhook 멱등 처리
- 결제 검증 뒤 AI 서술 생성, segment single-flight/idempotency
- **1:1 AI 리포트는 CH0~CH9 구조와 관계별 해석 품질을 유지하면서 전체 목표를 공백 제외 약 2,500~4,000자로 축소했다.** intro/dynamics/action의 1차 출력 한도는 각각 1,800/2,600/3,000 tokens이며 `max_tokens` 중단 때만 2,400/3,400/3,800으로 한 번 재시도한다.
- **Anthropic structured output을 우선 사용하고 미지원 응답은 기존 JSON 파싱으로 호환한다.** 408/409/429/5xx transport 실패, 중단 사유, 요청 ID, 소요 시간, 출력량을 구조화 로그로 남기며 각 segment는 명시적 timeout과 총 요청 예산 안에서 최대 2회만 시도한다.
- segment별 PostgreSQL 원자 저장, 완료 segment 재사용, 결제별 single-flight/idempotency는 그대로 유지한다. 실패 lock은 해제해 같은 결제로 안전하게 다시 시도할 수 있다.
- Neon 서버 저장 / 비회원 복구 / 선택형 Kakao 로그인 / 계정 보관함

## UI / UX — Design Foundation v2

- `docs/DESIGN_FIVE_ELEMENT_SYSTEM.md`가 전체 UI/UX의 단일 디자인 Source of Truth다.
- 핵심 시각 문법: neutral canvas + 실제 데이터에만 쓰는 오행 기능색 + typography-first + progressive disclosure.
- 2단계 공통 shell + 홈 완료
- 3단계 무료 분석 입력/결과 완료
- 4단계 1:1 입력/결제 완료
- 5단계 생성중/복구/실패 상태 완료
- 6단계 1:1 완성 결과 완료
- 7단계 1:N 입력/결제/비교 결과 완료
- 8단계 보관함/계정 완료
- **9단계 Shared View / 공유 카드 시각 통합 완료**
- 다크모드는 지원하지 않는다.

## 검증 상태

- **PR #55 / Core calculation validation #710 PASS**
- 만세력/경계/궁합/결제/AI/1:N/account/editorial/policy/Growth/report 전체 계약 PASS
- 1:1 AI 생성 복원력 계약 PASS: 명시적 token ceiling, `max_tokens` 1회 확장 재시도, structured-output fallback, fatal UX 분류 검증
- Shared View contract에 Foundation v2 neutral styling, legacy lavender/gradient 제거, 1080×1920 canvas export 색상 기준 검증 추가
- lint PASS: 오류 0건, 기존 미사용 변수 warning 3건
- production build PASS
- public DTO/privacy/opaque token/Web Share/image download/analytics/reaction 로직 변경 없음

## 배포 상태

- Foundation v2 9단계에서 Vercel Preview/Production 배포는 실행하지 않는다.
- 1:1 AI 생성 hotfix `f758c4f`도 아직 Production에 배포하지 않았다.
- Git 자동배포는 비활성화 상태를 유지한다.
- Production과 최신 `main`은 일시적으로 다를 수 있다.

## 남은 핵심 QA / 리스크

1. `f758c4f` 포함 최신 `main`을 사용자 승인 후 Production에 1회 배포하고 실제 1:1 runtime 재검증
2. 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크 확인
3. 홈 → 무료 결과 → 1:1 prefill 실제 동작 확인
4. **360 / 390 / 430 / 768 / 1280px 전체 Foundation 화면 육안 QA 및 spacing/overflow 최종 보정**
5. 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
6. 회원탈퇴/데이터 삭제/Kakao unlink
7. 결과/계정 삭제 뒤 public share 및 analytics 정리 확인

현재 연결된 Vercel 프로젝트의 runtime log를 이 작업 환경에서 조회하지 못했으므로, 실제 Anthropic 응답 시간·중단 사유·저장 완료 여부는 다음 승인 배포의 paid QA에서 구조화 로그와 함께 확인해야 한다.

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
