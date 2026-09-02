/**
 * 우리사주 공통 마스코트.
 *
 * 서비스 전반에서 같은 인상을 유지하는 고해상도 투명 PNG 표정 자산을 사용한다.
 *
 * 사용 규칙: ZootopiCaption의 발화 텍스트는 항상 반말로 작성한다.
 */

export type ZootopiExpression = "smile" | "analyzing" | "idea" | "thinking" | "surprised";

/**
 * 소형 아이콘부터 카드 히어로까지 공통으로 쓰는 마스코트 마크.
 * expression에 맞는 표정과 제스처를 사용한다.
 * `withBody`는 기존 호출부 호환성을 위해 prop 계약에 남겨 둔다.
 */
export function ZootopiMark({
  expression = "smile",
  className,
}: {
  expression?: ZootopiExpression;
  className?: string;
  withBody?: boolean;
}) {
  return (
    <div
      className={`zt-mark zt-mark--${expression} ${className ?? ""}`}
      aria-hidden="true"
      data-expression={expression}
    >
      <span className="zt-mark__art" />
    </div>
  );
}

/** 마스코트 발화 캡션. children은 항상 반말로 작성한다. */
export function ZootopiCaption({
  expression = "smile",
  children,
  label = "한마디",
}: {
  expression?: ZootopiExpression;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <aside className="zt-caption" aria-label={`${label}의 코멘트`}>
      <ZootopiMark expression={expression} className="zt-caption-mark" />
      <div>
        <small>{label}</small>
        <p>{children}</p>
      </div>
    </aside>
  );
}
