import type { DetailedReportContent } from "@/lib/narrative/report-engine-v5";
import { BulletList, Chapter, Paragraph } from "./report-v2-components";

export default function ReportChaptersA({ content, personAName, personBName }: { content: DetailedReportContent; personAName: string; personBName: string }) {
  return <>
    <Chapter index={1} eyebrow="OVERVIEW" title="두 사람을 한 문장보다 깊게 보면"><Paragraph>{content.overview.detailedSummary}</Paragraph></Chapter>
    <Chapter index={2} eyebrow="MY RELATIONSHIP PROFILE" title={`${personAName}의 관계 원국`}>
      <h3>기본 성향</h3><Paragraph>{content.personA.overallProfile}</Paragraph>
      <h3>오행의 과부족과 실제 의미</h3><Paragraph>{content.personA.elementAnalysis}</Paragraph>
      <h3>관계에서 필요한 기운</h3><Paragraph>{content.personA.relationshipNeeds}</Paragraph>
      <div className="v2-two-column"><div><h3>관계상 장점</h3><BulletList items={content.personA.strengths} /></div><div><h3>주의할 점</h3><BulletList items={content.personA.cautions} /></div></div>
    </Chapter>
    <Chapter index={3} eyebrow="PARTNER PROFILE" title={`${personBName}의 관계 원국`}>
      <h3>기본 성향</h3><Paragraph>{content.personB.overallProfile}</Paragraph>
      <h3>오행의 과부족과 실제 의미</h3><Paragraph>{content.personB.elementAnalysis}</Paragraph>
      <h3>관계에서 필요한 기운</h3><Paragraph>{content.personB.relationshipNeeds}</Paragraph>
      <div className="v2-two-column"><div><h3>관계상 장점</h3><BulletList items={content.personB.strengths} /></div><div><h3>주의할 점</h3><BulletList items={content.personB.cautions} /></div></div>
    </Chapter>
    <Chapter index={4} eyebrow="BASIC CHEMISTRY" title="두 사람의 기본 케미">
      <Paragraph>{content.chemistry.overview}</Paragraph>
      <div className="v2-detail-grid"><div><h3>일간</h3><p>{content.chemistry.dayMaster}</p></div><div><h3>일지</h3><p>{content.chemistry.dayBranch}</p></div><div><h3>음양</h3><p>{content.chemistry.yinYang}</p></div><div><h3>오행</h3><p>{content.chemistry.elements}</p></div></div>
    </Chapter>
    <Chapter index={5} eyebrow="BOND & FRICTION" title="둘 사이에 실제로 작용하는 결속과 마찰">
      <Paragraph>{content.bondAndFriction.overview}</Paragraph>
      <div className="v2-two-column"><div><h3>서로를 묶는 신호</h3><BulletList items={content.bondAndFriction.positiveInteractions} /></div><div><h3>반복될 수 있는 마찰</h3><BulletList items={content.bondAndFriction.frictionInteractions} /></div></div>
      <h3>현실에서는 이렇게 나타날 수 있어요</h3><BulletList items={content.bondAndFriction.realLifeManifestations} />
    </Chapter>
  </>;
}
