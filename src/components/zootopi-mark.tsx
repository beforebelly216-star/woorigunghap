/**
 * 주토피 — 버터 옐로우 주식 마법사 토끼 마스코트.
 * 원본 캐릭터 시트(`zootopi-character-sheet-v1.png`, docs/zootopi-stock-theme-work-order-v1.md §4)를
 * 인앱 SVG 아이콘 크기(소형 라인아트~카드 히어로)에 맞게 단순화한 자산이다.
 *
 * 사용 규칙(§4.8): 이 컴포넌트가 렌더링하는 말풍선 텍스트(ZootopiCaption)는 항상 반말이어야 한다.
 * 버튼/헤드라인 등 일반 UI 텍스트에는 이 컴포넌트를 캐릭터 "발화"로 쓰지 않는다.
 *
 * 스타일: `zootopi-mark.css`는 이 컴포넌트를 쓰는 각 route의 page.tsx에서 직접 import한다
 * (이 저장소의 기존 관례 — report-theme.css/one-to-many-foundation.css와 동일 패턴).
 */

export type ZootopiExpression = "smile" | "analyzing" | "idea" | "thinking" | "surprised";

const EYE_Y = 47;

function Ears() {
  return <>
    <path d="M30 30c-9-20-6-42 4-46 8-3 13 9 12 24-1 12-5 20-9 26Z" className="zt-ear-outer" />
    <path d="M62 30c9-20 6-42-4-46-8-3-13 9-12 24 1 12 5 20 9 26Z" className="zt-ear-outer" />
    <path d="M31 26c-5-15-3-30 4-33 5-1 8 7 7 18-1 9-5 12-11 15Z" className="zt-ear-inner" />
    <path d="M61 26c5-15 3-30-4-33-5-1-8 7-7 18 1 9 5 12 11 15Z" className="zt-ear-inner" />
  </>;
}

function Face({ expression }: { expression: ZootopiExpression }) {
  switch (expression) {
    case "analyzing":
      return <>
        <circle cx="35" cy={EYE_Y} r="1.6" className="zt-pupil" />
        <path d="M50 45c3-2 7-2 10 0" className="zt-eye-line" />
        <circle cx="55" cy={EYE_Y + 2} r="9" className="zt-magnifier" />
        <line x1="61.5" y1={EYE_Y + 8.5} x2="67" y2={EYE_Y + 14} className="zt-magnifier-handle" />
        <path d="M39 60c3 2 7 2 10 0" className="zt-mouth" />
      </>;
    case "idea":
      return <>
        <circle cx="35" cy={EYE_Y} r="2.1" className="zt-pupil" />
        <circle cx="55" cy={EYE_Y} r="2.1" className="zt-pupil" />
        <path d="M38 61c4 3 12 3 16 0" className="zt-mouth" />
        <g className="zt-sparkle">
          <path d="M70 20l1.6 4.4L76 26l-4.4 1.6L70 32l-1.6-4.4L64 26l4.4-1.6Z" />
        </g>
      </>;
    case "thinking":
      return <>
        <path d="M32 47c2-1.5 5-1.5 7 0" className="zt-eye-line" />
        <path d="M52 47c2-1.5 5-1.5 7 0" className="zt-eye-line" />
        <path d="M40 61h10" className="zt-mouth" />
        <circle cx="45" cy="70" r="2" className="zt-chin-dot" />
      </>;
    case "surprised":
      return <>
        <circle cx="35" cy={EYE_Y} r="3.4" className="zt-pupil-big" />
        <circle cx="55" cy={EYE_Y} r="3.4" className="zt-pupil-big" />
        <circle cx="45" cy="62" r="5.5" className="zt-mouth-open" />
        <g className="zt-exclaim"><rect x="66" y="18" width="3" height="12" rx="1.5" /><rect x="66" y="33" width="3" height="3" rx="1.5" /></g>
        <g className="zt-exclaim"><rect x="76" y="24" width="3" height="12" rx="1.5" /><rect x="76" y="39" width="3" height="3" rx="1.5" /></g>
      </>;
    case "smile":
    default:
      return <>
        <circle cx="35" cy={EYE_Y} r="2.4" className="zt-pupil" />
        <circle cx="55" cy={EYE_Y} r="2.4" className="zt-pupil" />
        <path d="M37 60c4 3.5 11 3.5 15 0" className="zt-mouth" />
      </>;
  }
}

/** 소형 아이콘~카드 히어로 어디에나 쓰는 주토피 얼굴 마크. 챕터 전환부에는 40px 이하로도 사용 가능. */
export function ZootopiMark({
  expression = "smile",
  className,
  withBody = false,
}: {
  expression?: ZootopiExpression;
  className?: string;
  withBody?: boolean;
}) {
  return <div className={`zt-mark ${className ?? ""}`} aria-hidden="true">
    <svg viewBox="0 0 92 100">
      <Ears />
      <circle cx="46" cy="52" r="34" className="zt-face" />
      <circle cx="33" cy={EYE_Y} r="8.5" className="zt-glass" />
      <circle cx="57" cy={EYE_Y} r="8.5" className="zt-glass" />
      <path d="M41.5 47h9" className="zt-bridge" />
      <Face expression={expression} />
      {withBody ? <path d="M18 100c4-16 52-16 56 0" className="zt-hoodie" /> : null}
    </svg>
  </div>;
}

/** §4.8 반말 원칙이 적용되는 주토피 발화 캡션. children은 항상 반말로 작성한다. */
export function ZootopiCaption({
  expression = "smile",
  children,
  label = "주토피",
}: {
  expression?: ZootopiExpression;
  children: React.ReactNode;
  label?: string;
}) {
  return <aside className="zt-caption" aria-label={`${label}의 코멘트`}>
    <ZootopiMark expression={expression} className="zt-caption-mark" />
    <div><small>{label}</small><p>{children}</p></div>
  </aside>;
}
