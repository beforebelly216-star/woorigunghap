import type { DetailedReportContent } from "@/lib/narrative/report-engine-v5";
import { BulletList, Chapter, Paragraph } from "./report-v2-components";

export default function ReportChaptersB({ content, personAName, personBName, relationshipLabel }: { content: DetailedReportContent; personAName: string; personBName: string; relationshipLabel: string }) {
  return <>
    <Chapter index={6} eyebrow="DIRECTIONAL IMPACT" title="누가 누구에게 어떤 영향을 주는가">
      <Paragraph>{content.directionalImpact.overview}</Paragraph>
      <div className="v2-direction"><article><span>{personAName} → {personBName}</span><p>{content.directionalImpact.aToB}</p></article><article><span>{personBName} → {personAName}</span><p>{content.directionalImpact.bToA}</p></article></div>
      <h3>필요한 기운을 채우는 방식</h3><Paragraph>{content.directionalImpact.beneficialSupply}</Paragraph>
      <h3>부담이 될 수 있는 방향</h3><Paragraph>{content.directionalImpact.burdenSupply}</Paragraph>
      <h3>서로 똑같이 주고받는 관계인가?</h3><Paragraph>{content.directionalImpact.asymmetry}</Paragraph>
    </Chapter>
    <Chapter index={7} eyebrow="RELATIONSHIP FLOW" title={`${relationshipLabel} 관계의 흐름`}>
      <Paragraph>{content.relationshipFlow.overview}</Paragraph>
      <div className="v2-detail-grid"><div><h3>역할</h3><p>{content.relationshipFlow.roles}</p></div><div><h3>주도권</h3><p>{content.relationshipFlow.initiative}</p></div><div><h3>친밀해질수록</h3><p>{content.relationshipFlow.intimacy}</p></div></div>
      <h3>현실 갈등 시나리오</h3>
      <div className="v2-scenarios">{content.relationshipFlow.conflictScenarios.map((scenario, index) => <article key={`${index}-${scenario.situation}`}><span>SCENARIO {index + 1}</span><h4>{scenario.situation}</h4><p><strong>반복 패턴</strong>{scenario.likelyPattern}</p><p><strong>대응</strong>{scenario.response}</p></article>)}</div>
    </Chapter>
    <Chapter index={8} eyebrow="RELATIONSHIP-SPECIFIC" title={`${relationshipLabel}라서 특히 볼 것`}>
      <Paragraph>{content.relationshipSpecific.overview}</Paragraph>
      <div className="v2-numbered">{content.relationshipSpecific.points.map((point, index) => <div key={`${index}-${point.title}`}><span>{String(index + 1).padStart(2, "0")}</span><section><h3>{point.title}</h3><p>{point.detail}</p></section></div>)}</div>
    </Chapter>
    <Chapter index={9} eyebrow="STRENGTH & RISK" title="강점과 위험 신호">
      <div className="v2-two-column"><div><h3>핵심 강점</h3><BulletList items={content.strengthsAndRisks.strengths} /></div><div><h3>반복될 수 있는 마찰</h3><BulletList items={content.strengthsAndRisks.repeatedFrictions} /></div></div>
      <div className="v2-warning"><strong>레드 플래그</strong><p>{content.strengthsAndRisks.redFlag}</p><strong>과장 없이 보면</strong><p>{content.strengthsAndRisks.warning}</p></div>
    </Chapter>
    <Chapter index={10} eyebrow="PRACTICAL MANUAL" title="지금 관계에 써먹는 실전 매뉴얼">
      <div className="v2-two-column"><div><h3>이렇게 해보세요</h3><BulletList items={content.practicalManual.do} /></div><div><h3>이건 피하세요</h3><BulletList items={content.practicalManual.dont} /></div></div>
      <h3>갈등이 생겼을 때 순서</h3><div className="v2-protocol">{content.practicalManual.conflictProtocol.map((item, index) => <div key={`${index}-${item}`}><span>{index + 1}</span><p>{item}</p></div>)}</div>
      <h3>함께 하기 좋은 활동</h3><BulletList items={content.practicalManual.recommendedActivities} />
    </Chapter>
  </>;
}
