from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if new in source:
        return
    if old not in source:
        raise RuntimeError(f"missing target in {path}: {old[:200]!r}")
    write(path, source.replace(old, new, 1))


replace_once(
    "docs/PROJECT_STATE.md",
    '- Neon 서버 저장, 복구 링크, 계정 보관함\n',
    '- Neon 서버 저장, 복구 링크, 계정 보관함\n- 완성된 보관함 결과 개별 삭제: 상세 결과·입력정보·접근 토큰을 제거하고 전자상거래 법정 보존에 필요한 최소 결제기록만 유지. 삭제 상태는 오래 열린 탭/복구키로 재생성되지 않도록 서버 저장 경계에서 차단.\n- 궁합 공개 점수 v1.4: 기존 결정론적 raw 가중합·9개 차원 점수는 유지하고, 사용자 종합점수와 불확실성 범위만 45~100점 단조 스케일로 상향 표시. 1:1/1:N 기존 저장 결과도 AI 재생성 없이 동일 스케일로 표시.\n- 공개 종합점수에 45~54부터 95~100까지 관계 체감 수준 라벨/설명을 제공.\n',
)
replace_once(
    "docs/PROJECT_STATE.md",
    '## 카카오 완료 알림 구조\n',
    '''## 2026-08-22 보관함 삭제 / 궁합 점수 v1.4\n\n- 보관함의 완성 리포트에 `결과 삭제` 기능을 추가했다. 로그인 소유권과 same-origin 요청을 확인한 뒤 상세 report JSON, 원본 입력이 포함된 주문 JSON, 결과 access-token hash를 제거한다.\n- 결제 취소/환불 기록과 혼동하지 않도록 전자상거래 법정 보존 의무에 필요한 paymentId/orderId/product/amount/status/createdAt 수준의 최소 거래기록은 남긴다.\n- 삭제 후 브라우저의 주문 draft와 1:1 progress cache도 지우며, DB `generation_status=deleted` 주문은 stale 탭·복구키가 access token이나 리포트를 다시 저장하지 못하게 차단한다.\n- scoring/engine 버전을 `1.4.0` / `compatibility-engine-v1.4.0`으로 올렸다. 9개 차원 계산·가중합 `rawTotal`은 기존 규칙 그대로이며 public overall만 raw 30~100 → 45~100으로 선형·단조 보정한다. 따라서 1:N 후보 순서의 계산 근거는 유지되며 좋은 조합은 더 높은 절댓값, 이론적 최고 구간은 100점까지 표현된다.\n- 사용자 점수 설명은 45~54 `서로 다른 점이 큰 궁합`부터 95~100 `최상급 궁합`까지 10개 구간으로 제공한다. 이 라벨은 관계 체감 설명이지 성공확률·미래 예측 확률이 아니다.\n\n## 카카오 완료 알림 구조\n''',
)

replace_once(
    "docs/NEXT_TASK.md",
    '## 사용자 실사용으로 확인할 항목\n',
    '''- [x] **사용자 요청: 보관함 개별 결과 삭제 + 공개 궁합 점수 상향/구간 설명**\n  - 완성된 계정 보관함 결과를 개별 영구 삭제. 상세 리포트·입력정보·접근 토큰 제거, 법정 보존 최소 결제기록만 유지.\n  - 삭제 결과는 stale 탭/복구키/토큰 재등록/리포트 재저장으로 살아나지 않도록 `generation_status=deleted` 서버 경계를 적용.\n  - 결정론적 raw 계산과 9개 차원은 유지하고 공개 종합점수만 45~100점으로 단조 보정. 1:1/1:N 기존 저장본도 재생성 없이 같은 public scale로 표시.\n  - 45~54부터 95~100까지 10개 궁합 수준 라벨/설명을 결과 UI에 추가.\n\n## 사용자 실사용으로 확인할 항목\n''',
)
old_handoff = '''```text
HANDOFF
- Worker: GPT
- Task: 기존 저장본 일주 표시 오류 + P5 누락 UI + 홈 화면 hotfix
- Status: complete
- Validation: test:intro:day-pillar + test:report:p5-ui + Core validation + lint + production build
- Commit: PR 검증 후 main squash merge SHA 기준
- Remaining: 사용자 1:1 실결제/새 생성 결과 확인; 360/390/430 실제 뷰포트 육안 QA; 외부 SOLAPI/Kakao 발송 설정
- Risk: 저장된 AI 원문/계산/점수는 수정하지 않고 화면 표시만 확정 facts로 정정; none otherwise
```'''
new_handoff = '''```text
HANDOFF
- Worker: GPT
- Task: 보관함 완성 결과 개별 삭제 + 궁합 공개 점수 45~100 상향 보정 + 점수 구간 설명
- Status: complete
- Validation: test:compatibility:engine + test:day18:account-report-library + test:day15:one-to-many-result-ui + test:report:p5-ui + lint + production build + PR Core validation 예정
- Commit: PR #29 검증 후 main squash merge SHA 기준
- Remaining: Production에서 실제 계정 보관함 삭제 1회 확인; 1:1/1:N 실결제에서 새 점수 분포 관찰; 360/390/430 실제 뷰포트 육안 QA; 외부 SOLAPI/Kakao 발송 설정
- Risk: 공개 종합점수만 상향 보정하며 raw 9차원 계산/AI 경계는 유지. 삭제 시 상세 데이터는 복구 불가하며 법정 의무 최소 결제기록은 유지.
```'''
replace_once("docs/NEXT_TASK.md", old_handoff, new_handoff)

replace_once(
    "docs/DECISIONS.md",
    '- AI는 계산 결과를 바꾸지 않고 서술만 생성한다.\n',
    '- AI는 계산 결과를 바꾸지 않고 서술만 생성한다.\n- 궁합의 내부 결정론적 계산 근거는 기존 9개 차원과 `rawTotal` 가중합이다. 사용자에게 보여주는 **공개 종합점수는 raw 30~100을 45~100으로 단조 보정**해 사용한다. 최저 절댓값을 약 45점으로 두고 매우 높은 조합은 100점까지 표현할 수 있게 하되 후보 순서의 계산 근거를 임의로 바꾸지 않는다.\n- 공개 점수의 `최상급/아주 잘 맞음/좋은 편/조율 필요` 등 구간 라벨은 관계 체감을 돕는 제품 표현이며 성공확률·미래 예측 확률이 아니다. AI는 raw 점수, 공개 점수, 구간을 임의로 수정할 수 없다.\n',
)
replace_once(
    "docs/DECISIONS.md",
    '- 회원탈퇴 시 제거 대상 데이터 삭제 및 필요한 경우 Kakao unlink를 유지한다.\n',
    '- 회원탈퇴 시 제거 대상 데이터 삭제 및 필요한 경우 Kakao unlink를 유지한다.\n- 사용자는 계정 보관함의 **완성된 개별 구매 결과를 영구 삭제**할 수 있다. 삭제하면 상세 리포트, 입력 개인정보가 포함된 주문 원문, 결과 접근 토큰/브라우저 복구 사본을 제거하고 복구·재생성을 허용하지 않는다. 단, 전자상거래 법정 보존 의무가 있는 최소 결제 거래기록은 해당 의무 범위에서 유지할 수 있다.\n',
)
