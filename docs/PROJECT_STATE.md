# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. 작업 시작 시 반드시 읽고, 의미 있는 작업 완료 후 갱신한다.

## 기준선

- 공식 프로젝트명/서비스명: **우리사주**
- 기준 브랜치: `main`
- 기준 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 및 운영 QA 단계
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 배포: Vercel Production, `main` 자동 배포
- 레거시 내부 식별자: GitHub 저장소 `beforebelly216-star/woorigunghap`, 기존 Vercel 도메인, DB의 `woorigunghap_*` 식별자는 호환성을 위해 유지한다.

## 현재 구현 상태

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

## 1:1 생성 및 콘텐츠

- `prepare` 후 `intro` / `dynamics` / `action` 병렬 fan-out
- 병렬 segment 저장은 PostgreSQL `jsonb_set` 원자 업데이트 사용
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
- 공유는 Web Share API, 이미지 저장, 일반 public URL 등 플랫폼 중립 방식만 사용
- **P1 완료:** whitelist 공개 Share DTO, 이름 opt-in, 개인정보·유료 본문·내부 계산 상세 공개 금지
- **P2 완료:** raw 240개 검토 → 160개 Production 관계 카피, deterministic selector, curiosity mask
- **P3 완료:** 1:1·1:N Relationship Label / Two Sides / Send This 9:16 공유 카드, Web Share/이미지 저장/clipboard fallback
- **P4 완료:** 유료 결과와 분리된 opaque public token 기반 `/share/[token]`, 비로그인 제한 결과, 신규 궁합 CTA
- public share DB는 raw public token 대신 hash와 whitelist 공개 DTO만 저장
- 보관함 결과 영구 삭제 및 회원탈퇴 데이터 삭제 시 해당 결과의 public share도 제거
- **P5 완료:** Shared View 수신자 `꽤 맞음 / 반반 / 아닌데` 반응 UX와 반응 후 CTA
- **P5 완료:** `share_card_open`, `share_style_selected`, `share_image_download`, `share_native_open`, `share_link_copy`, `shared_view_open`, `shared_view_reaction`, `shared_view_cta_click`, `shared_view_new_report_start` 9-event 퍼널
- analytics 저장은 제한된 enum 필드만 허용하고 이름·생년월일시·구매 식별자·유료 본문을 저장하지 않음
- public share 연계 analytics는 raw token이 아닌 hash로 연결하고 public share 삭제 시 함께 정리
- analytics client/server 실패는 공유·Shared View·반응·CTA를 막지 않는 best-effort 경계
- **P6 완료:** 1:1·1:N `Receipt / Recap` 9:16 공유 카드 추가
- P6는 기존 P2 카피를 재사용하며 `Receipt → two_sides`, `Recap → relationship_label`로 매핑하고 P1 카드는 읽기 쉬운 clean tone을 사용
- P6 A/B는 결과 기반 deterministic seed로 `p6_receipt_first / p6_recap_first`를 안정 배정해 기본 카드와 탭 순서를 바꿈
- 기존 9개 event 이름은 유지하고 owner-side 공유 이벤트에 enum 제한 `sharePurpose`와 `experimentArm`만 추가
- analytics DB는 enum 제한 experiment arm 컬럼을 migration-safe하게 추가하며 public Shared View DTO와 개인정보 공개 범위는 확장하지 않음

## 최근 주요 검증

- Growth P4 main merge: `fda8f53d763cd157642d64201396a316733abcda`
- Growth P4 PR #37 Core Validation #605: 기존 전체 contracts + P4 contract + lint + production build PASS
- Growth P5 PR #38 Core Validation #609: 기존 전체 contracts + P5 analytics/reaction contract + lint + production build PASS
- Growth P6 검증 기준 code head: `2ba38f33d4709944f73345bd37041e8259719c4a`
- Growth P6 PR #39 Core Validation #613: 기존 전체 contracts + P6 experiment contract + lint + production build PASS

## 현재 제품 우선순위

1. blocker/hotfix 발생 시 즉시 처리
2. 최신 사용자 요청으로 지정된 제품 개선
3. UI/UX 추가 개선
4. AI 답변 스타일/사주소년 화자 품질 개선
5. 리포트 항목/정보구조 개선
6. Production 최신 배포 및 Growth 실사용 QA
7. 실결제 및 post-beta 운영 QA
8. 실제 데이터 기반 Growth 후속 실험

## 아직 미완료인 운영 QA

- 최신 Production이 최신 `main`을 반영했는지 확인
- public link 생성 → 비로그인 Shared View → 반응 → CTA 실제 동작 확인
- P5/P6 analytics row 생성, 9-event 퍼널 및 A/B arm 기록 확인
- Receipt / Recap 실제 이미지 저장·공유와 모바일 시각 QA
- 결과/계정 삭제 뒤 기존 Shared View 및 token 연계 analytics 정리 확인
- 새 1:1 실제 결제에서 생성시간·답변 품질·저장·재열람 확인
- 360 / 390 / 430px 실제 뷰포트 육안 확인
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

문체 취향, 재미, 일부 반복/분량 편차는 blocker로 취급하지 않는다.

## 운영 원칙

- GitHub 최신 `main`을 단일 진실 공급원으로 사용한다.
- 작업 시작 시 `AGENTS.md` → `docs/PROJECT_STATE.md` → `docs/NEXT_TASK.md` → `docs/DECISIONS.md` 순서로 읽는다.
- 사용자 요청이 `NEXT_TASK`보다 구체적이면 사용자 요청을 우선한다.
- 기존 완료 기능을 이유 없이 재작성하지 않는다.
- Vercel Hobby build rate limit은 코드 실패가 아니다.
- 의미 있는 작업 후 `PROJECT_STATE`, `NEXT_TASK/HANDOFF`를 갱신한다.
