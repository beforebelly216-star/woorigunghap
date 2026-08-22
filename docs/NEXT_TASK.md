# 우리사주 NEXT TASK

> GPT와 Claude가 공유하는 실행 큐. 위에서부터 처리하며 한 모델이 한 번에 가능한 범위만 맡는다.

## 작업 선택 규칙

1. blocker
2. hotfix
3. post-beta 운영 QA
4. improvement
5. 최신 사용자 요청이 더 구체적이면 사용자 요청을 우선한다.
6. 관련 코드/테스트/상태 문서는 한 작업 배치로 묶고 원격 `main`은 작업 종료 시 한 번만 갱신한다.

## Blocker

- [ ] 현재 확인된 blocker 없음

## Hotfix / 현재 우선순위

- [x] 1:1 장시간 생성 정체 / 보관함 영구 `생성중` / segment 저장 race 수정
- [x] 1:1 AI 분량 latency hotfix — 5,000~8,000자 목표
- [x] Kakao OAuth `나에게 보내기` 연결/저장 오류 진단 및 SQL nullable parameter hotfix
- [x] 결과 완료 알림을 카카오톡 채널 알림톡 구조로 전환
  - SOLAPI REST adapter
  - 휴대전화 번호 암호화 저장/해제
  - payment 단위 중복발송 방지
  - SMS 대체발송 비활성화
  - 개인정보처리방침 반영
  - 운영 문서: `docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md`

- [x] **브랜드 변경: 우리사주**
  - 공식 프로젝트명/서비스명은 `우리사주`로 확정.
  - 헤더, SEO/metadata, 결제 상품명, 이용약관, 개인정보처리방침, 환불 안내, 카카오 채널 운영 문구, AI 프롬프트, 공용 상태/명세 문서 변경.
  - 새 사용자 노출 카피에서 이전 브랜드명 사용 금지.
  - GitHub 저장소명, 기존 Vercel 도메인, `woorigunghap_*` DB 테이블·저장 버전 같은 레거시 기술 식별자는 기존 구매 데이터/배포 호환을 위해 별도 마이그레이션 전까지 유지.

- [ ] **외부 설정: 우리사주 카카오톡 채널 알림톡 실제 발송 활성화 — 현재 최우선 운영 작업**
  - 우리사주 카카오톡 비즈니스 채널 준비.
  - SOLAPI 계정 생성/인증 및 채널 연동.
  - 정보성 알림톡 템플릿 등록/카카오 승인.
  - 권장 본문/버튼은 `docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md` 참고.
  - Vercel Production 환경값 입력:
    - `SOLAPI_API_KEY`
    - `SOLAPI_API_SECRET`
    - `SOLAPI_KAKAO_PF_ID`
    - `SOLAPI_KAKAO_TEMPLATE_ID`
  - 저장 후 Production 재배포.

- [ ] 사용자 QA 리포트 서술/표시 신뢰도 개선
  - [x] hotfix: 기존 저장본 `일주 미확인` 표시 교정 + 신규 INTRO 재발 차단. 기존 결과는 AI 재생성 없이 확정 facts로 표시만 보정.
  - [x] hotfix: P5 미적용 deep-report 블록(STEP/PROGRESS/STOP 등)과 홈 화면을 파스텔 마스코트 디자인으로 통일.
  - [x] P1: 계산된 일주가 있는데 `일주 미확인`이 출력되는 data-shape 문제 수정.
  - [x] P2: AI INTRO 원문을 서버 템플릿으로 덮어쓰는 동작 제거; 계산 근거는 검증/재시도에 사용.
  - [x] P2: 40자 이상 동일 장문 중복을 critical quality issue로 승격하고 재시도 근거에 포함.
  - [x] P2: CH0~CH9 전용 `keyTakeaways`를 추가해 본문 재사용형 챕터 요약 제거.
  - [x] P2: 따옴표 안 대사의 `나/내가/너` 이름 오치환 방지.
  - [x] P3: 공통 **일상 언어 결론/관계 장면 → 사주 용어와 계산 근거** 편집 순서 강화.
  - [x] P3: 1:1 해시태그 모바일 잘림 수정.
  - [x] P3: `서버가 제공한`, `strongest`, `weakest` 등 남은 내부 표현 제거. `서버 계산상` 포함 출력 검증 강화.
  - [x] P3: 개인정보 원문을 늘리지 않고 이미 계산된 일주/일간, 오행 균형, 합충·상호작용 등 근거를 AI payload에 더 제공.
  - [x] P4-1 hotfix: 유료 1:1 화자를 '사주소년'으로 교정. 마법학교 소년 탐험가의 신비감/호기심을 쓰되 특정 작품 요소는 직접 모사하지 않고 관계 유형별 미세 톤을 유지.
  - [x] P4-1: CH2 상단 '그 사람의 속마음' 히어로 추가. 실제 내면 단정이 아닌 계산 기반 1인칭 가상 독백으로 제한하고 기존 저장 리포트 호환 유지.
  - [x] P4-2: 기존 계산 snapshot으로 6개 궁합 유형을 결정론적으로 분류하고 9:16 공유 카드 + Web Share/복사 fallback 구현. 유료 결과 URL/accessToken은 공유하지 않음.
  - [x] P4-3: 60갑자 전체 캐릭터 체계 + 결과 UI + AI 보조 편집 payload 연결. 캐릭터는 계산값을 덮어쓰지 않는 보조 렌즈로 제한.
  - [x] P5: 1:1 리포트 파스텔 마스코트 UI/UX 개편. 디자인 토큰·타이포·8글자 사주 타일·9축 레이더·사주소년 챕터 말풍선·모바일 전환 CTA·9:16 이미지 공유를 적용.
  - [x] 후속: 1:N 순번형 설명을 후보 이름/의미형 제목으로 변경. 후보 상세은 이름 + 계산 강점 기반 제목, 강점/조율 라벨은 실제 차원명 사용.
  - [x] 후속: 1:N 추상 표현을 연락·갈등·신뢰·생활·장기관계 중심의 직관적 언어로 변경. 계산 키/점수는 유지하고 사용자 라벨·기본 카피·AI 프롬프트만 개선.

## 사용자 실사용으로 확인할 항목

- [ ] 새 1:1 실제 사용에서 생성시간 확인.
  - 5분 이상 반복 정체 시 `report-engine-v6-request.ts` long-segment timeout/token floor 및 `result-v2.tsx` 무기한 transient retry 조정.

## Post-beta 운영 QA

- [ ] 360 / 390 / 430px 모바일 핵심 플로우 확인
  - [x] 코드/계약 QA: 360px 9:16 공유 카드 세로 fit, 결과 화면 horizontal overflow, 읽기 진행 마커 양끝 잘림, iOS safe-area 고정 결제 CTA 여백 보강.
  - [ ] 최신 P5 배포본을 실제 360 / 390 / 430px 뷰포트에서 육안 확인. 현재 Vercel Hobby 일일 build rate limit으로 최신 Preview/Production 생성이 막혀 있음.
- [ ] 1:1 실제 결제 반복 사용
- [ ] 1:N 실제 결제 반복 사용
- [ ] 비회원 결과 → Kakao 로그인 → 귀속 → 보관함 재열람
- [ ] 회원탈퇴/데이터 삭제/Kakao unlink
- [ ] Production runtime error와 AI 비용 관찰
- [ ] 공개 운영정보/환경값 최종 확인

## Improvement backlog

- [ ] 실제 사용자 반응 기반 AI 문체·재미·분량 개선
- [ ] 1:N 콘텐츠/UI 세부 고도화
- [ ] 베타 전 프로모션/바이럴 UX backlog는 기존 blocker/hotfix 해소 후 단계적으로 수행
- [ ] 월운 기반 월 단위 타이밍 등 후속 기능

## 기본 검증

가능한 환경에서는 변경 후 최소:

```bash
npm run lint
npm run build
```

관련 계약 테스트가 있으면 함께 실행한다. connector 세션에서 실행할 수 없으면 HANDOFF에 명시한다.

## Current HANDOFF

```text
HANDOFF
- Worker: GPT
- Task: 기존 저장본 일주 표시 오류 + P5 누락 UI + 홈 화면 hotfix
- Status: complete
- Validation: test:intro:day-pillar + test:report:p5-ui + Core validation + lint + production build
- Commit: PR 검증 후 main squash merge SHA 기준
- Remaining: 사용자 1:1 실결제/새 생성 결과 확인; 360/390/430 실제 뷰포트 육안 QA; 외부 SOLAPI/Kakao 발송 설정
- Risk: 저장된 AI 원문/계산/점수는 수정하지 않고 화면 표시만 확정 facts로 정정; none otherwise
```
