/**
 * 주토피 공통 마스코트.
 *
 * 승인된 캐릭터 시트에서 추출한 실제 주토피 픽셀 자산을 사용한다.
 * 과거 인앱 단순 SVG 토끼를 다시 그리지 않는다.
 *
 * 사용 규칙: ZootopiCaption의 발화 텍스트는 항상 반말로 작성한다.
 */

export type ZootopiExpression = "smile" | "analyzing" | "idea" | "thinking" | "surprised";

/**
 * 소형 아이콘부터 카드 히어로까지 공통으로 쓰는 주토피 마크.
 * 현재 승인 원본의 기본 미소 포즈를 모든 소형 마크에 사용하고,
 * 생성 대기 전용 포즈는 /zootopi-bullish-loading.svg에서 별도로 사용한다.
 */
export function ZootopiMark({
  expression = "smile",
  className,
  withBody: _withBody = false,
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

/** 주토피 발화 캡션. children은 항상 반말로 작성한다. */
export function ZootopiCaption({
  expression = "smile",
  children,
  label = "주토피",
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
