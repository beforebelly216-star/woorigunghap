# 우리사주 베타 전 프로모션·바이럴 UX 작업지침

> 목적: GPT/Claude가 동일한 GitHub `main`을 기준으로 단계별 구현할 수 있는 실행 지침. 실제 우선순위는 `docs/NEXT_TASK.md`를 따른다.

## 1. 목표

`결과 확인 → 공유 → 상대 반응 → Shared View → 신규 궁합 시작`

1:1과 1:N은 공통 Share System을 사용하고 데이터 표현만 다르게 렌더링한다.

## 2. 공통 원칙

- 공유의 주인공은 브랜드가 아니라 사용자의 관계 결과다.
- 사용자가 자연스럽게 “이거 너 봐”라고 보내고 싶게 만든다.
- 계산은 기존 서버 결정론 로직이 권위 데이터이며 AI는 계산 결과를 바꾸지 않는다.
- 이름/생년월일시 등 원본 개인정보를 새로 외부 AI에 전달하지 않는다.
- 공유 때문에 유료 AI 재생성 또는 중복 비용이 발생하면 안 된다.
- Shared View는 전체 유료 리포트를 무료 공개하지 않는다.
- **Kakao Developers 메시지/공유 API, 카카오톡 채널/알림톡, SOLAPI 등 카카오 전용 전송 API는 사용하지 않는다.**
- 공유 수단은 Web Share API, 이미지 저장, 클립보드/일반 URL 등 플랫폼 중립 방식으로 구성한다.

## 3. 공유 카드 제품 구조

### P0 카드

1. `Relationship Label`: 관계를 한 문장으로 캐릭터화
2. `Two Sides`: 잘 맞는 지점 1개 + 조율 지점 1개
3. `Send This`: 상대에게 보내기 좋은 짧은 카드

### P1 카드

4. `Receipt`: 관계 영수증 형태 핵심 지표 요약
5. `Recap`: 전체 관계 결과 한 장 요약

### 출력

- Instagram Story 우선 규격 9:16, 1080×1920
- 모바일 OS 공유 시트와 이미지 저장을 우선
- 카드 하나에 메시지 하나를 우선하고 정보 과밀을 피한다.

## 4. 1:1 / 1:N 공통화

### 1:1

- 대표 관계 한 줄
- 총점
- 가장 강한 관계 포인트
- 조율 포인트

### 1:N

- 단순 1등/꼴찌만 노출하지 않는다.
- 가장 편한 사람 / 말이 잘 통하는 사람 / 의외로 잘 맞는 사람 / 나와 가장 다른 사람 등 역할형 타이틀을 사용한다.
- “최악”, “꼴찌”, “손절” 등을 기본 카드에 사용하지 않는다.

## 5. Relationship Copy 시스템

톤은 `clean` / `tease` / `curiosity` 세 가지를 기본으로 한다. 기본 문법은 `관찰 + 작은 반전`이다.

피할 표현: 전생에 나라를 구한, 환상의 콤비/찰떡궁합, 실화냐/팩폭/소름/대박, 상대방의 숨겨진 속마음, 운명의 상대/악연.

## 6. 관계 유형별 해석 레이어

- 짝사랑: 가능성 / 거리 / 타이밍
- 썸: 긴장감 / 속도 / 확신
- 연인: 안정 / 반복 갈등 / 지속성
- 친구: 편안함 / 재미 / 거리감
- 직장동료: 협업 / 속도 / 역할 / 피드백

## 7. 카피 생산 매트릭스

패턴 6종: 안정형 / 티키타카형 / 반전형 / 거리조절형 / 노력형 / 극과극형.

`5개 관계 유형 × 6개 패턴 = 30개 셀`

각 셀에서 clean 4개, tease 2개, curiosity 2개 이상을 만들어 raw 약 240개를 확보하고 120~160개 프로덕션 후보로 선별한다.

평가 기준: 실제 공유 가능성, 자연스러움, 관계 유형 특이성, 계산 반영도, 호기심, 오글거림 위험.

## 8. Shared View

공유 링크 진입자는 전체 결과 페이지가 아니라 별도 Shared View를 본다.

1. “OO랑 당신은 이런 조합이래요.”
2. 대표 관계 한 줄
3. 제한된 핵심 결과
4. 반응: 꽤 맞음 / 반반 / 아닌데
5. 반응 후 신규 궁합 CTA

비로그인 상태에서도 안전하게 열리되 전체 유료 리포트나 원본 입력정보를 노출하지 않는다.

## 9. Analytics 최소 이벤트

- `share_card_open`
- `share_style_selected`
- `share_image_download`
- `share_native_open`
- `share_link_copy`
- `shared_view_open`
- `shared_view_reaction`
- `shared_view_cta_click`
- `shared_view_new_report_start`

핵심 지표: Share Rate, 공유 1건당 Shared View 유입, Shared View → 신규 궁합 시작 전환율.

## 10. 개인정보 / 유료콘텐츠 원칙

- 공유 카드에 생년월일시를 표시하지 않는다.
- 원본 사주 입력값을 공유 URL에 포함하지 않는다.
- 이름은 결과 표시명 수준만 사용한다.
- Shared View에서 전체 유료 리포트를 공개하지 않는다.
- 공유 URL은 추측하기 어려운 token 기반 구조를 우선한다.
- 기존 소유권/결제 검증을 우회하지 않는다.

## 11. 단계별 실행 계획

### Phase P1 — 정보구조/계약 확정
- Share 전용 DTO, 1:1/1:N 공통/분기 필드, Shared View 공개 범위, privacy/payment ownership 경계 확정
- 검증: 관련 계약 테스트 + lint + build

### Phase P2 — 카피 라이브러리 구축
- 30셀 × 최소 8개 raw copy, 120~160개 후보 선별, `relationshipType × pattern × tone` 구조 정의
- 검증: 중복 검사 + 샘플 contract + lint + build

### Phase P3 — P0 공유 카드 UI
- Relationship Label / Two Sides / Send This / 9:16 이미지 렌더링·저장 / 모바일 진입점
- 검증: 360/390/430px + 이미지 저장 + lint + build

### Phase P4 — 일반 공유 URL + Shared View
- token/URL, Web Share API/클립보드 fallback, Shared View, 신규 궁합 CTA
- **카카오 전용 커스텀 메시지 API는 구현하지 않는다.**
- 검증: 비로그인/로그인 Shared View, 권한/토큰 회귀, lint + build

### Phase P5 — 반응 UX + Analytics
- 꽤 맞음 / 반반 / 아닌데, 반응 후 CTA, 최소 analytics 이벤트
- 이벤트 실패가 결과 열람을 막지 않도록 한다.

### Phase P6 — P1 카드 확장/실험
- Receipt / Recap / 카드·카피 A/B 테스트 기반

## 12. GPT / Claude 작업 규칙

각 단계 시작 전 최신 `main`을 확인하고 `AGENTS.md` → `PROJECT_STATE.md` → `NEXT_TASK.md` → `DECISIONS.md` → 이 문서 순서로 읽는다.

운영 blocker/hotfix가 있으면 본 프로모션 작업보다 우선한다. 한 번의 작업에서는 한 Phase 또는 더 작은 단위만 수행하며 unrelated refactor를 하지 않는다. 완료 후 `PROJECT_STATE`, `NEXT_TASK`, `Current HANDOFF`를 실제 상태에 맞게 갱신한다.
