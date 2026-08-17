import type { DetailedReportContent } from "@/lib/narrative/report-engine-v5";
import { BulletList, Chapter, Paragraph } from "./report-v2-components";

export default function ReportChaptersA({
  content,
  personAName,
  personBName,
}: {
  content: DetailedReportContent;
  personAName: string;
  personBName: string;
}) {
  return <>
    <Chapter
      index={0}
      eyebrow="TOTAL DIAGNOSIS"
      title="두 사람의 궁합, 먼저 이것부터 보세요"
      intro="점수보다 중요한 건 어떤 장점이 관계를 살리고, 어떤 반복 패턴이 실제로 마찰을 만드는지입니다."
      summary={[content.overview.headline, content.bondAndFriction.overview, content.directionalImpact.asymmetry]}
    >
      <Paragraph>{content.overview.detailedSummary}</Paragraph>
      <div className="v2-two-column">
        <div><h3>이 관계의 강점</h3><BulletList items={content.strengthsAndRisks.strengths} /></div>
        <div><h3>먼저 조심할 패턴</h3><BulletList items={content.strengthsAndRisks.repeatedFrictions} /></div>
      </div>
    </Chapter>

    <Chapter
      index={1}
      eyebrow="BASE MAP"
      title="두 사람의 기본판"
      intro="각자의 관계 성향을 먼저 분리해서 본 뒤, 둘이 만났을 때 어떤 기운이 더 강해지는지 연결합니다."
      summary={[content.personA.relationshipNeeds, content.personB.relationshipNeeds, content.chemistry.overview]}
    >
      <div className="day19-profile-pair">
        <article>
          <span className="day19-profile-label">나 · {personAName}</span>
          <h3>기본 성향</h3><Paragraph>{content.personA.overallProfile}</Paragraph>
          <h3>오행과 관계 욕구</h3><Paragraph>{content.personA.elementAnalysis}</Paragraph>
          <Paragraph>{content.personA.relationshipNeeds}</Paragraph>
        </article>
        <article>
          <span className="day19-profile-label">상대 · {personBName}</span>
          <h3>기본 성향</h3><Paragraph>{content.personB.overallProfile}</Paragraph>
          <h3>오행과 관계 욕구</h3><Paragraph>{content.personB.elementAnalysis}</Paragraph>
          <Paragraph>{content.personB.relationshipNeeds}</Paragraph>
        </article>
      </div>
      <div className="v2-detail-grid"><div><h3>일간</h3><p>{content.chemistry.dayMaster}</p></div><div><h3>일지</h3><p>{content.chemistry.dayBranch}</p></div><div><h3>음양</h3><p>{content.chemistry.yinYang}</p></div><div><h3>오행</h3><p>{content.chemistry.elements}</p></div></div>
    </Chapter>

    <Chapter
      index={2}
      eyebrow="PARTNER DECONSTRUCTION"
      title={`${personBName}, 관계 안에서는 이런 사람입니다`}
      intro="상대의 기질을 단정하는 대신, 계산 근거상 관계에서 반복될 가능성이 높은 반응과 욕구를 집중해서 봅니다."
      summary={[content.personB.relationshipNeeds, ...content.personB.strengths.slice(0, 1), ...content.personB.cautions.slice(0, 1)]}
    >
      <h3>상대의 관계 성향</h3><Paragraph>{content.personB.overallProfile}</Paragraph>
      <h3>상대가 관계에서 원하는 것</h3><Paragraph>{content.personB.relationshipNeeds}</Paragraph>
      <div className="v2-two-column"><div><h3>상대의 강점</h3><BulletList items={content.personB.strengths} /></div><div><h3>상대가 예민해질 수 있는 지점</h3><BulletList items={content.personB.cautions} /></div></div>
      <h3>두 사람 사이에서 실제로 드러나는 모습</h3><BulletList items={content.bondAndFriction.realLifeManifestations} />
    </Chapter>

    <Chapter
      index={3}
      eyebrow="YOUR LEVERAGE"
      title={`${personAName}이 이 관계에서 잘 쓰면 좋은 무기`}
      intro="내 성향 자체를 바꾸기보다, 이미 가지고 있는 장점을 어떤 방식으로 쓰면 관계가 더 잘 굴러가는지 정리합니다."
      summary={[...content.personA.strengths.slice(0, 2), content.directionalImpact.aToB]}
    >
      <div className="v2-two-column"><div><h3>이미 가진 장점</h3><BulletList items={content.personA.strengths} /></div><div><h3>과하게 쓰면 역효과가 날 수 있는 부분</h3><BulletList items={content.personA.cautions} /></div></div>
      <h3>{personAName} → {personBName}</h3><Paragraph>{content.directionalImpact.aToB}</Paragraph>
      <h3>상대에게 실제로 도움이 되는 방식</h3><Paragraph>{content.directionalImpact.beneficialSupply}</Paragraph>
    </Chapter>
  </>;
}
