# 우리궁합 프로젝트 상태

> GPT와 Claude가 공유하는 현재 상태 문서. 작업 시작 시 반드시 읽고, 의미 있는 작업 완료 후 갱신한다.

## 기준선

- 기준 브랜치: `main`
- 교대 작업 환경 도입 전 최신 기준 커밋: `3647bb0c545369259919d953eccad23a39713afb`
- 기준 상태: Day 24 MVP 완료, 베타 운영 전환
- 기술 스택: Next.js 16.3.0 / React 19.2.8 / TypeScript / Neon / PortOne V2 / Kakao OAuth / Anthropic narrative mode
- 배포: Vercel Production, `main` 자동 배포가 원칙
- 현재 배포 주의: 2026-08-19 기존 생성/보관함/Kakao hotfix 제품 코드는 Production에 반영됐으나, 이후 1:1 분량·지연 hotfix와 최신 Kakao 실제 전송 검증 hotfix는 Vercel Hobby build-rate-limit 해제 후 Production 재검증이 필요하다.

## 제품 상태

### 구현 완료

- 1:1 상품 1,000원
- 1:N 상품 3,000원, 기준자 1명 + 후보 2~5명
- 관계 유형: 짝사랑 / 썸 / 연인 / 친구 / 직장동료
- 서버 만세력 계산 및 검증
- 9개 궁합 지표 및 관계별 배점
- PortOne 결제 검증 및 웹훅 멱등 처리
- 결제 후 AI 리포트 생성 및 single-flight 중복 방지
- 1:1 CH0~CH9 장문 리포트
- 1:N 순위/비교 리포트
- Neon 서버 저장, 복구 링크, 계정 보관함
- 선택형 Kakao 로그인 및 결과 귀속
- 생성중 결과 보관함 표시 및 완료 알림 흐름
- 이용약관/개인정보/환불 정책, 회원탈퇴/데이터 삭제
- GitHub Actions 핵심 회귀 검증

### 최근 hotfix 구현 상태

2026-08-19 사용자 운영 QA에서 1:1 장시간 생성 정체, 보관함 이탈 후 영구 `생성중`, Kakao 완료 알림 활성화 상태 미표시, 완료 알림 UI 겹침이 확인되어 아래 코드를 수정했다.

- 1:1 결제 후 백그라운드 생성은 `prepare` 후 `intro` / `dynamics` / `action`을 병렬 fan-out한다. 기존처럼 세 장문 AI 호출 시간을 한 240초 payment-verification 함수 실행에 순차 누적하지 않는다.
- 병렬 세그먼트 저장 시 sibling 결과를 덮어쓰지 않도록 `report_json` 세그먼트 저장을 PostgreSQL `jsonb_set` 기반 원자 업데이트로 변경했다.
- 같은 브라우저의 결제 복구키가 남아 있는 `생성중` 보관함 항목은 결제 검증 API를 제한적으로 재호출해 끊긴 백그라운드 생성을 다시 기동한다. 서버의 기존 segment single-flight/idempotency를 유지한다.
- 모든 1:1 세그먼트가 완료된 뒤 백그라운드 handoff에서도 완료 알림을 재확인한다. 기존 action route의 조기 알림 시도가 완성 전이면 최종 fan-out 완료 시 다시 알림을 시도한다.
- Kakao 완료 알림 OAuth 복귀 시 토큰 저장 및 실제 `kakaoNotifyEnabled` 상태를 확인하고 성공/실패 상태를 화면에 표시한다.
- 보관함 Kakao 완료 알림 패널의 desktop/mobile spacing 및 활성 상태 UI를 추가했다.
- 관련 계약 테스트 `test:pending-library-notify`에 generation fan-out, atomic segment persistence, stalled recovery, Kakao activation state, notification panel 회귀 조건을 추가했다.

위 제품 코드가 포함된 Vercel 배포는 `a20b307` 기준으로 성공한 것을 확인했다. 다만 해당 Production에서 새 1:1 결제를 실행한 결과 `1/3개 해설 묶음 완료 · 421초 경과` 상태가 관찰되어 장시간 생성 문제는 완전히 종료되지 않았다.

추가 분석 결과 계산 로직이 아니라 AI 출력 계약 과대화가 주요 병목으로 확인됐다.

- 제품 결정은 1:1 전체 리포트 약 5,000~8,000자, 필요 시 약 10,000자까지 허용인데 실제 Anthropic 샘플 QA는 `13,000자 이상`을 강제하고 있었다.
- v7 세그먼트 내부 품질 목표도 intro 1,700 + dynamics 3,600 + action 3,600 = 최소 8,900 compact chars였고, 각 필드에 다수의 3~7문장 요구가 중첩되어 있었다.
- `DYNAMICS` / `ACTION` AI 요청은 한 번에 최대 약 205초까지 기다리며, 결과 화면의 전경 클라이언트는 transient timeout을 무기한 재시도한다. 따라서 421초/1개 완료는 장문 세그먼트가 긴 요청 또는 timeout 이후 재시도로 이어지는 패턴과 부합한다.
- latency hotfix `de693e3`에서 CH0~CH9 JSON 구조와 계산 근거는 유지하면서 segment 품질 목표를 intro 1,200 / dynamics 2,200 / action 2,200 수준으로 낮추고, 각 필드의 문장·배열 요구를 압축했다. 프롬프트 버전은 `paid-report-v7-editorial-v10-latency-balanced`다.
- 실제 Anthropic QA 분량 계약도 `5,000자 이상 / 10,000자 이하`로 제품 결정과 정렬했고, `test:pending-library-notify`에 13,000자 회귀 방지 조건을 추가했다.

### 2026-08-19 Kakao 완료 알림 재검증 hotfix

사용자 운영 QA에서 `완료 알림 받기`가 여전히 신뢰할 수 없음을 재확인했다. 기존 구현은 `talk_message` 동의가 저장됐는지만으로 활성화 상태를 판단해 실제 Kakao ‘나에게 보내기’가 실패해도 `알림 사용 중`으로 남을 수 있었다.

- 알림 연결 OAuth는 `scope=talk_message` 추가 동의 요청을 사용한다. 처음 권한을 거절했거나 추가 동의 화면을 취소한 경우 보관함으로 돌아와 `메시지 권한 다시 동의`를 표시한다.
- 토큰/동의 저장 뒤 실제 Kakao ‘나에게 보내기’ 시험 메시지를 발송한다. 이 시험 발송이 성공해야 새 연결을 `enabled`로 취급한다.
- Kakao가 메시지 scope 부족을 반환하면 `scope`, 앱 URL·암호화 저장 등 내부 설정 문제가 있으면 `setup`, 그 밖의 실제 발송 실패는 `send_failed`로 분리해 보관함에 원인을 표시한다.
- 완료 시점 실제 발송에서 토큰·설정·메시지 전송이 실패하면 `kakao_message_enabled=false`로 되돌려 잘못된 `알림 사용 중` 상태가 계속 남지 않게 했다.
- 이전 버전에서 이미 `알림 사용 중`으로 저장된 계정도 `연결 다시 확인`을 눌러 동일한 추가 동의 + 시험 발송 경로를 다시 실행할 수 있게 했다.
- 계약 테스트 `test:pending-library-notify`에 재동의, 시험 발송, 실패 시 비활성화, 기존 연결 재검증 UI 조건을 추가했다.

### 아직 운영 검증이 필요한 hotfix 항목

- latency hotfix가 Production에 반영된 뒤 새 1:1 테스트 결제에서 전체 생성시간이 실사용 가능한 수준으로 줄었는지 확인
- 결과 화면 이탈 → 보관함 복귀 후 `생성중`이 실제 `완료`로 전환되는지 확인
- Kakao `완료 알림 받기` 또는 `연결 다시 확인` → 실제 연결 시험 메시지가 수신되는지 확인
- 실제 결과 완료 시 Kakao ‘나에게 보내기’ 메시지 수신 확인
- Vercel Production의 `KAKAO_TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`, Kakao `talk_message` 앱 권한/동의 설정을 실제 런타임에서 확인
- 분량 축소 후에도 5분 이상 정체되면 다음 hotfix로 long-segment 205초 timeout/token floor 및 결과 화면 무기한 retry 정책을 조정

### 사용자 요청 후속 리포트 개선 — 아직 미완료

이번 Kakao hotfix와 분리해 다음 작업으로 남긴다. 아래 항목은 완료 처리하지 않는다.

- 공통: 일상 언어로 결론을 먼저 설명하고 뒤에 사주 용어와 계산 근거를 붙이는 서술 순서로 변경
- 1:1: 해시태그 잘림 수정, 계산된 일주가 있는데 `일주 미확인`이 나오는 문제 수정, `서버가 제공한`·`서버 계산상`·`strongest/weakest` 같은 내부 표현 제거, 안전한 계산 근거를 더 풍부하게 AI 서술에 제공
- 1:N: `첫 번째/두 번째/세 번째`, `강점 1/2/3` 같은 순번형 표현을 후보 이름/의미형 제목으로 교체하고 `운의 실현도`, `기본 호흡의 안정성` 같은 추상 표현을 일상적인 관계 언어로 교체

### 베타 이후 운영 QA

아래는 Day 24 미완료가 아니라 post-beta 백로그다.

- 360 / 390 / 430px 실기기 전체 화면 반복 검증
- 1:1 / 1:N 운영 테스트 결제 반복 E2E
- 비회원 결과 → Kakao 로그인 → 계정 귀속 → 보관함 재열람 반복 검증
- 결제 직후 `생성중` → `완료` 전환 반복 검증
- Kakao 완료 알림 실제 수신 검증
- 회원탈퇴 및 Kakao unlink 운영 검증
- Production runtime error, AI 사용량/원가 관찰
- 정식 판매용 공개 운영정보/환경값 최종 확인
- 실제 사용자 반응 기반 AI 문체·재미·분량 튜닝
- 월운 기반 월 단위 타이밍 등 후속 고도화

## 출시 blocker 정의

다음은 발견 즉시 최우선 처리한다.

1. 결제 성공 후 결과 유실
2. 동일 결제의 AI 중복 생성/비용 중복
3. 타 계정의 유료 결과 열람
4. 정책 동의 없는 결제
5. 개인정보·비밀값·내부 지표의 사용자 화면 또는 외부 AI 노출
6. 탈퇴 후 삭제 대상 데이터 잔존
7. 친구/직장동료 결과에 구조적으로 잘못된 연애·성적 프레임 혼입
8. JSON/API/저장 실패로 유료 결과 생성 불가

문체 취향, 단정 강도, 일부 반복, 분량 편차 등은 blocker가 아니다.

## 알려진 운영 리스크

- 최신 latency/Kakao 재검증 hotfix는 `main` 코드 반영 후에도 Vercel Hobby build-rate-limit 때문에 Production 반영이 지연될 수 있다. 이는 코드 빌드 실패와 구분한다.
- 기존 Production의 1:1 결과 화면은 transient/network timeout을 무기한 재시도하므로 장문 세그먼트가 실패할 때 대기 시간이 매우 길어질 수 있다. latency hotfix 배포 후에도 5분 이상 정체되면 이 retry/timeout 계층을 다음 수정 대상으로 삼는다.
- 이미 오래 정체된 과거 1:1 주문은 같은 브라우저에 결과 access token/order draft가 남아 있으면 보관함 복구가 가능하다. 다른 기기처럼 복구키가 없는 환경에서는 원본 access token을 서버에 평문 저장하지 않는 정책 때문에 자동 재기동 범위가 제한된다.
- Kakao 완료 알림은 Production에서 실제 시험 메시지와 완료 메시지를 모두 확인해야 종료할 수 있다. `talk_message` 추가 동의를 반복해도 scope 부족이 계속되면 Kakao Developers 앱의 메시지 권한/동의 항목 운영 설정을 확인해야 한다.

## 운영 원칙

- GitHub `main`을 단일 진실 공급원(Single Source of Truth)으로 사용한다.
- Google Drive의 콘텐츠/기획 문서는 참고 원본으로 취급하되, 코드 상태와 작업 순서는 GitHub 문서를 따른다.
- GPT와 Claude는 서로의 채팅 기록을 전제로 하지 않는다.
- 작업 시작 시 `AGENTS.md` → `docs/PROJECT_STATE.md` → `docs/NEXT_TASK.md` → `docs/DECISIONS.md` 순서로 읽는다.
- 기존 완료 기능을 이유 없이 재작성하지 않는다.
- 새 기능보다 운영 blocker/hotfix를 우선한다.
- Vercel Hobby build rate limit은 코드 실패가 아니다. 제한 때문에 정상 코드를 되돌리지 않는다.

## 상태 갱신 규칙

의미 있는 작업을 마친 모델은 이 문서에 다음만 반영한다.

- 새로 완료된 기능 또는 검증
- 새 blocker/hotfix
- 운영 상태의 중요한 변화
- 주요 아키텍처 변화

세부 작업 순서는 `NEXT_TASK.md`, 장기 결정은 `DECISIONS.md`에 기록한다.
