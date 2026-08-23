# 우리사주 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. 작업 시작 시 반드시 읽고, 의미 있는 작업 완료 후 갱신한다.

## 기준선

- 공식 프로젝트명/서비스명: **우리사주**
- 기준 브랜치: `main`
- 기준 상태: Day 24 MVP 완료, 베타 전 제품 완성도 개선 및 운영 QA 단계
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 배포: Vercel Production, `main` 자동 배포
- 레거시 내부 식별자: GitHub 저장소 `beforebelly216-star/woorigunghap`, 기존 Vercel 도메인, DB의 `woorigunghap_*` 식별자는 호환성을 위해 당분간 유지한다.

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
- 완성된 보관함 결과 개별 영구 삭제. 상세 결과·입력정보·접근 토큰을 제거하고 법정 보존 최소 결제기록만 유지
- 궁합 공개 점수 v1.4: raw 가중합·9개 차원은 유지하고 사용자 종합점수만 45~100점 단조 스케일로 표시
- 45~54부터 95~100까지 공개 점수 구간 라벨/설명 제공
- 이용약관/개인정보/환불 정책, 회원탈퇴/데이터 삭제

## 1:1 생성 및 콘텐츠 개선 완료 상태

- `prepare` 후 `intro` / `dynamics` / `action` 병렬 fan-out
- 병렬 segment 저장은 PostgreSQL `jsonb_set` 원자 업데이트 사용
- 목표 분량 약 5,000~8,000자, 필요 시 약 10,000자
- 계산된 일주가 있는데 `일주 미확인`으로 버리던 data-shape 문제 수정
- AI INTRO를 서버 템플릿으로 덮어쓰지 않고 계산 근거를 검증/재시도 신호로 사용
- 40자 이상 동일 장문 중복, 일주/오행 근거 불일치, 근거 없는 숫자 사실을 critical quality issue로 관리
- CH0~CH9 전용 `keyTakeaways` 생성
- 내부 구현 표현(`서버 계산상`, `strongest`, `weakest`, `payload`, `evidence` 등) 사용자 노출 차단
- 일상 언어 결론/관계 장면을 먼저 쓰고 사주 용어·근거를 뒤에서 설명하도록 편집 순서 강화
- 유료 1:1 화자 `사주소년` 적용, 관계 유형별 미세 톤 분리
- CH2 `그 사람의 속마음`은 계산 기반 1인칭 가상 독백 장치로 구현
- 기존 계산 snapshot으로 6개 궁합 유형 결정론적 분류
- 60갑자 전체 일주 캐릭터 편집 레이어 적용
- 1:1 P5 파스텔 마스코트 UI/UX, 8글자 사주 타일, 9축 레이더, 모바일 UI 적용
- 9:16 공유 카드 및 Web Share/이미지 저장 구현. 생년월일시·유료 본문·접근 토큰은 공유하지 않음

## 1:N 개선 완료 상태

- 후보 상세의 `강점 1/2`, `조율 1/2`, `첫 번째 후보` 같은 순번형 본문 표현 제거
- 후보 이름 + 핵심 강점 기반 의미형 제목 적용
- 사용자 노출 언어를 연락·대화 / 편안함·신뢰 / 갈등 회복 / 생활·장기관계 중심으로 개선
- 계산 키/점수 공식과 기존 저장 리포트 호환성은 유지

## 2026-08-23 카카오 보내기/완료 알림 전면 제거

사용자 지시에 따라 결과 완료 메시지/알림 기능을 제품 범위에서 제거했다.

- Kakao Developers `talk_message` scope 요청 제거
- Kakao `나에게 보내기` 메시지 endpoint/전송 코드 제거
- 메시지 전송을 위한 Kakao access/refresh token 장기 저장 모듈 제거
- 카카오톡 채널/플러스친구 알림톡용 SOLAPI adapter 제거
- 휴대전화 번호 등록·동의·알림 설정/해제 API 및 보관함 UI 제거
- 결과 생성 완료 후 자동 메시지 발송 dispatcher/hook 제거
- SOLAPI 및 알림 암호화 관련 환경변수 예시 제거
- 알림 전용 계약 테스트와 운영 설정 문서 제거
- 개인정보처리방침에서 알림용 휴대전화 번호 및 SOLAPI 처리 내용 제거
- **Kakao 로그인 자체와 구매 결과 귀속, 보관함, 회원탈퇴 시 Kakao unlink는 유지한다.**
- 기존 Neon DB에 과거 알림 실험용 컬럼/테이블이 남아 있을 수 있으나 새 애플리케이션 코드는 이를 읽거나 쓰지 않는다. 물리적 schema 삭제는 별도 안전 migration 대상으로 둔다.

## 현재 제품 우선순위

1. blocker/hotfix 발생 시 즉시 처리
2. UI/UX 추가 개선
3. AI 답변 스타일/사주소년 화자 품질 개선
4. 리포트 항목/정보구조 개선
5. 그로스/프로모션·바이럴 UX
6. Production 최신 배포 확인
7. 1:1 실결제/생성/저장/보관함 재열람 QA
8. 1:N 실결제 및 기타 post-beta 운영 QA

## 그로스 방향

- `docs/PROMOTION_VIRAL_UX.md`를 상세 작업 지침으로 사용한다.
- 공유는 Web Share API, 이미지 저장, 일반 token URL 등 플랫폼 중립 방식을 사용한다.
- 카카오 전용 메시지/공유 API는 사용하지 않는다.
- Shared View는 전체 유료 리포트를 무료 공개하지 않는다.
- Growth P1 public share 계약 완료: 1:1·1:N 공통 공개 DTO를 화이트리스트 방식으로 정의하고 표시명은 opt-in일 때만 포함한다.
- public share DTO에는 결제/결과 접근 토큰, paymentId, 생년월일시·원본 입력, 유료 narrative, rawTotal·내부 dimensions를 포함하지 않는다.
- 1:N 공개 비교 payload는 Shared View에서 사용할 핵심 후보 하이라이트를 최대 3개까지만 허용한다.
- Growth P2 raw copy review pool 작성 완료: 5개 관계유형 × 6개 패턴 × 8개 후보 = 240개를 `docs/GROWTH_SHARE_COPY_REVIEW_V1.md`에 REVIEW ONLY 상태로 저장했다.
- P2 raw 후보는 셀별 `clean 4 / tease 2 / curiosity 2`로 구성하며 Relationship Label / Two Sides / Send This 추천 용도를 함께 기록했다.
- Growth P2-3 선별 완료: `docs/GROWTH_SHARE_COPY_SELECTIONS_V1.md` 기준 raw 240개 중 **160개 채택 / 80개 제외**했다. 짝사랑 39개는 사용자가 직접 골랐고, 썸·연인·친구·직장동료는 사용자 지시에 따라 품질·중복·톤 균형 기준으로 일괄 선별했다.
- 최종 후보 분포는 짝사랑 39 / 썸 31 / 연인 30 / 친구 30 / 직장동료 30, tone은 clean 68 / tease 32 / curiosity 60이며 30개 관계×패턴 셀을 모두 유지한다.
- `curiosity`의 `████`는 고정 글자 수가 아니라 실제 숨길 핵심 답 구절 전체의 마스킹 자리표시자이며, 문맥 60~80% 공개 + 핵심 20~40% 마스킹을 기본으로 한다.
- **확정 160개는 아직 Production UI나 공유 DTO에 연결하지 않았다.** 다음 P2-4에서 코드 라이브러리와 deterministic pattern/tone 선택 계약으로 구현한다.

## 아직 미완료인 운영 QA

- 최신 Production이 최신 `main`을 반영했는지 확인
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
