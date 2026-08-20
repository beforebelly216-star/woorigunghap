# 우리궁합 NEXT TASK

> GPT와 Claude가 공유하는 실행 큐. 위에서부터 처리하며, 한 모델이 한 번에 가능한 범위만 맡는다.

## 작업 선택 규칙

1. blocker
2. hotfix
3. post-beta 운영 QA
4. improvement
5. 최신 사용자 요청이 더 구체적이면 사용자 요청을 우선한다.
6. 관련 코드/테스트/상태 문서는 한 작업 배치로 묶고 원격 `main`은 작업 종료 시 한 번만 갱신한다.

## Blocker

- [ ] 현재 확인된 blocker 없음

## Hotfix

- [x] 1:1 장시간 생성 정체 / 보관함 영구 `생성중` / segment 저장 race 수정
- [x] 1:1 AI 분량 latency hotfix — 5,000~8,000자 목표
- [x] Kakao OAuth `나에게 보내기` 연결/저장 오류 진단 및 SQL nullable parameter hotfix

- [x] 결과 완료 알림을 카카오톡 채널 알림톡 구조로 전환
  - 사용자 실사용에서 OAuth `나에게 보내기`는 결과 완료 후 수신 신뢰성이 확보되지 않아 사용자 지시로 폐기 방향 결정.
  - 카카오 공식 용도에 맞춰 서비스 자동 정보성 알림은 카카오톡 채널 `알림톡` 사용.
  - SOLAPI REST adapter 추가: `src/lib/solapi-alimtalk.ts`.
  - 보관함에서 휴대전화 번호 직접 입력 + 명시적 동의 후 알림 활성화.
  - 번호는 AES-256-GCM 암호화 저장, 화면에는 마스킹만 반환.
  - 알림 해제 시 번호/동의 상태 삭제.
  - 완료 시 `woorigunghap_channel_notifications`로 payment 단위 중복 발송 방지.
  - SMS 대체발송 비활성화.
  - 개인정보처리방침 및 `.env.example` 반영.
  - 운영 설정: `docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md`.
  - 코드/문서 묶음 커밋: `a01cf88d185f1c16610890876fb074f5e328e392`.

- [ ] **외부 설정: 카카오톡 채널 알림톡 실제 발송 활성화 — 현재 최우선**
  - 우리궁합 카카오톡 비즈니스 채널 준비.
  - SOLAPI 계정 생성/인증 및 채널 연동.
  - 정보성 알림톡 템플릿 등록/카카오 승인.
  - 권장 본문/버튼은 `docs/KAKAO_CHANNEL_ALIMTALK_SETUP.md` 참고.
  - Vercel Production 환경값 입력:
    - `SOLAPI_API_KEY`
    - `SOLAPI_API_SECRET`
    - `SOLAPI_KAKAO_PF_ID`
    - `SOLAPI_KAKAO_TEMPLATE_ID`
  - 저장 후 Production 재배포.
  - 사용자 실사용에서 보관함 번호 등록 → 새 리포트 완료 → 채널 알림톡 수신 확인.

- [ ] 사용자 QA 리포트 서술/표시 신뢰도 개선 — 외부 알림톡 설정 후 다음 개발 작업
  - 공통: **일상 언어 결론/관계 장면 → 사주 용어와 계산 근거** 순서.
  - 1:1 해시태그 모바일 잘림 수정.
  - 1:1 계산된 일주가 있는데 `일주 미확인`이 출력되는 data-shape 문제 수정.
  - `서버가 제공한`, `서버 계산상`, `strongest`, `weakest` 등 내부 표현 제거.
  - 개인정보 원문을 늘리지 않고 이미 계산된 일주/일간, 오행 균형, 합충·상호작용 등 근거를 AI payload에 더 제공.
  - 1:N `첫 번째/두 번째/세 번째`, `강점 1/2/3` 제거 → 후보 이름/의미형 제목.
  - 1:N `운의 실현도`, `기본 호흡의 안정성` 등 추상 표현 → 연락·갈등·신뢰·생활·장기관계 등 직관적 언어.

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
- [ ] 베타 전 프로모션/바이럴 UX backlog는 기존 blocker/hotfix가 해소된 뒤 단계적으로 수행
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
- Task: 결과 완료 알림을 Kakao OAuth 나에게 보내기에서 카카오톡 채널 알림톡(SOLAPI)으로 전환
- Status: partial
- Validation: Kakao 공식 문서에서 자동 정보성 알림=알림톡 확인; SOLAPI v4 HMAC/ATA 계약 반영; 계약 테스트 코드 갱신; connector 환경이라 lint/build 직접 실행 불가
- Commit: a01cf88d185f1c16610890876fb074f5e328e392 (channel notification code/test/docs bundle); following handoff commit is main tip
- Remaining: SOLAPI 채널/템플릿 준비 + Vercel 4개 env 설정 + 재배포 → 실제 알림톡 수신 확인 → 리포트 서술/표시 신뢰도 개선
- Risk: 알림톡은 공식 딜러사 계정/채널 연동/템플릿 승인/수신 전화번호가 필수이므로 외부 설정 전에는 실제 발송 불가
```
