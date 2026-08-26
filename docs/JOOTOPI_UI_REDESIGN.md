# 주토피 UI/UX 전면 재설계 — Design Direction v3

> 2026-08-26 사용자와 단계별 합의한 새 UI 방향. 기존 배포된 stock-theme UI가 만족스럽지 않아 전체 레이아웃을 다시 설계한다. 구현 전에 이 문서를 기준으로 세부 디자인을 확정한다.

## 전체 작업 단계

1. **Design Direction / Reference 확정**
   - 1A Brand Mood
   - 1B Layout Grammar
   - 1C Jootopi Character Rules
   - 1D Reference Board
2. **홈 화면만 전면 재설계**
   - Header / Hero / 무료 사주 진입 / 궁합 상품 진입 / 신뢰·설명 / CTA
   - 모바일 390px 우선
   - 홈 디자인 승인 전 다른 핵심 화면으로 확장하지 않는다.
3. **입력 UX 재설계**
   - `/free`, 1:1, 1:N
   - 생년월일/시간/관계 선택/상대 추가
4. **결제·생성 UX 재설계**
   - 상품 요약 / 결제 CTA / 생성 대기 / 이탈 후 복귀 / 실패·재시도
   - 서버 계산·결제·저장 로직은 유지하고 presentation layer 중심 수정

후속: 1:1 결과 → 1:N 결과 → 보관함/공유/계정 → multi-viewport QA.

---

## 1A Brand Mood — 확정 사항

### 1A-1 전체 방향
- **캐릭터 × 핀테크**.
- 주토피가 전체 디자인 인상의 중심이다.
- 귀여운 운세앱이나 HTS 복제품이 아니라, 정돈된 소비자용 분석 제품 위에 주토피의 캐릭터성과 금융 시각 언어를 결합한다.

### 1A-2 Color / Temperature
- **B 80% + C 20%**.
- 기본은 white / warm off-white.
- Jootopi Yellow는 브랜드 포인트.
- Ink/Black은 주요 텍스트와 primary CTA.
- 강한 Black × Yellow contrast는 결과 공개, 결제 완료, 공유 등 중요한 순간에 제한적으로 사용.

### 1A-3 Shape Language
- **Balanced**.
- 캐릭터는 둥글고 귀엽게, UI는 정돈되게.
- 큰 컨테이너 16~20px, 작은 데이터 영역 12~16px, 버튼 12~14px, 입력 10~12px 수준을 출발점으로 삼는다.
- pill은 chip 등에 제한하고 shadow는 최소화한다.
- 카드 반복보다 여백·divider·타이포 위계를 우선한다.

### 1A-4 Typography / Information Style 방향
- **Hybrid**.
- 숫자와 데이터는 핀테크처럼 명확하게, 해석은 콘텐츠 서비스처럼 편하게 읽힌다.
- 기본 정보 순서: `핵심 숫자 → 의미 → 필요한 데이터 → 주토피 해석`.
- 주식 은유는 제품 전체의 문장 구조가 아니라 제한적인 시각 언어로 사용한다.
- 세부 font scale은 아직 미확정.

### 1A-5 Character Presence
- **Moment-based 50% + Host 50%**.
- 장식 마스코트보다 사용자 여정을 함께 진행하는 호스트에 가깝다.
- 모든 카드마다 캐릭터를 붙이지 않는다.

### 1A-6 Voice / Personality
- 주토피 사용자 대사는 **무조건 반말**.
- 성격 비중: **귀여움 50 / 영리함 35 / 장난기 15**.
- 긍정적이고 호기심 많으며, 발견한 것을 신나게 알려주는 영리한 친구.
- 사용자를 평가하기보다 같이 보고 해석한다.
- **주식 밈 과다사용 금지**. 상한가/풀매수/손절/수급 같은 표현을 반복적으로 쓰지 않는다.
- 주식 요소는 말투보다 차트, 상승 화살표, 캔들, 태블릿, 데이터 표현, 의상/소품 등 시각 세계관에 둔다.
- 주식 드립은 정말 자연스러운 순간에 희소하게만 허용한다.

### 1A-7 Character Placement
- **Hero 20 / Companion 50 / Micro 30**.
- Hero: 홈, 결과 공개, 결제/공유 완료 등 중요한 장면.
- Companion: 무료/유료 결과 해설, 1:N 비교 등 주토피가 설명하는 장면.
- Micro: 입력 보조, TIP, 리스트 상태 등.

### 1A-8 Dialogue UX
- **Talk 20 / Commentary 65 / Scene 15**.
- Talk: 1~2문장 진행 대사.
- Commentary: 주토피의 핵심 역할. 보통 3~5문장으로 실제 관계 의미를 풀어준다.
- Scene: 결과 공개/생성/완료처럼 캐릭터와 큰 타이포가 화면을 장악하는 순간.
- 모든 대사를 말풍선에 넣지 않는다. 긴 Commentary는 일반 본문 레이아웃으로 처리한다.
- **UI가 객관 사실·점수·사주 근거를 보여주고, 주토피가 관계에서의 의미를 해석한다.**

---

## Jootopi Identity Lock

사용자가 제공한 원본 캐릭터 시트를 **Character Source of Truth**로 사용한다.

### 변경 금지
- 얼굴 윤곽 및 얼굴/몸 비율
- 귀 길이·형태·위치
- 눈 형태·크기·위치
- 둥근 안경의 형태와 상대 크기
- 코/입 구성
- 볼/홍조 표현
- 손발 비율
- 기본 털 색감과 일러스트 선 특성

### 변경 가능
- 후드/티셔츠 색과 그래픽
- 포즈와 손동작
- 기존 구조 안에서의 표정
- 소품
- 차트/화살표/효과
- 작은 상황별 액세서리

### Production 규칙
- 기존 승인 포즈는 생성형 AI로 다시 그리지 않고 승인된 static asset을 사용한다.
- 신규 포즈는 원본 캐릭터 시트와 Identity Lock 기준으로 검수 후 공식 asset library에 편입한다.
- 원본 캐릭터 시트에서 분리한 13개 v1.1 asset이 가장 높은 신뢰도의 공식 자산이다.
- 신규 7포즈 extension(설명/가리키기, 환영/손흔들기, 완료/엄지척, 걱정/조심, 호기심/둘러보기, 축하/기쁨, 기다림/대기)은 생성 확장본이므로 Production 편입 전 원본 대비 최종 검수가 필요하다.

---

## 1A 남은 결정

1. 세부 Typography: font family, title/body/data 숫자 scale과 weight.
2. Iconography: 일반 아이콘과 브랜드 커스텀 아이콘의 경계.
3. Data visualization: 캔들/line/상승·하락/오행 데이터를 금융 UI로 표현하는 강도.
4. Motion: 캐릭터 등장, 숫자 공개, 차트 애니메이션의 범위.
5. 신규 7포즈 extension의 Production 적합성 검수.

1A 완료 후 **1B Layout Grammar → 1C Character Rules 최종 규격 → 1D Reference Board** 순서로 진행한다.

## 현재 원칙

- 현재 Production UI를 부분 보정하는 작업이 아니라 새 디자인 언어를 먼저 확정한다.
- 세부 CSS를 먼저 수정하지 않는다.
- 홈 화면을 첫 실제 구현 대상으로 삼고, 승인된 홈 디자인 언어를 나머지 화면으로 확장한다.
- 결제/사주 계산/AI 생성/저장/idempotency 등 기존 기능 로직은 UI 재설계 때문에 불필요하게 변경하지 않는다.
