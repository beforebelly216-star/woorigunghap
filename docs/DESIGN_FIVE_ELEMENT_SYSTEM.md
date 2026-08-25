# 우리사주 Design Foundation v2

> 2026-08-25 전면 재정의. 기존 `오행 밸런스 시스템 — 디자인 스펙 v1`을 대체한다.
> 이 문서는 UI/UX 전면 개편의 단일 디자인 기준점이다. GPT/Claude는 화면을 새로 만들거나 수정할 때 이 문서를 먼저 읽고, 여기 없는 미감을 임의로 추가하지 않는다.

## 0. 목적

우리사주의 화면을 단순한 사주/운세 웹사이트가 아니라 **현대적인 관계 분석 제품**으로 보이게 만든다.

핵심 목표는 네 가지다.

1. 사용자가 3초 안에 핵심 관계 정보를 이해한다.
2. 공백 제외 약 2,500~4,000자의 리포트를 정독하지 않아도 스캔만으로 구조가 파악된다.
3. 결과 화면 자체가 공유하고 싶은 데이터 스토리텔링이 된다.
4. GPT/Claude가 작업자를 바꿔도 같은 화면 언어를 유지한다.

## 1. 디자인 포지셔닝

우리사주는 다음 네 제품군의 장점을 조합하되 어떤 서비스도 그대로 복제하지 않는다.

- **Co–Star**: 절제된 에디토리얼 감각, 강한 타이포, 과도한 점술 장식 배제
- **The Pattern**: 관계 분석의 단계적 정보 구조, summary → detail → deeper 구조
- **Toss**: 모바일 우선 정보 위계, 큰 핵심 숫자와 짧은 설명, 명확한 CTA
- **Spotify Wrapped**: 개인 데이터를 한 장면씩 이야기로 만드는 방식, 공유 가능한 결과 장면

참고 원칙:

- 레퍼런스의 색/레이아웃을 그대로 복사하지 않는다.
- 하나의 화면에서 여러 서비스의 시각적 특징을 동시에 드러내지 않는다.
- 가져오는 것은 **구조와 원리**다.
- 우리사주의 고유 시그니처는 **오행 데이터 + 관계 데이터 + 에디토리얼 타이포**다.

## 2. 브랜드 성격

### 2.1 우리가 보여야 하는 인상

- 정확한 계산 결과를 가진 서비스
- 감정적으로 차갑지 않은 관계 분석
- 가볍게 공유할 수 있지만 싸 보이지 않는 제품
- 전통 명리 용어를 현대적인 언어로 번역하는 서비스

### 2.2 피해야 하는 인상

- 보라색 우주/별자리 앱
- 금색 테두리, 수정구슬, 부적, 전통 문양을 반복하는 운세 사이트
- 카드마다 그라디언트와 그림자가 다른 AI 생성형 랜딩 페이지
- 지나치게 귀엽고 아동적인 캐릭터 앱
- 핀테크 앱을 그대로 복제한 무채색 관리도구

## 3. 핵심 시각 문법

### 3.1 Neutral canvas + meaningful color

페이지 배경과 대부분의 surface는 중립색을 사용한다. 오행 5색은 장식이 아니라 **실제 계산값 또는 상태 정보가 존재할 때만** 나타난다.

### 3.2 Typography first

화면의 첫 시선은 그림이나 카드가 아니라 **한 문장 또는 숫자**에 간다.

예:

- `87`
- `상위 8%의 관계`
- `밀고 당기는 자석형`
- `이 사람은 대화보다 반응 속도에서 더 끌려요.`

### 3.3 One screen, one message

모바일 한 뷰포트에서 가장 중요한 메시지는 하나다.

한 화면 안에 점수, 긴 설명, 오행 차트, CTA, 배지, 아이콘을 모두 동급으로 배치하지 않는다.

### 3.4 Data becomes narrative

점수와 계산값을 단순 표로 끝내지 않는다.

`점수 → 의미 → 관계 장면 → 행동` 순으로 번역한다.

## 4. 컬러 시스템

### 4.1 Base tokens

```css
--saju-bg-base: #F7F7F4;
--saju-bg-card: #FFFFFF;
--saju-bg-soft: #EFEFEB;
--saju-bg-inverse: #222226;

--saju-ink: #222226;
--saju-ink-soft: #68686F;
--saju-ink-faint: #929298;
--saju-ink-inverse: #FFFFFF;

--saju-border: #E2E2DD;
--saju-border-strong: #CBCBC4;
--saju-track: #E9E9E4;
```

### 4.2 Five-element functional colors

```css
--saju-element-wood:  #4D8B5F;
--saju-element-fire:  #D55A4A;
--saju-element-earth: #C9973D;
--saju-element-metal: #858E9E;
--saju-element-water: #3E78A8;
```

사용 규칙:

- 오행 비중, 오행 태그, 실제 계산 데이터가 있을 때만 사용한다.
- CTA 버튼을 오행색으로 랜덤 지정하지 않는다.
- 관계 유형별 고정색으로 사용하지 않는다.
- 배경 전체를 오행색으로 칠하지 않는다.
- 5색을 한 카드에 장식 목적으로 나열하지 않는다.

### 4.3 Action color

브랜드 CTA는 별도의 여섯 번째 컬러를 만들지 않는다.

```css
--saju-action: #222226;
--saju-action-hover: #36363B;
--saju-action-disabled: #B9B9B4;
```

Primary CTA는 기본적으로 ink 기반이다. 중요한 행동이 여러 개여도 primary는 한 화면에 하나만 둔다.

### 4.4 Semantic colors

성공/경고/오류는 오행색과 분리한다.

```css
--saju-success: #2F7D4A;
--saju-warning: #9A6A12;
--saju-danger: #B74343;
--saju-info: #356F9C;
```

오류를 화(火), 성공을 목(木)처럼 의미를 섞지 않는다.

## 5. 타이포그래피

### 5.1 Font roles

- 본문/UI: `Pretendard Variable`
- 숫자/점수/백분위: `IBM Plex Mono`
- 데이터성 강한 헤드라인: `IBM Plex Sans KR` 사용 가능
- 명조체는 기본 UI에서 사용하지 않는다.

### 5.2 Type scale

```text
Display XL   48/52  700   핵심 점수, 숫자
Display L    36/42  700   결과 핵심 문장
Heading 1    28/36  700   화면 제목
Heading 2    22/30  700   섹션 제목
Heading 3    18/26  700   카드/하위 섹션 제목
Body L       17/28  400   핵심 설명
Body M       15/24  400   일반 본문
Body S       13/20  400   보조 설명
Label        12/16  600   칩/메타 정보
```

규칙:

- 모바일 본문은 15px 미만으로 내리지 않는다.
- 긴 본문 line-height는 최소 1.55 이상 유지한다.
- 중앙 정렬은 hero와 공유 카드에 제한한다.
- 장문 리포트는 기본 왼쪽 정렬이다.
- ALL CAPS 영문 라벨은 짧은 섹션 kicker에만 제한한다.

## 6. spacing system

4px 기반 스케일을 사용한다.

```text
4   micro
8   xs
12  sm
16  md
20  lg
24  xl
32  2xl
40  3xl
48  4xl
64  5xl
80  6xl
```

원칙:

- 화면 좌우 기본 padding: 20px
- 작은 모바일(360px): 18px까지 허용
- 섹션 간 기본 간격: 48~64px
- 카드 내부 padding: 20~24px
- 장문 문단 간격: 16px
- 동일 그룹 내 요소 간격: 8~16px

화면이 답답해 보이면 카드 수를 늘리지 말고 먼저 **여백을 늘린다**.

## 7. width / responsive system

우리사주는 모바일이 핵심이지만 PC에서 단순히 480px짜리 휴대폰 화면처럼 떠 보이면 안 된다.

### 7.1 Content widths

```text
compact flow:  480px max
report body:   640px max
wide compare:  960px max (1:N 비교 전용)
```

### 7.2 Breakpoints

```text
0–479      mobile
480–767    large mobile / compact tablet
768–1023   tablet
1024+      desktop
```

규칙:

- 입력/결제 flow는 desktop에서도 compact width를 유지할 수 있다.
- 1:1 긴 결과는 desktop에서 600~680px 가독성 폭을 허용한다.
- 1:N 비교는 desktop에서 넓은 화면을 활용한다.
- `모든 페이지를 무조건 480px 고정`을 디자인 원칙으로 사용하지 않는다.
- 모바일 UX를 우선하되 desktop은 여백, sticky TOC, side summary 등으로 확장할 수 있다.

## 8. radius / border / shadow

### Radius

```text
8px   small control
12px  input / compact item
16px  standard card
24px  feature card / modal
999px chip only
```

### Border

- 기본 카드: `1px solid var(--saju-border)`
- 중요 카드: border-strong 사용 가능
- 섹션 구분은 카드보다 divider/spacing을 우선한다.

### Shadow

기본적으로 그림자를 쓰지 않는다.

허용:

- floating action
- modal / bottom sheet
- sticky CTA가 콘텐츠와 겹칠 때

금지:

- 모든 카드에 동일한 큰 blur shadow
- 컬러 glow
- glassmorphism

## 9. 핵심 컴포넌트 문법

### 9.1 Page Hero

구성 순서:

1. 작은 context label
2. 가장 중요한 제목/숫자
3. 1~2문장 설명
4. primary CTA 또는 next action

hero에 카드 3개 이상 넣지 않는다.

### 9.2 Relationship Score

- 숫자가 시각적 중심
- 0~100 score는 IBM Plex Mono
- 백분위는 score 아래 secondary hierarchy
- ring은 필요한 경우에만 사용
- ring을 5색으로 나눌 때 실제 오행 비중 또는 명확한 데이터 의미가 있어야 한다.

### 9.3 Five Element Bar

- 5개 segment의 길이가 실제 비중을 반영
- 항상 `목 화 토 금 수` 라벨 또는 접근 가능한 대체 텍스트 제공
- 색만으로 의미를 구분하지 않는다.
- 최소 한 곳에서는 수치/텍스트와 함께 제공한다.

### 9.4 Insight Block

기본 구조:

```text
짧은 라벨
강한 한 문장
2~4문장 설명
선택적 근거/상세보기
```

Insight를 카드 안에 넣는 것은 선택이다. 장문 결과에서는 borderless section을 우선한다.

### 9.5 Two Sides

좌우 사람을 단순한 A/B 표로 만들지 않는다.

```text
나의 반응
큰 키워드 / 수치
짧은 설명

상대의 반응
큰 키워드 / 수치
짧은 설명
```

360px에서는 세로 stack을 기본으로 한다. 비교가 중요한 값만 2-column 허용한다.

### 9.6 Chapter

CH0~CH9의 서버/콘텐츠 구조는 유지하되 UI에서는 사용자가 숫자를 외울 필요가 없다.

- chapter number는 보조정보
- 실제 제목과 핵심 takeaway가 먼저
- 긴 chapter 시작마다 1개의 takeaway 또는 summary block 제공

### 9.7 CTA

Primary:

- 높이 최소 52px
- full width 허용
- 검은 ink background / 흰 text

Secondary:

- white/soft surface + border
- primary와 동일 시각 무게 금지

Tertiary:

- text action

한 viewport에 primary CTA가 2개 이상 경쟁하지 않는다.

## 10. 입력 UX

입력은 금융 서비스 수준으로 명확하고 빠르게 만든다.

원칙:

- 한 단계에는 하나의 결정만
- 사용자가 이미 입력한 정보는 다시 묻지 않는다.
- 생년월일/시간 입력은 모바일 numeric keyboard 최적화
- 오류는 제출 후 상단 summary만 띄우지 말고 해당 field 근처에서 즉시 설명
- `왜 이 정보를 받는지`는 필요한 지점에 한 줄만 제공
- 이전/다음 버튼은 동일 행 또는 안정적인 sticky footer로 제공
- disabled CTA만으로 사용자가 무엇을 해야 하는지 추측하게 만들지 않는다.

## 11. 결과 UX 정보 구조

1:1 결과 기본 순서:

```text
01 Hero — 점수 / 한 줄 관계 정의
02 Snapshot — 핵심 3~4개 지표
03 Relationship Label
04 Two Sides
05 강점
06 충돌 / 주의점
07 관계 흐름
08 행동 가이드
09 상세 리포트 CH0~CH9
10 Share / Save / Next relationship
```

원칙:

- 첫 2~3 viewport 안에서 결제 가치가 느껴져야 한다.
- 긴 AI 본문을 첫 화면부터 노출하지 않는다.
- section마다 반복되는 동일 카드 UI를 만들지 않는다.
- 사용자가 원하는 깊이까지만 내려갈 수 있도록 progressive disclosure를 쓴다.

## 12. 1:N 비교 UX

1:N은 1:1을 반복해서 세로로 붙이는 화면이 아니다.

핵심 순서:

```text
전체 ranking
→ 후보별 한 줄 역할
→ 공통 지표 비교
→ 후보별 강점/주의점
→ 내가 무엇을 중요하게 보느냐에 따른 해석
→ 상세 후보 리포트
```

desktop에서는 비교 표/행 구조를 적극 활용하고 mobile에서는 horizontal scroll 또는 candidate switcher를 허용한다.

## 13. 공유 UX

공유 카드는 별도 광고물이 아니라 결과 UI의 압축판이다.

공유 카드에 우선 들어가는 것:

- 두 사람 이름 또는 opt-in display name
- 관계 유형
- 전체 점수
- relationship label
- 짧은 한 문장
- 우리사주 브랜드

전체 유료 본문, 생년월일시, 전체 명식, access token은 포함하지 않는다.

9:16을 기본으로 하되 UI 본화면과 동일한 typography hierarchy를 유지한다.

## 14. 상태 UI

### Loading

- skeleton 또는 단계 진행 상태
- 의미 없는 spinner 장시간 단독 노출 금지
- 장시간 생성은 `현재 무엇을 하고 있는지`를 짧게 알려준다.

### Empty

- 빈 상태 이유
- 사용자가 할 수 있는 다음 행동 하나

### Error

- 오류 유형을 사용자 언어로 설명
- 재시도 가능한지 명확히 구분
- 결제/생성 오류에서 무한 로딩으로 숨기지 않는다.

### Success

- 성공 메시지를 modal 남용으로 처리하지 않는다.
- 다음 행동을 바로 제공한다.

## 15. motion

motion은 정보를 설명하기 위해서만 사용한다.

기본값:

```text
micro interaction 120–180ms
standard transition 180–240ms
large reveal 300–420ms
```

허용:

- score count/reveal
- element bar reveal
- accordion expand
- bottom sheet
- share card transition

금지:

- 모든 카드 scroll fade-in
- bounce CTA
- 계속 움직이는 background
- 읽는 동안 시선을 빼앗는 mascot animation

`prefers-reduced-motion`을 존중한다.

## 16. icon / illustration / mascot

- 기본 아이콘은 단일 stroke 체계로 통일
- emoji를 primary UI icon으로 사용하지 않는다.
- 장식 아이콘을 카드마다 붙이지 않는다.
- 사주소년은 화자/브랜드 장치로 유지할 수 있으나 모든 화면의 주인공이 아니다.
- 결과 핵심 장면에서는 데이터와 문장이 주인공이다.

## 17. accessibility

필수:

- WCAG AA 수준 대비를 목표
- body text 대비 4.5:1 이상
- focus-visible 명확히 제공
- touch target 최소 44×44px
- 색만으로 상태/오행 의미 전달 금지
- form label은 placeholder로 대체하지 않는다.
- keyboard 순서가 시각 순서와 일치
- animation에는 reduced-motion 대응

## 18. Content density rules

한 카드/블록에 다음을 모두 넣지 않는다.

- 제목
- 부제
- 배지 3개
- 그래프
- 장문 설명
- 버튼 2개

우선순위가 4개 이상이면 section을 분리한다.

긴 리포트는 `요약 → 본문 → 근거` 3단계 밀도를 사용한다.

## 19. AI 작업 규칙

GPT/Claude가 UI를 구현할 때 반드시 지킨다.

1. 새 색을 임의로 추가하지 않는다.
2. border radius를 화면마다 새로 만들지 않는다.
3. 기존 컴포넌트를 쓸 수 있으면 새 카드 variant를 만들지 않는다.
4. `예뻐 보이게` 하기 위해 gradient/glow/blur/shadow를 추가하지 않는다.
5. reference screenshot을 pixel-copy하지 않는다.
6. 기능 데이터가 없는 오행 시각화를 만들지 않는다.
7. 모바일 360/390/430px에서 먼저 검토한다.
8. desktop에서는 필요에 따라 가독성 폭을 확장한다.
9. CTA 우선순위가 명확하지 않으면 primary 하나만 남긴다.
10. 실제 렌더링을 보지 않고 완료 판정하지 않는다.

## 20. 화면별 적용 순서

1. Foundation token / shared shell
2. 홈
3. 무료 분석 입력/결과
4. 1:1 입력
5. 1:1 결제
6. 생성중
7. 1:1 결과
8. 1:N 입력/결제
9. 1:N 결과
10. 보관함/계정
11. Shared View / share card

화면 하나씩 완료하고 다음으로 이동한다.

## 21. 구현 전 체크

각 화면 작업자는 시작 전 다음을 답할 수 있어야 한다.

- 이 화면에서 사용자가 해야 할 가장 중요한 행동은 무엇인가?
- 첫 3초에 보여야 할 정보는 무엇인가?
- 가장 중요한 숫자/문장은 무엇인가?
- 없어도 되는 카드는 무엇인가?
- 오행 색은 실제 기능 데이터를 표현하는가?
- mobile 360px에서도 정보 위계가 유지되는가?

## 22. 검증 기준

코드 변경 후 최소:

```bash
npm run lint
npm run build
```

관련 contract test를 함께 실행한다.

화면 검증:

- 360px
- 390px
- 430px
- 768px
- desktop 1280px

육안 검증 항목:

- 첫 CTA 명확성
- 텍스트 wrapping
- 버튼 충돌
- 긴 제목
- keyboard/form 사용성
- sticky 요소 겹침
- 색 대비
- 결과 스캔 가능성

## 23. 완료 정의

Design Foundation 단계는 다음이 충족되면 완료다.

- 본 문서가 디자인 Source of Truth로 확정
- 토큰과 구현 CSS가 본 문서와 일치
- 공통 shell/header/footer가 규칙을 준수
- 대표 UI primitives(Button/Input/Card/Section/Chip)의 기준이 일치
- 실제 모바일과 desktop에서 foundation 적용 화면을 육안 확인

그 전까지는 개별 화면을 대규모로 재디자인하지 않는다.
