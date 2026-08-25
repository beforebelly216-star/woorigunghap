import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import { BulletList, Paragraph } from "./report-v2-components";

export function ReportFoundationSummary({
  content,
  personAName,
  personBName,
}: {
  content: EnhancedDetailedReportContent;
  personAName: string;
  personBName: string;
}) {
  const strengths = content.strengthsAndRisks.strengths.filter(Boolean).slice(0, 3);
  const cautions = content.strengthsAndRisks.repeatedFrictions.filter(Boolean).slice(0, 3);
  const firstAction = content.situationStrategy?.priority
    ?? content.practicalManual.do.find(Boolean)
    ?? "둘 사이에서 잘 통했던 장면 하나를 먼저 반복해 보세요.";

  return (
    <section className="foundation-summary" aria-labelledby="foundation-summary-title">
      <div className="foundation-summary-heading">
        <small>RELATIONSHIP AT A GLANCE</small>
        <h2 id="foundation-summary-title">긴 리포트 전에, 두 사람의 핵심부터</h2>
        <p>점수보다 먼저 실제 관계에서 체감하기 쉬운 방향과 행동 포인트를 압축했습니다.</p>
      </div>

      <div className="foundation-two-sides" aria-label="두 사람이 서로에게 미치는 방향">
        <article>
          <span>나 → 상대</span>
          <h3>{personAName}이 {personBName}에게 주는 영향</h3>
          <Paragraph>{content.directionalImpact.aToB}</Paragraph>
        </article>
        <article>
          <span>상대 → 나</span>
          <h3>{personBName}이 {personAName}에게 주는 영향</h3>
          <Paragraph>{content.directionalImpact.bToA}</Paragraph>
        </article>
      </div>

      <div className="foundation-signal-grid">
        <article>
          <small>STRENGTHS</small>
          <h3>이 관계를 살리는 힘</h3>
          <BulletList items={strengths} />
        </article>
        <article>
          <small>WATCH OUT</small>
          <h3>반복해서 어긋나기 쉬운 지점</h3>
          <BulletList items={cautions} />
        </article>
      </div>

      <div className="foundation-flow-row">
        <div>
          <small>RELATIONSHIP FLOW</small>
          <h3>가까워질수록 나타나는 흐름</h3>
          <Paragraph>{content.relationshipFlow.overview}</Paragraph>
        </div>
        <div>
          <small>DO THIS FIRST</small>
          <h3>지금 가장 먼저 해볼 것</h3>
          <strong>{firstAction}</strong>
        </div>
      </div>

      <a className="foundation-deep-link" href="#deep-report-start">CH0~CH9 상세 리포트로 내려가기</a>
    </section>
  );
}
