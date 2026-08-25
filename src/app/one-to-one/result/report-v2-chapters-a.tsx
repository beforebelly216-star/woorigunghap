import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import { BulletList, Chapter, Paragraph } from "./report-v2-components";
import { ReportFoundationSummary } from "./report-foundation-summary";

function safeItems(items: string[]) {
  return items.filter(Boolean);
}

function chapterSummary(content: EnhancedDetailedReportContent, key: "ch0" | "ch1" | "ch2" | "ch3") {
  return content.keyTakeaways?.[key] ?? [];
}

export default function ReportChaptersA({
  content,
  personAName,
  personBName,
}: {
  content: EnhancedDetailedReportContent;
  personAName: string;
  personBName: string;
}) {
  const relationshipKeywords = [
    content.strengthsAndRisks.strengths[0],
    content.personB.relationshipNeeds,
    content.strengthsAndRisks.repeatedFrictions[0],
  ].filter(Boolean);

  const attractionCards = content.personalLeverage?.topStrengths.length
    ? content.personalLeverage.topStrengths.slice(0, 3).map((item) => item.title)
    : safeItems(content.personA.strengths.slice(0, 3));

  return <>
    <ReportFoundationSummary content={content} personAName={personAName} personBName={personBName} />

    <div id="deep-report-start" className="foundation-deep-report-marker" aria-hidden="true" />
    <Chapter
      index={0}
      eyebrow="TOTAL DIAGNOSIS"
      title="두 사람의 궁합, 먼저 이것부터 보세요"
      intro="첫 화면에서는 점수 자체보다 이 관계를 살리는 힘, 반복해서 어긋날 수 있는 지점, 그리고 지금 가장 효과적인 대응 방향을 먼저 잡습니다."
      summary={chapterSummary(content, "ch0")}
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
          <BulletList items={safeItems(content.strengthsAndRisks.strengths.slice(0, 2))} />
        </article>
        <article>
          <small>반복 주의 지점</small>
          <h3>먼저 끊어야 할 패턴</h3>
          <BulletList items={safeItems(content.strengthsAndRisks.repeatedFrictions.slice(0, 2))} />
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
      summary={chapterSummary(content, "ch1")}
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
      intro="상대가 관계 안에서 어떤 속도로 반응하고 무엇에서 가까워지거나 멀어지는지 장면부터 짚습니다. 뒤에서 일간·일지와 합충 근거를 연결해 왜 그런 패턴이 나오는지 설명합니다."
      summary={chapterSummary(content, "ch2")}
    >
      {content.partnerInnerMindHero ? <aside className="partner-inner-mind-hero" aria-label="그 사람의 속마음">
        <small>그 사람의 속마음</small>
        <h3>{content.partnerInnerMindHero.headline}</h3>
        <blockquote>“{content.partnerInnerMindHero.innerVoice}”</blockquote>
        <p>{content.partnerInnerMindHero.sceneTranslation}</p>
        <div><span>사주로 보면</span><p>{content.partnerInnerMindHero.sajuBasis}</p></div>
      </aside> : null}

      <div className="reference-partner-lead">
        <span>상대 해부 핵심</span>
        <h3>{content.personB.relationshipNeeds}</h3>
        <Paragraph>{content.personB.overallProfile}</Paragraph>
      </div>

      {content.partnerDeepDive ? <>
        <div className="reference-keywords" aria-label="상대 프로필 태그">
          {content.partnerDeepDive.profileTags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
        <div className="reference-focus-box">
          <small>겉으로 보이는 모습과 가까워졌을 때의 차이</small>
          <strong>{content.partnerDeepDive.outerInnerContrast}</strong>
        </div>
        <div className="deep-partner-grid">
          <article>
            <small>OPEN</small><h3>편해지기 쉬운 신호</h3>
            <BulletList items={content.partnerDeepDive.comfortTriggers} />
          </article>
          <article>
            <small>SENSITIVE</small><h3>예민해지기 쉬운 신호</h3>
            <BulletList items={content.partnerDeepDive.sensitiveTriggers} />
          </article>
          <article>
            <small>BEST APPROACH</small><h3>잘 받아들이기 쉬운 방식</h3>
            <BulletList items={content.partnerDeepDive.preferredInteraction} />
          </article>
        </div>

        <h3>이런 장면에서 상대의 패턴이 드러납니다</h3>
        <div className="deep-observable-scenes">
          {content.partnerDeepDive.observableScenes.map((scene, index) => <article key={`${index}-${scene.situation}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><h4>{scene.situation}</h4><p><strong>이때 나오는 반응</strong>{scene.likelyReaction}</p><p><strong>배려하는 대응</strong>{scene.considerateResponse}</p></div>
          </article>)}
        </div>
      </> : <>
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
          <div><h3>상대의 강점</h3><BulletList items={safeItems(content.personB.strengths)} /></div>
          <div><h3>상대가 예민해질 수 있는 지점</h3><BulletList items={safeItems(content.personB.cautions)} /></div>
        </div>

        <h3>두 사람 사이에서 실제로 드러나기 쉬운 장면</h3>
        <div className="reference-scene-list">
          {safeItems(content.bondAndFriction.realLifeManifestations).map((item, index) => (
            <div key={`${index}-${item}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></div>
          ))}
        </div>
      </>}
    </Chapter>

    <Chapter
      index={3}
      eyebrow="YOUR LEVERAGE"
      title={`${personAName}이 ${personBName}에게 잘 통하는 방식`}
      intro="일반적인 내 장점이 아니라, 이 상대와의 조합에서 실제로 강점으로 작동하기 쉬운 부분과 과하게 쓰면 역효과가 나는 부분을 분리합니다."
      summary={chapterSummary(content, "ch3")}
    >
      {content.personalLeverage ? <>
        <div className="reference-top3 deep-leverage-top3">
          {content.personalLeverage.topStrengths.slice(0, 3).map((item, index) => <article key={`${index}-${item.title}`}>
            <span>TOP {index + 1}</span><h3>{item.title}</h3><p>{item.whyItWorks}</p><strong>{item.howToUse}</strong>
          </article>)}
        </div>

        <h3>상황별로 이렇게 말해보세요</h3>
        <div className="deep-conversation-grid">
          {content.personalLeverage.conversationScripts.map((script, index) => <article key={`${index}-${script.situation}`}>
            <small>{script.situation}</small>
            <p><strong>추천 표현</strong> “{script.say}”</p>
            <p><strong>피할 표현</strong> “{script.avoid}”</p>
          </article>)}
        </div>

        <h3>내 장점이 역효과가 되는 순간</h3>
        <div className="deep-backfire-list">
          {content.personalLeverage.backfireHabits.map((item, index) => <article key={`${index}-${item.habit}`}>
            <span>{String(index + 1).padStart(2, "0")}</span><div><h4>{item.habit}</h4><p>{item.correction}</p></div>
          </article>)}
        </div>
      </> : <>
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
            <BulletList items={safeItems(content.practicalManual.do.slice(0, 2))} />
          </div>
          <div>
            <h3>반대로 역효과가 날 수 있는 습관</h3>
            <BulletList items={safeItems(content.personA.cautions)} />
          </div>
        </div>
      </>}
    </Chapter>
  </>;
}
