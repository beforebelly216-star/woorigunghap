import type { DetailedReportContent } from "@/lib/narrative/report-engine-v5";
import { BulletList, Chapter, Paragraph } from "./report-v2-components";

function safeItems(items: string[], fallback: string) {
  return items.length > 0 ? items : [fallback];
}

export default function ReportChaptersA({
  content,
  personAName,
  personBName,
}: {
  content: DetailedReportContent;
  personAName: string;
  personBName: string;
}) {
  const relationshipKeywords = [
    content.strengthsAndRisks.strengths[0],
    content.personB.relationshipNeeds,
    content.strengthsAndRisks.repeatedFrictions[0],
  ].filter(Boolean);

  const attractionCards = safeItems(
    content.personA.strengths.slice(0, 3),
    content.directionalImpact.aToB,
  );

  return <>
    <Chapter
      index={0}
      eyebrow="TOTAL DIAGNOSIS"
      title="두 사람의 궁합, 먼저 이것부터 보세요"
      intro="첫 화면에서는 점수 자체보다 이 관계를 살리는 힘, 반복해서 어긋날 수 있는 지점, 그리고 지금 가장 효과적인 대응 방향을 먼저 잡습니다."
      summary={[content.overview.headline, content.bondAndFriction.overview, content.directionalImpact.asymmetry]}
    >
      <div className="reference-opening-quote">
        <span>RELATIONSHIP ONE-LINER</span>
        <strong>{content.overview.headline}</strong>
      </div>
      <Paragraph>{content.overview.detailedSummary}</Paragraph>

      <div className="reference-keywords" aria-label="관계 핵심 키워드">
        {relationshipKeywords.map((item, index) => <span key={`${index}-${item}`}>#{item.length > 24 ? `${item.slice(0, 24)}…` : item}</span>)}
      </div>

      <div className="reference-diagnosis-grid">
        <article>
          <small>이 관계를 살리는 힘</small>
          <h3>가장 먼저 키울 것</h3>
          <BulletList items={safeItems(content.strengthsAndRisks.strengths.slice(0, 2), content.chemistry.overview)} />
        </article>
        <article>
          <small>반복 주의 지점</small>
          <h3>먼저 끊어야 할 패턴</h3>
          <BulletList items={safeItems(content.strengthsAndRisks.repeatedFrictions.slice(0, 2), content.strengthsAndRisks.warning)} />
        </article>
        <article>
          <small>관계의 방향</small>
          <h3>두 사람이 서로 다르게 느끼는 부분</h3>
          <Paragraph>{content.directionalImpact.asymmetry}</Paragraph>
        </article>
      </div>
    </Chapter>

    <Chapter
      index={1}
      eyebrow="BASE MAP"
      title="두 사람의 기본판"
      intro="각자의 관계 성향을 따로 본 뒤, 둘이 만났을 때 어떤 기운이 강해지고 어떤 부분에서 체감 차이가 생기는지 연결합니다."
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
      <div className="v2-detail-grid">
        <div><h3>일간</h3><p>{content.chemistry.dayMaster}</p></div>
        <div><h3>일지</h3><p>{content.chemistry.dayBranch}</p></div>
        <div><h3>음양 리듬</h3><p>{content.chemistry.yinYang}</p></div>
        <div><h3>오행 상보</h3><p>{content.chemistry.elements}</p></div>
      </div>
      <div className="reference-focus-box">
        <small>이 관계를 결정하는 한 지점</small>
        <strong>{content.bondAndFriction.overview}</strong>
        <p>{content.directionalImpact.overview}</p>
      </div>
    </Chapter>

    <Chapter
      index={2}
      eyebrow="PARTNER DECONSTRUCTION"
      title={`${personBName}, 관계 안에서는 이런 사람입니다`}
      intro="1:1 궁합에서 가장 오래 읽게 되는 장입니다. 상대를 단정적으로 규정하지 않고, 현재 계산 근거에서 반복될 가능성이 높은 욕구·반응·부담 지점을 상대 중심으로 묶었습니다."
      summary={[content.personB.relationshipNeeds, ...content.personB.strengths.slice(0, 1), ...content.personB.cautions.slice(0, 1)]}
    >
      <div className="reference-partner-lead">
        <span>상대 해부 핵심</span>
        <h3>{content.personB.relationshipNeeds}</h3>
        <Paragraph>{content.personB.overallProfile}</Paragraph>
      </div>

      <div className="reference-partner-grid">
        <article>
          <small>01 · 겉에서 먼저 보이는 결</small>
          <h3>기본적으로 드러나는 모습</h3>
          <Paragraph>{content.personB.elementAnalysis}</Paragraph>
        </article>
        <article>
          <small>02 · 관계 안쪽의 욕구</small>
          <h3>가까운 사람에게 바라는 것</h3>
          <Paragraph>{content.personB.relationshipNeeds}</Paragraph>
        </article>
        <article>
          <small>03 · 편해지기 쉬운 지점</small>
          <h3>{personAName}이 줄 수 있는 좋은 자극</h3>
          <Paragraph>{content.directionalImpact.beneficialSupply}</Paragraph>
        </article>
        <article>
          <small>04 · 부담이 커지는 지점</small>
          <h3>선의가 있어도 압박으로 느낄 수 있는 부분</h3>
          <Paragraph>{content.directionalImpact.burdenSupply}</Paragraph>
        </article>
      </div>

      <div className="v2-two-column">
        <div><h3>상대의 강점</h3><BulletList items={safeItems(content.personB.strengths, content.chemistry.overview)} /></div>
        <div><h3>상대가 예민해질 수 있는 지점</h3><BulletList items={safeItems(content.personB.cautions, content.strengthsAndRisks.warning)} /></div>
      </div>

      <h3>두 사람 사이에서 실제로 드러나기 쉬운 장면</h3>
      <div className="reference-scene-list">
        {safeItems(content.bondAndFriction.realLifeManifestations, content.bondAndFriction.overview).map((item, index) => (
          <div key={`${index}-${item}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></div>
        ))}
      </div>
    </Chapter>

    <Chapter
      index={3}
      eyebrow="YOUR LEVERAGE"
      title={`${personAName}이 ${personBName}에게 잘 통하는 방식`}
      intro="일반적인 내 장점이 아니라, 이 상대와의 조합에서 실제로 강점으로 작동하기 쉬운 부분과 과하게 쓰면 역효과가 나는 부분을 분리합니다."
      summary={[...content.personA.strengths.slice(0, 2), content.directionalImpact.aToB]}
    >
      <div className="reference-top3">
        {attractionCards.map((item, index) => (
          <article key={`${index}-${item}`}>
            <span>TOP {index + 1}</span>
            <p>{item}</p>
          </article>
        ))}
      </div>

      <div className="reference-conversation-card">
        <small>말투 · 대화 방식</small>
        <h3>{personAName} → {personBName}</h3>
        <Paragraph>{content.directionalImpact.aToB}</Paragraph>
        <strong>핵심은 “내 방식대로 잘해주는 것”보다 상대가 받아들이기 쉬운 형태로 전달하는 것입니다.</strong>
      </div>

      <div className="v2-two-column">
        <div>
          <h3>상대에게 실제로 도움이 되는 방식</h3>
          <Paragraph>{content.directionalImpact.beneficialSupply}</Paragraph>
          <BulletList items={safeItems(content.practicalManual.do.slice(0, 2), content.directionalImpact.aToB)} />
        </div>
        <div>
          <h3>반대로 역효과가 날 수 있는 습관</h3>
          <BulletList items={safeItems(content.personA.cautions, content.directionalImpact.burdenSupply)} />
        </div>
      </div>
    </Chapter>
  </>;
}
