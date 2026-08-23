# Growth P2 Share Copy Selections v1

> 상태: **P2-3 선별 완료 / Production 미적용**
> 원본 후보: `docs/GROWTH_SHARE_COPY_REVIEW_V1.md`
> 최종 후보: raw 240개 중 160개 채택, 80개 제외.

## 공통 편집 규칙

- `curiosity` 카피의 `████`는 고정 4글자 장식이 아니라 **실제 숨길 핵심 답 구절 전체를 마스킹하는 자리표시자**다.
- 전체 문장을 가리지 않고 문맥 약 60~80%를 남기고 핵심 답 약 20~40%만 가리는 방향을 기본으로 한다.
- 실제 Production에서는 계산/편집 결과에서 결정된 숨김 구절 길이에 맞춰 마스킹한다.
- 사용자가 직접 선별한 짝사랑 39개는 그대로 유지한다.
- 나머지 관계는 중복 Clean 문구를 줄이고, 각 셀에서 Tease 최소 1개와 Curiosity 2개를 우선 보존해 일괄 선별했다.
- P2-4 코드화 전까지 이 문서는 승인된 편집 후보 목록이며 공유 UI/DTO에는 연결하지 않는다.

## 짝사랑 — 사용자 직접 선별 39개

### 안정형
- 채택: `CR-ST-01`, `CR-ST-02`, `CR-ST-03`, `CR-ST-04`, `CR-ST-06`, `CR-ST-07`, `CR-ST-08`
- 제외: `CR-ST-05`

### 티키타카형
- 채택: `CR-BA-01`, `CR-BA-02`, `CR-BA-04`, `CR-BA-06`, `CR-BA-07`, `CR-BA-08`
- 제외: `CR-BA-03`, `CR-BA-05`

### 반전형
- 채택: `CR-TW-01`, `CR-TW-02`, `CR-TW-03`, `CR-TW-04`, `CR-TW-05`, `CR-TW-07`, `CR-TW-08`
- 제외: `CR-TW-06`

### 거리조절형
- 채택: `CR-DI-02`, `CR-DI-03`, `CR-DI-05`, `CR-DI-06`, `CR-DI-07`, `CR-DI-08`
- 제외: `CR-DI-01`, `CR-DI-04`

### 노력형
- 채택: `CR-EF-02`, `CR-EF-03`, `CR-EF-04`, `CR-EF-05`, `CR-EF-07`, `CR-EF-08`
- 제외: `CR-EF-01`, `CR-EF-06`

### 극과극형
- 채택: `CR-OP-01`, `CR-OP-02`, `CR-OP-04`, `CR-OP-05`, `CR-OP-06`, `CR-OP-07`, `CR-OP-08`
- 제외: `CR-OP-03`

## 썸 — 일괄 선별 31개

### 안정형
- 채택: `FL-ST-01`, `FL-ST-02`, `FL-ST-03`, `FL-ST-05`, `FL-ST-07`, `FL-ST-08`
- 제외: `FL-ST-04`, `FL-ST-06`

### 티키타카형
- 채택: `FL-BA-01`, `FL-BA-02`, `FL-BA-06`, `FL-BA-07`, `FL-BA-08`
- 제외: `FL-BA-03`, `FL-BA-04`, `FL-BA-05`

### 반전형
- 채택: `FL-TW-01`, `FL-TW-04`, `FL-TW-05`, `FL-TW-07`, `FL-TW-08`
- 제외: `FL-TW-02`, `FL-TW-03`, `FL-TW-06`

### 거리조절형
- 채택: `FL-DI-01`, `FL-DI-02`, `FL-DI-06`, `FL-DI-07`, `FL-DI-08`
- 제외: `FL-DI-03`, `FL-DI-04`, `FL-DI-05`

### 노력형
- 채택: `FL-EF-01`, `FL-EF-03`, `FL-EF-06`, `FL-EF-07`, `FL-EF-08`
- 제외: `FL-EF-02`, `FL-EF-04`, `FL-EF-05`

### 극과극형
- 채택: `FL-OP-01`, `FL-OP-02`, `FL-OP-06`, `FL-OP-07`, `FL-OP-08`
- 제외: `FL-OP-03`, `FL-OP-04`, `FL-OP-05`

## 연인 — 일괄 선별 30개

### 안정형
- 채택: `LO-ST-01`, `LO-ST-02`, `LO-ST-06`, `LO-ST-07`, `LO-ST-08`
- 제외: `LO-ST-03`, `LO-ST-04`, `LO-ST-05`

### 티키타카형
- 채택: `LO-BA-01`, `LO-BA-02`, `LO-BA-06`, `LO-BA-07`, `LO-BA-08`
- 제외: `LO-BA-03`, `LO-BA-04`, `LO-BA-05`

### 반전형
- 채택: `LO-TW-01`, `LO-TW-02`, `LO-TW-05`, `LO-TW-07`, `LO-TW-08`
- 제외: `LO-TW-03`, `LO-TW-04`, `LO-TW-06`

### 거리조절형
- 채택: `LO-DI-01`, `LO-DI-02`, `LO-DI-06`, `LO-DI-07`, `LO-DI-08`
- 제외: `LO-DI-03`, `LO-DI-04`, `LO-DI-05`

### 노력형
- 채택: `LO-EF-01`, `LO-EF-02`, `LO-EF-05`, `LO-EF-07`, `LO-EF-08`
- 제외: `LO-EF-03`, `LO-EF-04`, `LO-EF-06`

### 극과극형
- 채택: `LO-OP-01`, `LO-OP-02`, `LO-OP-05`, `LO-OP-07`, `LO-OP-08`
- 제외: `LO-OP-03`, `LO-OP-04`, `LO-OP-06`

## 친구 — 일괄 선별 30개

### 안정형
- 채택: `FR-ST-01`, `FR-ST-02`, `FR-ST-06`, `FR-ST-07`, `FR-ST-08`
- 제외: `FR-ST-03`, `FR-ST-04`, `FR-ST-05`

### 티키타카형
- 채택: `FR-BA-01`, `FR-BA-02`, `FR-BA-06`, `FR-BA-07`, `FR-BA-08`
- 제외: `FR-BA-03`, `FR-BA-04`, `FR-BA-05`

### 반전형
- 채택: `FR-TW-01`, `FR-TW-02`, `FR-TW-05`, `FR-TW-07`, `FR-TW-08`
- 제외: `FR-TW-03`, `FR-TW-04`, `FR-TW-06`

### 거리조절형
- 채택: `FR-DI-01`, `FR-DI-02`, `FR-DI-05`, `FR-DI-07`, `FR-DI-08`
- 제외: `FR-DI-03`, `FR-DI-04`, `FR-DI-06`

### 노력형
- 채택: `FR-EF-01`, `FR-EF-02`, `FR-EF-06`, `FR-EF-07`, `FR-EF-08`
- 제외: `FR-EF-03`, `FR-EF-04`, `FR-EF-05`

### 극과극형
- 채택: `FR-OP-01`, `FR-OP-02`, `FR-OP-06`, `FR-OP-07`, `FR-OP-08`
- 제외: `FR-OP-03`, `FR-OP-04`, `FR-OP-05`

## 직장동료 — 일괄 선별 30개

### 안정형
- 채택: `CO-ST-01`, `CO-ST-02`, `CO-ST-05`, `CO-ST-07`, `CO-ST-08`
- 제외: `CO-ST-03`, `CO-ST-04`, `CO-ST-06`

### 티키타카형
- 채택: `CO-BA-01`, `CO-BA-02`, `CO-BA-05`, `CO-BA-07`, `CO-BA-08`
- 제외: `CO-BA-03`, `CO-BA-04`, `CO-BA-06`

### 반전형
- 채택: `CO-TW-01`, `CO-TW-02`, `CO-TW-05`, `CO-TW-07`, `CO-TW-08`
- 제외: `CO-TW-03`, `CO-TW-04`, `CO-TW-06`

### 거리조절형
- 채택: `CO-DI-01`, `CO-DI-02`, `CO-DI-06`, `CO-DI-07`, `CO-DI-08`
- 제외: `CO-DI-03`, `CO-DI-04`, `CO-DI-05`

### 노력형
- 채택: `CO-EF-01`, `CO-EF-02`, `CO-EF-06`, `CO-EF-07`, `CO-EF-08`
- 제외: `CO-EF-03`, `CO-EF-04`, `CO-EF-05`

### 극과극형
- 채택: `CO-OP-01`, `CO-OP-02`, `CO-OP-05`, `CO-OP-07`, `CO-OP-08`
- 제외: `CO-OP-03`, `CO-OP-04`, `CO-OP-06`

## 최종 분포

- raw: 240
- 채택: **160**
- 제외: **80**
- 관계 유형: 짝사랑 39 / 썸 31 / 연인 30 / 친구 30 / 직장동료 30
- tone: clean 68 / tease 32 / curiosity 60
- 30개 `relationshipType × pattern` 셀 모두 최소 5개 이상 유지
- 다음 단계: P2-4 확정 160개를 Production 카피 라이브러리로 코드화하고 deterministic pattern/tone 선택 및 중복·금지표현 contract를 추가한다.
