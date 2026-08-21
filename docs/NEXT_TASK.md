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

- [x] **브랜드 변경: 우리궁합 → 우리사주**
  - 공식 프로젝트명/서비스명은 `우리사주`로 확정.
  - 헤더, SEO/metadata, 결제 상품명, 이용약관, 개인정보처리방침, 환불 안내, 카카오 채널 운영 문구, 공용 상태 문서 변경.
  - 새 사용자 노출 카피에서 `우리궁합` 사용 금지.
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
  - 공통: **일상 언어 결론/관계 장면 → 사주 용어와 계산 근거** 순서.
  - 1:1 해시태그 모바일 잘림 수정.
  - 1:1 계산된 일주가 있는데 `일주 미확인`이 출력되는 data-shape 문제 수정.
  - `서버가 제공한`, `서버 계산상`, `strongest`, `weakest` 등 내부 표현 제거.
  - 개인정보 원문을 늘리지 않고 이미 계산된 일주/일간, 오행 균형, 합충·상호작용 등 근거를 AI payload에 더 제공.
  - 1:N 순번형 설명을 후보 이름/의미형 제목으로 변경.
  - 1:N 추상 표현을 연락·갈등·신뢰·생활·장기관계 등 직관적 언어로 변경.

## 사용자 실사용으로 확인할 항목

- [ ] 새 1:1 실제 사용에서 생성시간 확인.
  - 5분 이상 반복 정체 시 `report-engine-v6-request.ts` long-segment timeout/token floor 및 `result-v2.tsx` 무기한 transient retry 조정.

## Post-beta 운영 QA

- [ ] 360 / 390 / 430px 모바일 핵심 플로우 확인
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
- Task: 프로젝트명/서비스명 전면 변경 — 우리궁합 → 우리사주
- Status: partial
- Validation: 최신 main/docs 확인; 사용자 노출 브랜드·정책·결제명·알림톡 문구 및 공용 상태문서 변경; connector 환경이라 lint/build 직접 실행 불가
- Commit: 작업 branch에서 변경 누적 후 main tip에 묶어서 반영 예정
- Remaining: 변경 diff 확인 → main 한 번 갱신 → Vercel 배포 상태 확인 → 외부 우리사주 카카오톡 채널/SOLAPI 설정
- Risk: repo/Vercel URL/DB prefix `woorigunghap`은 기존 데이터·배포 호환을 위해 레거시 내부 식별자로 유지
```
