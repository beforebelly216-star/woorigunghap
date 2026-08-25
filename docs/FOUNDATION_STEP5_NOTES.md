# Foundation v2 Step 5 — Generation State UI

- Scope: 1:1 결제 후 결과 화면의 loading / missing recovery / account fatal / terminal fatal 상태만 재정의한다.
- Layout: compact 480px, neutral canvas, typography-first hierarchy.
- Visual rule: gradient, glow, large shadow, legacy accent CTA를 사용하지 않는다.
- Behavior preservation: staged generation, retry, terminal failure, 결제 복구, account ownership, payment verification 로직은 변경하지 않는다.
- `result-status.css`가 상태 화면의 후순위 layout owner이며, 1:1 완성 리포트 본문은 Step 6에서 별도 개편한다.
