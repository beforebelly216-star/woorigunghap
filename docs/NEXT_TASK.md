# 우리사주 NEXT TASK

> GPT와 Claude 공용 실행 큐. 최신 `main`과 최신 사용자 지시가 최우선이다.

## 완료 — 주토피 서비스 전면 개편 (2026-09-02)

- [x] 전 서비스 기능 카카오 로그인 필수화 및 서버 경계의 로그인 쿠키 선검사
- [x] 순백색 캔버스·한국어 시스템 글꼴·주토피 캐릭터 로고·절제된 상호작용 적용
- [x] `주토피의 오늘의 한마디` UI·365개 데이터·전용 테스트 삭제
- [x] 무료 천생연분 상세 구성 선노출, 추천 일간 항상 TOP 3, 카드별 성향 3문장 적용
- [x] 무료 결과 → 1:1 내 정보 자동 입력 및 짧은 토스트, 관계 유형 드롭다운 적용
- [x] 1:1 결제 약속 문구와 생성 대기 화면 개편, 가짜 진행률 제거
- [x] 1:1 결과를 큰 점수 중심 7개 직접형 제목으로 재구성하고 목차·장기 전망·매뉴얼·기계 해설 제거
- [x] AI 서술을 주토피 반말·뜻 우선 전문용어·부드러운 근거 설명으로 갱신
- [x] 1:1·1:N 공유 이미지와 Shared View에 이름을 항상 포함
- [x] 최신 커밋 Preview 배포 및 360/390/430px 실브라우저 QA — implementation `554ace8`, `dpl_9gaSGYsPYoR5tSF9uskYZ6F858zU` READY
- [x] 사용자 최종 승인 후 Production 배포 및 운영 스모크 — source `d7c9870`, `dpl_DJtPTz1bxy7Hg1TRX1Ucic8sV9jq` READY

## 우선순위
1. blocker
2. hotfix
3. 최신 사용자 명시 요청
4. post-beta 운영 QA
5. improvement

## 완료 — 전 화면 mobile app theme v4

- [x] 새 1:1 결과의 390px 보라–핑크 UI를 전 제품 공통 기준으로 확정
- [x] 홈·로그인·보관함·정책·결제·결제 상태·1:N 결과·Shared View 일괄 적용
- [x] 1:1/1:N 1080×1920 공유 이미지 팔레트 통일
- [x] 루트 레이아웃의 구버전 전역 CSS import 전면 제거
- [x] 1:N 후행 route CSS 우선순위 보정 및 rounded mobile card 강제
- [x] 관련 contracts + TypeScript + lint(0 errors, 기존 warnings 5) + production build PASS
- [x] 360/390/430px 홈·로그인·1:N 데모 실브라우저 QA — overflow/오류 overlay 없음
- [x] `main` 푸시 및 Preview 배포 — source `3b09c34`, trigger `69388ee`, Vercel SUCCESS, 자동배포 OFF `4208ec1`

## 완료 — 궁합 점수 v1.6

- [x] 공개 종합점수 **30~100**, 절대 최대 100
- [x] 관계유형별 별도 ceiling 삭제 / 5개 관계유형별 가중치 분리
- [x] 약한 결과 숨은 상향 보정 삭제
- [x] PR #67 → `main` (`ef66e7c1`), validation #791 PASS

## 최신 사용자 작업 — 1:1 결과 전면 재설계

### P1 레이아웃
- [x] 기존 CH0~CH9 직접 렌더 중심 UI 폐기
- [x] 새 390px layout v3: 한눈에 보기 → 두 사람 사주 → 끌림+시너지 → 관계 구조 → 관계 성향 → 갈등 루프 → 관계유형 심층 → 장기 전망 → 관계 사용설명서 → 주토피 마무리
- [x] 입력 별칭 사용, 360/390/430 responsive contract
- [x] PR #68 → `main` (`27d47ebe`), validation #799 PASS

### P2 콘텐츠 / Narrative
- [x] layout v3 전용 Sonnet 5 narrative v8 구현
- [x] 기존 `intro/dynamics/action` 저장·single-flight 계약 유지
- [x] 목표 본문 **약 5,000자, 허용 4,000~6,000자**
- [x] 세그먼트 목표: intro 1,050~1,400 / dynamics 1,450~1,900 / action 1,800~2,400
- [x] 실제 화면 사용 필드에 분량 집중, 저장 호환 보조 필드는 짧게 유지
- [x] 일상어 결론과 일간·일지·오행·천간/지지 상호작용 근거를 같은 문맥에 배치
- [x] 짝사랑/썸/연인/친구/직장동료별 심층 해석 규칙 유지
- [x] `나/상대방/A/B` 사용자 호칭 금지, 입력 별칭 서버 치환 유지
- [x] 내부 시스템 지침/점수 변경/근거 없는 수치·심리·미래 예측 금지
- [x] 기존 구매 결과 backward-compatible 표시 유지

### P2.5 생성 대기 UX
- [x] 주토피 `궁합 떡상 기원` 전면 일러스트 추가
- [x] 실제 생성 단계 문구 + animated progress visual
- [x] 가짜 정밀 퍼센트 대신 단계 기반 진행 경험
- [x] 390px 모바일 / reduced-motion 대응
- [x] PR #69 → `main` (`4803fa7a`), validation #809 PASS

### BLOCKER — 결제 확인 / 0-of-3 무한대기 전수조사

이전 PR #70~#73은 각각 일부 오류 경로를 막았으나 실기기 Preview에서 `0/3` 장기대기와 이후 `결제를 확인하고 있어요` 반복이 재현되어 **완전 해결 판정은 취소**한다.

- [x] 결제 → PortOne 조회 → Neon 주문 → 결과 prepare → AI segment → 저장 → 브라우저 retry 관련 코드 일괄 전수조사
- [x] `markServerOrderPaid()` 계열에서 실제 UPDATE 0건도 성공으로 취급될 수 있던 결함 확인
- [x] `/api/payments/verify`가 입력값을 사용하지 않은 채 PortOne 결제를 확인하던 경로 제거
- [x] 결제 검증은 `product + exact input`을 함께 검증하고, PortOne input binding 유지
- [x] PortOne에서 검증된 결제만 authoritative server order를 `UPDATE ... RETURNING`으로 paid 확정
- [x] 서버 주문 행이 유실된 경우에도 PortOne customData가 정확한 입력을 bind한 주문만 동일 paymentId/accessToken으로 복구
- [x] PortOne 조회 10초 / trusted server receipt 조회 6초 timeout 추가
- [x] webhook도 paid UPDATE 결과 1건을 확인하지 못하면 성공 ACK하지 않고 재시도 가능하게 변경
- [x] 1:1 API를 두 번 호출하던 `one-to-one-resilient` wrapper와 `beforeFiles` rewrite 전면 제거 — filesystem `/api/compatibility/one-to-one` 단일 권위 경로
- [x] 결제 redirect 무한 `while` polling 제거 — 최대 7회 + 요청당 12초 timeout
- [x] 서버 장애/저장 지연 시 재결제 CTA를 노출하지 않고 `같은 결제 다시 확인`만 제공
- [x] Day 8 / paid-result hotfix 계약을 새 bounded 정책으로 갱신
- [x] **PR #75 / Core calculation validation #832 PASS** — payment/narrative/1:N/account/Growth contracts + lint + production build PASS
- [x] PR #75 → `main` (`ab8a6006`)
- [x] 동일 `preview/one-to-one-v8` 재배포 — trigger `8a8f903f`, Vercel SUCCESS, 자동배포 OFF 복구 (`a5fba970`)
- [x] 첨부 실기기 오류 문구가 `PAYMENT_STORE_NOT_CONFIGURED`이며 해당 배포 런타임의 `DATABASE_URL` 부재를 뜻하는 것을 코드로 재확인
- [x] 1:1 서버 주문 저장 실패 시 브라우저 전용 주문으로 결제까지 진행하던 fallback 제거
- [x] PortOne 호출 전 서버 주문/access token/상품·금액/입력 hash/삭제·기결제 상태 preflight 추가
- [x] 이미 paid인 주문은 PortOne을 다시 열지 않고 기존 결과로 이동
- [x] 서버 설정 누락은 7회 자동 재시도하지 않고 즉시 같은 결제 수동 재확인 상태로 종료
- [x] 결제 preflight/verify 구조화 오류 로그 추가
- [x] local validation — paid-result/day8/runtime UI/server-store/1:N paid E2E/1:1 form contracts + lint + production build PASS
- [x] Preview `dpl_8NK4jXLFrVSV66vacaUzBHVSkKrD` READY 및 `DATABASE_URL`·PortOne·Anthropic 관련 환경변수 존재 확인(값 비노출). 비과금 합성 미존재 주문의 `payment-ready`는 HTTP 409 `PAYMENT_ORDER_NOT_READY`로 DB 미설정 오류가 아님
- [ ] 기존 실패 실결제 1,000원 건으로 `payment verify → prepare → intro → dynamics → action → 저장 → 재열람` 실동작 및 중복 생성·중복 비용 방지 확인

### BLOCKER — 결제 후 1:1 무한대기 재발 hotfix (2026-09-03)

- [x] 결과 클라이언트가 네트워크·5xx·플랫폼 timeout을 무제한 재시도하고, 알 수 없는 오류에서 전체 `run()`을 재귀 재시작하던 직접 원인 제거
- [x] 단계별 자동 복구를 최대 12회·총 7분으로 제한하고 각 요청을 285초에 중단; 소진 시 새 결제 없이 `같은 결제로 다시 시도` 제공
- [x] 서버의 paid 상태 갱신도 `UPDATE ... RETURNING` 정확히 1건을 확인하도록 강화
- [x] 미완성 1:1 보관함 카드를 다시 열 수 있게 만들고, 로그인 계정 소유권으로 저장된 구간부터 복구키 없이 생성 재개
- [x] 보관함의 1:1 무의미한 payment verify polling 제거, 결제 성공 안내를 실제 재개 동작과 일치시킴
- [x] payment/narrative/server-store/account/runtime/system/beta/AI hotfix contracts + TypeScript + lint + production build PASS
- [ ] Preview 배포 및 공개 로그인 경계·API 스모크
- [ ] 사용자 승인 범위의 Production 승격 및 안정 주소 스모크
- [ ] 기존 실패 실결제에서 남은 세그먼트 생성·저장·보관함 재열람 최종 확인

### P3 실화면 QA
- [ ] 실제 Sonnet 5 생성 1건에서 사용자 노출 본문 4,000~6,000자 확인
- [ ] 390px pixel-level 대조 및 360/430px overflow/spacing/장문 카드 QA
- [ ] 공유 카드·보관함 귀속 UI 실브라우저 확인

### BLOCKER — 1:1 action 2/3 형식 오류

- [x] Vercel Preview 런타임 로그에서 `ACTION_INVALID_JSON` / `ACTION_SCHEMA_MISMATCH` 422 재현 근거 확인
- [x] ACTION AI 스키마를 실제 화면 핵심 필드로 축소
- [x] `situationStrategy` / `actionPlan30` 서버 결정론 조립으로 저장·기존 UI 호환 유지
- [x] 안전한 JSON 스키마 mismatch 경로 로그 및 재시도 지시 추가
- [x] `AI_FORMAT` 같은 결제 자동 재시도 1회로 제한
- [x] 재실패 시 새로고침 없는 `같은 결제로 다시 시도` 버튼 추가
- [x] 관련 contracts + TypeScript + lint + production build PASS
- [x] Preview 배포 — source `8051e2f`, trigger `a875c09`, Vercel SUCCESS, 자동배포 OFF `07e3858`
- [ ] 기존 결제에서 action 저장 및 즉시 결과 전환 실확인

## Blocker / 운영 검증

- [ ] 기존 실패 실결제의 1:1 verify → 3-segment 생성 → 저장 → 재열람 Production 복구 및 중복 비용 방지 확인
- [ ] 신규 실제 1:1 결제 → 전체 생성 → 서버 저장 → 보관함 재열람 시간 측정
- [ ] AI/transport/dependency 실패 시 구조화 로그와 종료 UX 확인

## 기타 실기기 QA

- [ ] 천생연분 결과 Preview 390px pixel-level 보정
- [ ] 실제 1:1·1:N Web Share / 이미지 저장 / Shared View 링크
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함

## 완료 — 최신 Preview 기준 Production 배포

- [x] 최신 `main` 및 Preview source 상태 확인
- [x] Production one-time Git deploy trigger `d8186ab`
- [x] Vercel Production SUCCESS — deployment `E9hgx8qjpxdCBv9jAk4YXRYfZuGN`
- [x] Git 자동배포 OFF 복구 — commit `8051554`
- [x] 복구 상태 Core calculation validation #838 PASS

## 완료 — 주토피 원본 캐릭터 자산 교체

- [x] 사용자 승인 캐릭터 시트의 실제 픽셀 자산을 공통 캐릭터 원본으로 적용
- [x] 공통 `ZootopiMark`의 코드 생성 토끼 SVG 제거 및 승인 주토피 자산 적용
- [x] 생성 대기 `궁합 떡상 기원`을 승인 상승 포즈 자산으로 교체
- [x] 최신 `relationship-editorial-v4-direct-labels`에 뒤처진 Day 10/21 테스트 버전 기대값 정합화
- [x] PR #78 / Core calculation validation #850 — 전체 contracts + lint + production build PASS
- [x] Preview one-time deploy trigger `7cb538b` — Vercel SUCCESS (`Gjv1vd6wMAn74cvxFTPQFJH4es6s`), 자동배포 OFF 복구 `7d37dd8`
- [x] PR #78 → `main` (`9d04101`), Git 자동배포 OFF 유지

## 완료 — 1:1 결과 UI 정리

- [x] 1:1/1:N 공용 히트맵을 낮음=빨강, 중간=노랑, 높음=녹색의 주가형 5단계 팔레트로 교체
- [x] 1:1 결과에 혼입된 구형 `60일주 캐릭터` 카드와 관련 렌더 파일·스타일 제거
- [x] 원국 아래 `달빛 항구`, `정원의 설계자` 같은 시적 한줄평 렌더 제거
- [x] 1:1 공유 영역을 선택 탭 없는 `한 장 요약` 카드 하나로 고정하고 공유 CTA 개선
- [x] 관련 contracts + TypeScript + lint(0 errors, 기존 warnings 5) + production build PASS

## 완료 — 홈 최근 보관함 및 점수 근거 정리

- [x] 홈의 고정 TOP 3 샘플을 로그인 계정 보관함 최신 3개로 교체
- [x] 1:1 상대 이름 앞 3글자 프로필·이름·관계·점수 표시, 1:N은 `1:다`·관계·최고점만 표시
- [x] 홈 우측 상단 카카오 로그인/로그아웃 활성화
- [x] 1:1 핵심 점수별 계산 근거를 3문장 이내 접이식 토글로 제공
- [x] 1:1 관계 타이밍 지표와 대운·세운 3년 흐름 UI 전면 제거
- [x] `정보 수준 A/B` 제거, 출생시간 미입력 시 시주 제외 안내만 표시
- [x] source `fcdb9eb` + 관련 contracts + TypeScript + lint + production build PASS

## 완료 — 홈 미지원 섹션 정리 및 오늘의 한마디 365일화

- [x] 기능이 없는 하단 `이벤트` 메뉴 제거 및 홈·보관함·마이페이지 3열 재배치
- [x] 샘플 차트인 `관계 흐름 한눈에 보기` 섹션과 관련 렌더·스타일 제거
- [x] 기존 한 문구를 포함한 중복 없는 365개 `주토피의 오늘의 한마디` 구성
- [x] 서울 날짜 기준 일별 선택, 윤일은 2월 28일 문구 재사용
- [x] 홈 전용 contract + lint(0 errors, 기존 warnings 5) + production build + local 200 응답 PASS

## 완료 — 1:N 결과 순위 전용 화면 정리

- [x] `종합 결과 → 한눈에 보는 순위`와 후보별 순위·종합점수 카드만 유지
- [x] 총평·역할·공통 지표·상황별 추천·후보별 상세·9개 점수·마무리·공유·결과 하단 UI 제거
- [x] 결과 화면의 계정 귀속 패널 제거
- [x] 결정론 점수·순위, 결제, 저장, 복구, single-flight 로직 무변경
- [x] Day 15 UI/Day 16 paid E2E/runtime/share contracts + lint + production build + demo local 200 응답 PASS

## 완료 — 무료 1:N 인연 네트워크 전면 개편

- [x] 홈 카드 순서를 이상형 찾기 → 1:N → 1:1로 변경
- [x] 방장 자기정보 생성 → 링크 공유 → 참여자 자기정보 입력 흐름 구현
- [x] 최대 12명의 모든 쌍을 기존 결정론 엔진 친구·지인 기준으로 계산
- [x] SVG 인물 네트워크, 노드/관계선 선택, 총점·E~S 등급·순위·관계 축 구현
- [x] 4초 polling + ETag, 방장 관리, 참여자 자기삭제, 30일 만료·일일 정리 구현
- [x] 생년정보 암호화, 권한 token 분리·해시 저장, keyed HMAC rate limit/idempotency 적용
- [x] 신규 유료 1:N 주문 410 및 무료 화면 redirect, 기존 구매 결과·복구 호환 유지
- [x] 실제 엔진 S=91/E=43 fixture + 관련 회귀 테스트 + TypeScript + lint PASS
- [x] Production source `c8e642d` 배포·운영 승격 — `dpl_H8A6Fkkjq9MpfvMc2aK2QNLpDNcA`
- [x] 공개 운영 스모크 — 홈 200, 신규 유료 주문 410, 생성/참여 201, S=91/E=43, PII 비노출, ETag 304, 삭제 200

## 완료 — 타인 초대 링크 입력 양식 hotfix

- [x] 공용 입력 폼 CSS 범위 누락과 SVG hydration mismatch 수정
- [x] source `674e50cac4cf50188081a00b17b6b454f2af38b9`
- [x] Preview `dpl_8NK4jXLFrVSV66vacaUzBHVSkKrD` READY / Production `dpl_4rfsn8ZebWzEXpC5C2Zpyo2TxL17` READY
- [x] 초대 폼 360/390/430px, browser console error 0, 가명 테스트 네트워크 삭제 확인

## 완료 — 무료 1:N 연속 참여·방장 재열람 hotfix

- [x] 같은 브라우저에서 참여 완료 뒤 `다른 사람 연결하기`로 다음 사람 입력 재개
- [x] 한 브라우저의 여러 참여자 삭제 자격을 배열로 보존하고 기존 단일 자격 저장값 호환
- [x] 방장 생성 즉시 `내가 만든 네트워크` 목록 저장 및 `/one-to-many` 재열람 UI
- [x] 공개 참여 링크와 방장 전용 관리 링크 분리, 관리 링크로 다른 기기 권한 복구
- [x] 만료·중복 저장 목록 정리 및 네트워크 삭제 시 목록 제거
- [x] 1:N contract + Day 23 system QA + TypeScript + lint + production build PASS
- [x] Preview `dpl_9sMvDue51VZooy1tgQe3w7KA5ApQ` READY
- [x] Production `dpl_6seaA8Jo8CnWHGZEFgczeSJZCjfa` — 가명 방장 + 같은 브라우저 참여자 2명 + 3관계선 + 저장 목록 재열람 + 360/390/430px + console 0 + 전체 삭제·404 PASS

## 완료 — 무료 1:N 보관함 노출·출생시간 오류 해제 hotfix

- [x] 생성한 무료 인연 네트워크를 `/account/reports` 보관함에도 표시
- [x] 비로그인도 같은 브라우저의 생성 네트워크를 보관함에서 재열람
- [x] 공용 생년정보 입력 변경 시 해당 필드 오류와 폼 공통 오류만 즉시 제거
- [x] 1:N/account/input contracts + Day 23 system QA + TypeScript + lint + production build PASS
- [x] 실브라우저 `2460` 오류 → 입력 삭제 → 오류 제거·`aria-invalid=false`, console 0
- [x] Production 생성 → 페이지 이탈 → 보관함 → 다시 보기 → 테스트 방 삭제·404 스모크

## 완료 — 무료 1:N 결과·공유·카카오 보관함 개편

- [x] 인물 동그라미·관계선 선택 시 점수·등급·강점·조율 축 bottom sheet 및 1:1 정밀궁합 CTA
- [x] 1080×1920 익명 집계 스토리 카드, 1200×630 동적 OG, `내 인연 네트워크 만들기` 유입 CTA
- [x] 방장 권한 검증 후 공개 token만 암호화해 카카오 계정 보관함에 저장하고 다른 기기 공개 재열람 지원
- [x] 주토피 `smile / analyzing / idea / thinking / surprised` 고해상도 투명 PNG 표정 세트 적용
- [x] 약관·개인정보·회원탈퇴 범위 및 계정 귀속 충돌 방지 계약 갱신
- [x] source `14f06fe63c3cb577c2995f2832f27bc64f105787` + 관계 네트워크/Kakao auth/계정 보관함/운영정책 contracts + TypeScript + lint + production build PASS
- [x] Preview `dpl_HuBG9fm47KktSepULxuxNucfq65X` READY / Production `dpl_7JUwo12hN7DMikJbwTqZtxGav3Ro` READY 및 안정 주소 승격
- [x] 운영 3명·3관계선·타인 간 해설·스토리 집계·동적 OG·출생시간 오류 해제·임시 방 삭제 404 PASS

## 기본 검증

변경 후 관련 contract + `npm run lint` + `npm run build`.
Preview 배포는 사용자의 상시 승인을 따라 변경 검증 후 별도 재확인 없이 수행한다. Production 배포는 사용자 명시 승인 뒤 수행한다.
Git 자동배포는 OFF 유지.

## Current HANDOFF
```text
HANDOFF
- Worker/Task: Codex — 결제 후 1:1 무한대기 재발 hotfix
- Source: local validated, deployment pending
- Scope: 단계별 유한 재시도, 요청 timeout, paid UPDATE 확인, 미완성 보관함 결과의 계정 소유권 재개
- Validation: 관련 contracts 9종 + TypeScript + lint(0 errors, 0 warnings) + production build(34/34) PASS
- Deploy: Preview/Production pending
- Remaining: 기존 실패 실결제의 남은 세그먼트 생성·저장·재열람 실확인
- Risk: 운영 실결제 식별정보와 운영 DB 비밀값을 사용하지 않아 실데이터 완료 여부는 구매 계정에서 확인 필요
- Policy: Git 자동배포 OFF 유지
```
