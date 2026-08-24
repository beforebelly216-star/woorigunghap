# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. 작업 시작 시 반드시 읽고, 의미 있는 작업 완료 후 갱신한다.

## 기준선

- 공식 프로젝트명/서비스명: **우리사주**
- 기준 브랜치: `main`
- 기준 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 및 운영 QA 단계
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 배포: Vercel Production. **Git 자동 배포는 비활성화하며 Preview/Production 배포는 사용자 명시 승인 후 별도 실행**
- 최신 승인 Production 배포: `89a4bb604248d7bc8c21f605aba19e027c2b4fdc` Vercel `success`. 기능 코드는 PR #45 main merge `2da9762459d189783c633a17a7331f8b468a18a5`를 포함한다. 배포 직후 자동배포는 `c94f60e8b58e50ca0738ad33124aac8502b2b9df`에서 다시 비활성화됐고 해당 commit에는 Vercel deployment status가 없다.
- 레거시 내부 식별자: GitHub 저장소 `beforebelly216-star/woorigunghap`, 기존 Vercel 도메인, DB의 `woorigunghap_*` 식별자는 호환성을 위해 유지한다.

## 현재 구현 상태

- **free-first 신규 유입:** 홈 첫 CTA `무료로 내 관계 성향 보기` → `/free` deterministic 자기 분석 → 결과 뒤 1:1/1:N 유료 전환
- 무료 자기 분석은 기존 만세력 + 60일주 캐릭터 편집 레이어만 사용하고 4개 Aha insight를 반환하며 주문·결제·유료 AI 생성을 만들지 않음
- 무료 API DTO는 원본 생년월일시·전체 명식 snapshot·유료 점수/본문·결제/접근 식별자를 반환하지 않음
- 무료 결과 → 1:1 이동 시 같은 브라우저 sessionStorage의 본인 입력을 첫 번째 사람으로 prefill하며 raw birth input을 URL query에 넣지 않음
- 1:1 상품 1,000원
- 1:N 상품 3,000원, 기준자 1명 + 후보 2~5명
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 서버 만세력 계산 및 9개 궁합 지표
- PortOne 결제 검증 및 webhook 멱등 처리
- 결제 검증 후 AI 리포트 생성, segment single-flight/idempotency
- 1:1 CH0~CH9 장문 리포트, 1:N 순위/비교 리포트
- Neon 서버 저장, 복구 링크, 선택형 Kakao 로그인, 계정 보관함
- 생성중 결과 보관함 표시 및 같은 브라우저 복구 재기동
- 완성된 보관함 결과 개별 영구 삭제. 상세 결과·입력정보·접근정보와 해당 public Shared View를 제거하고 법정 보존 최소 결제기록만 유지
- 궁합 공개 점수 v1.4: 내부 가중합·9개 차원은 유지하고 사용자 종합점수만 45~100점 단조 스케일로 표시
- 이용약관/개인정보/환불 정책, 회원탈퇴/데이터 삭제

## UI / UX hotfix 상태

- 홈·무료 입력·유료 입력·결제·생성중·결과·보관함·Shared View 핵심 surface를 **라벤더 기반 공통 파스텔 토큰**으로 통일
- 개정 전 크림/베이지/연노랑 surface와 순백 혼용을 핵심 화면 기본 테마에서 제거
- 홈의 `계산은 서버가`, `무료는 계산만`, `AI는 서술만`, `결제 후 생성` 등 구현 설명 카드와 하단 범용 면책 문구 제거
- 보관함 완성 결과 CTA를 `결과 열기 · 공유하기`로 명시해 공유 기능 발견성을 보강
- 기존 P5 UI 계약의 크림색 고정값을 새 공통 테마 계약으로 갱신
- 위 UI hotfix는 2026-08-24 사용자 승인 후 Production 배포까지 완료. 실제 모바일 육안 QA는 계속 필요

## 1:1 생성 및 콘텐츠

- `prepare` 후 `intro` / `dynamics` / `action` segment를 생성한다.
- 각 segment는 독립된 single-flight claim을 사용하고 stale claim 재획득 기준은 **5분 유지**해 살아 있는 장문 요청의 중복 AI 비용을 방지한다.
- **PR #41 배포본의 결함:** 첫 segment 요청이 세 segment를 동시에 시작한 뒤 `Promise.all`로 전부 끝날 때까지 응답을 막아, intro가 이미 끝나도 dynamics/action 중 하나가 220초 가까이 걸리면 Vercel `maxDuration=240`에 걸려 브라우저가 무한 재시도할 수 있었다.
- **PR #43 수정:** 요청한 segment만 HTTP 응답 완료 조건으로 기다리고, 다른 누락 segment는 같은 invocation에서 시작하되 Next.js `after()` / Vercel `waitUntil`로 응답 후에도 지속하도록 변경했다.
- **PR #43 Production runtime 재검증 결과:** 실제 사용자 화면에서 `0/3개 해설 묶음 완료 · 359초 경과`가 재현돼 추가 blocker가 확인됐다.
- **PR #45 전수조사 결과:** 결제검증 background kickoff, 결과 화면, segment route 내부 fan-out이 동시에 같은 1:1 segment lock을 선점할 수 있었고, exhausted AI/transport 실패는 5xx로 반환돼 클라이언트 무한 재시도에 가려질 수 있었다. Vercel `after()` 작업도 함수 전체 실행시간 제한의 적용을 받는다.
- **PR #45 구조 변경:** 결제검증/background helper에서는 1:1 AI를 시작하지 않는다. `intro`를 단독 생성하고 성공 후 `dynamics + action`만 병렬 가능하도록 staged fan-out을 사용한다. 1:N background generation은 유지한다.
- 1:1 route는 `maxDuration=300`, repository Vercel config는 `fluid: true`를 명시한다. Git 자동배포는 계속 비활성화한다.
- `complete` claim인데 authoritative `report_json`에 해당 segment가 없는 비정상 상태는 재획득해 복구할 수 있다. 살아 있는 `generating` claim의 5분 중복비용 안전창은 유지한다.
- Claude auth/billing/permission/model/request/rate-limit/overload/timeout/truncation/format/critical-quality failure와 PortOne lookup dependency failure를 분류한다. 반복 소진 뒤에는 일반 5xx 무한재시도로 숨기지 않고 사용자에게 종료 가능한 오류로 전달한다.
- 병렬 segment 저장의 PostgreSQL `jsonb_set(... )::text` 경로를 재확인했으며 DB JSONB→text cast 누락 가설은 배제했다.
- **PR #45 수정은 2026-08-24 사용자 승인 후 Production 배포 완료. 실제 기존 stuck 주문 회복 및 신규 1:1 생성 완료 runtime 검증이 남아 있다.**
- 같은 브라우저 보관함 생성 복구 handoff는 **60초 간격**으로 재시도한다.
- 목표 분량 약 5,000~8,000자, 필요 시 약 10,000자
- 계산된 일주·오행·관계 근거와 AI 서술 정합성 검증
- CH0~CH9 전용 `keyTakeaways`
- 구현 내부 표현의 사용자 노출 차단
- 일상 언어 결론/관계 장면을 먼저 쓰고 사주 용어·근거를 뒤에서 설명
- 유료 1:1 기본 화자 `사주소년`, 관계 유형별 미세 톤 분리
- CH2 `그 사람의 속마음`은 계산된 관계 반응을 1인칭 가상 독백으로 번역하는 편집 장치
- 기존 계산 snapshot 기반 6개 궁합 유형 및 60갑자 일주 캐릭터 편집 레이어
- 파스텔 마스코트 UI/UX, 8글자 사주 타일, 9축 레이더, 모바일 UI

## 1:N 구현 상태

- 후보별 순위·비교 리포트와 핵심 지표 제공
- 후보 이름 + 핵심 강점 기반 의미형 제목 적용
- 연락·대화 / 편안함·신뢰 / 갈등 회복 / 생활·장기관계 중심 사용자 언어
- 순번형 본문 표현과 단순 최하위 비난 표현 축소
- 계산 키/점수 공식과 기존 저장 리포트 호환성 유지

## 카카오 기능 상태

- Kakao 로그인은 계정 인증·구매 결과 귀속·보관함·회원탈퇴 unlink 용도로 유지
- Kakao Developers 메시지 보내기 기능은 사용하지 않음
- 카카오톡 채널/알림톡/SOLAPI 완료 알림 기능은 제거됨
- 완료 알림용 휴대전화 번호를 수집·저장하지 않음
- 과거 실험 DB 컬럼/테이블이 남아 있을 수 있으나 새 애플리케이션은 읽거나 쓰지 않음

## Growth 구현 상태

- 상세 실행 지침: `docs/PROMOTION_VIRAL_UX.md`
- **A0 완료:** 홈 free-first CTA, `/free` 한 사람 자기 분석, deterministic 4-insight Aha 결과, 결과 뒤 1:1/1:N 유료 CTA
- **P1 완료:** whitelist 공개 Share DTO, 이름 opt-in, 개인정보·유료 본문·내부 계산 상세 공개 금지
- **P2 완료:** raw 240개 검토 → 160개 Production 관계 카피, deterministic selector, curiosity mask
- **P3 완료:** 1:1·1:N Relationship Label / Two Sides / Send This 9:16 공유 카드, Web Share/이미지 저장/clipboard fallback
- **P4 완료:** opaque public token 기반 `/share/[token]`, 비로그인 제한 결과, 신규 궁합 CTA
- public share DB는 raw public token 대신 hash와 whitelist 공개 DTO만 저장
- 보관함 결과 영구 삭제 및 회원탈퇴 데이터 삭제 시 해당 결과의 public share도 제거
- **P5 완료:** Shared View 수신자 `꽤 맞음 / 반반 / 아닌데` 반응 UX와 9-event analytics 퍼널
- analytics 저장은 제한된 enum 필드만 허용하고 이름·생년월일시·구매 식별자·유료 본문을 저장하지 않음
- public share 연계 analytics는 raw token이 아닌 hash로 연결하고 public share 삭제 시 함께 정리
- **P6 완료:** 1:1·1:N `Receipt / Recap` 9:16 공유 카드와 deterministic `p6_receipt_first / p6_recap_first` A/B
- 1:1·1:N 실제 공유 구현은 Web Share API, 1080×1920 이미지 저장, opaque Shared View URL, clipboard fallback을 유지

## 최근 주요 검증

- Growth P5 PR #38 Core Validation #609: 기존 전체 contracts + P5 analytics/reaction contract + lint + production build PASS
- Growth P6 PR #39 Core Validation #613: 기존 전체 contracts + P6 experiment contract + lint + production build PASS
- Free acquisition PR #40 Core Validation #618: free acquisition contract + 기존 전체 contracts + lint + production build PASS
- PR #41 Core Validation #630 PASS: runtime/UI hotfix + 전체 회귀 + lint + production build
- PR #41 hotfix main merge: `c97d61bb2a43182c037aab832b1f657744935fd1`
- 승인 Production 배포: `1289a39972976bc05447fc14c86219c3cdaac983` → Vercel `success`
- **1:1 생성 응답 blocker PR #43 검증 code head:** `579317252b8c76a28eec3995ad4a809fe7fdda46`
- **PR #43 Core Validation #636 PASS:** 기존 전체 contracts + 수정된 non-blocking fan-out contract + lint + production build
- **PR #43 main merge:** `d20de6ad4f4a7e2cc5615ad9b1b132fc178f599e`
- **PR #43 승인 Production 배포:** one-shot enable commit `222341c8e8b84112e01036afb1b474744097072f` → Vercel `success`
- **자동배포 재비활성화:** `3c3c151edd33003b612ebc5bbdfc7271f6b42f35`; 해당 commit에는 Vercel deployment status 없음 확인
- **PR #45 1:1 generation hardening validated code head:** `7acc0009e19dcae5569591996b7ea0aa1960eea5`
- **PR #45 Core Validation #644 PASS:** 기존 전체 contracts + payment/narrative/storage + 1:N + account/editorial/policy/Growth/system + hotfix contract + lint + production build
- **PR #45 main merge:** `2da9762459d189783c633a17a7331f8b468a18a5`
- **PR #45 승인 Production 배포:** one-shot enable commit `89a4bb604248d7bc8c21f605aba19e027c2b4fdc` → Vercel `success`
- **자동배포 재비활성화:** `c94f60e8b58e50ca0738ad33124aac8502b2b9df`; 해당 commit에는 Vercel deployment status 없음 확인

## 현재 제품 우선순위

1. **blocker runtime QA: 배포된 PR #45에서 기존 stuck 주문 회복 및 신규 1:1 생성 완료 확인**
2. Production 테마·공유 실사용 QA
3. 최신 사용자 요청으로 지정된 제품 개선
4. AI 답변 스타일/사주소년 화자 품질 개선
5. 리포트 항목/정보구조 개선
6. 무료 유입/Growth 및 post-beta 운영 QA

## 아직 미완료인 운영 QA

- **현재 Production은 PR #45 hardening 배포본이다. 실제 유료 주문에서 생성 완료까지의 runtime 검증은 아직 필요하다.**
- 기존 `생성중` 주문이 saved segment / 5분 stale lock / complete-lock reconciliation을 통해 재개되는지 확인
- 새 1:1 실제 결제에서 intro 단독 완료 → dynamics/action → 전체 생성시간·저장·재열람까지 확인
- 실패 상황에서 장시간 무한대기 대신 분류된 종료 메시지가 노출되는지 확인
- Production에서 라벤더 테마가 홈/입력/결제/결과/보관함에 일관되게 적용됐는지 360 / 390 / 430px 육안 확인
- Production 1:1·1:N 결과에서 이미지 저장 / Web Share / public Shared View 링크가 실제 동작하는지 확인
- 홈 → `/free` 입력/결과 → `/one-to-one?from=free` 본인정보 prefill 실제 동작 확인
- public link 생성 → 비로그인 Shared View → 반응 → CTA 실제 동작 확인
- P5/P6 analytics row 생성, 9-event 퍼널 및 A/B arm 기록 확인
- 결과/계정 삭제 뒤 기존 Shared View 및 token 연계 analytics 정리 확인
- 1:1 실제 결제 반복 사용
- 1:N 실제 결제 반복 사용
- 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- 회원탈퇴/데이터 삭제/Kakao unlink
- Production runtime error와 AI 비용 관찰
- 공개 운영정보/환경값 최종 확인

## 출시 blocker 정의

1. 결제 성공 후 결과 유실
2. 동일 결제의 AI 중복 생성/비용 중복
3. 타 계정 유료 결과 열람
4. 정책 동의 없는 결제
5. 개인정보·비밀값·내부 지표의 부적절한 노출
6. 탈퇴 후 삭제 대상 데이터 잔존
7. 친구/직장동료 결과에 구조적으로 잘못된 연애·성적 프레임 혼입
8. JSON/API/저장 실패로 유료 결과 생성 불가
9. 결제 완료 후 1:1 생성 요청이 플랫폼 timeout/무한 재시도로 결과에 도달하지 못함

문체 취향, 재미, 일부 반복/분량 편차는 blocker로 취급하지 않는다.

## 운영 원칙

- GitHub 최신 `main`을 단일 진실 공급원으로 사용한다.
- 작업 시작 시 `AGENTS.md` → `docs/PROJECT_STATE.md` → `docs/NEXT_TASK.md` → `docs/DECISIONS.md` 순서로 읽는다.
- 사용자 요청이 `NEXT_TASK`보다 구체적이면 사용자 요청을 우선한다.
- 기존 완료 기능을 이유 없이 재작성하지 않는다.
- Vercel Hobby build rate limit은 코드 실패가 아니다.
- **Vercel Git 자동 배포는 비활성화하고 Preview/Production 배포는 대상 SHA와 테스트 결과를 제시한 뒤 사용자 명시 승인 후 실행한다.**
- 의미 있는 작업 후 `PROJECT_STATE`, `NEXT_TASK/HANDOFF`를 갱신한다.
