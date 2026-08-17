import type { DetailedReportContent } from "@/lib/narrative/report-engine-v5";
import { BulletList, Chapter, EvidenceBoundary, Paragraph } from "./report-v2-components";

export default function ReportChaptersB({
  content,
  personAName,
  personBName,
  relationshipLabel,
  hasUnknownBirthTime = false,
}: {
  content: DetailedReportContent;
  personAName: string;
  personBName: string;
  relationshipLabel: string;
  hasUnknownBirthTime?: boolean;
}) {
  return <>
    <Chapter
      index={4}
      eyebrow="RELATIONSHIP STRATEGY"
      title={`${relationshipLabel} 관계에서 통하는 전략`}
      intro="두 사람이 잘 맞는다는 말보다, 어떤 방식으로 연락하고 결정하고 표현해야 관계가 덜 소모되는지가 더 중요합니다."
      summary={[content.relationshipSpecific.overview, content.directionalImpact.asymmetry, ...content.practicalManual.do.slice(0, 1)]}
    >
      <Paragraph>{content.relationshipSpecific.overview}</Paragraph>
      <div className="v2-numbered">{content.relationshipSpecific.points.map((point, index) => <div key={`${index}-${point.title}`}><span>{String(index + 1).padStart(2, "0")}</span><section><h3>{point.title}</h3><p>{point.detail}</p></section></div>)}</div>
      <h3>서로 주고받는 힘의 방향</h3><Paragraph>{content.directionalImpact.asymmetry}</Paragraph>
    </Chapter>

    <Chapter
      index={5}
      eyebrow="RELATIONSHIP FLOW"
      title="관계가 가까워질수록 생기는 흐름"
      intro="현재 엔진이 근거를 가진 관계 역할·주도권·친밀도와 갈등 패턴만 다룹니다. 근거 없는 월별 운세나 사건 시점은 만들지 않습니다."
      summary={[content.relationshipFlow.roles, content.relationshipFlow.initiative, content.relationshipFlow.intimacy]}
    >
      <Paragraph>{content.relationshipFlow.overview}</Paragraph>
      <div className="v2-detail-grid"><div><h3>관계 역할</h3><p>{content.relationshipFlow.roles}</p></div><div><h3>주도권</h3><p>{content.relationshipFlow.initiative}</p></div><div><h3>가까워질수록</h3><p>{content.relationshipFlow.intimacy}</p></div></div>
      <h3>현실에서 반복되기 쉬운 갈등 장면</h3>
      <div className="v2-scenarios">{content.relationshipFlow.conflictScenarios.map((scenario, index) => <article key={`${index}-${scenario.situation}`}><span>SCENARIO {index + 1}</span><h4>{scenario.situation}</h4><p><strong>반복 패턴</strong>{scenario.likelyPattern}</p><p><strong>대응</strong>{scenario.response}</p></article>)}</div>
      <EvidenceBoundary>대운·세운의 월별 사건 시점은 아직 이 리포트의 확정 계산 근거에 포함되지 않습니다. 따라서 특정 월에 헤어진다거나 재회한다는 식의 예측은 표시하지 않습니다.</EvidenceBoundary>
    </Chapter>

    <Chapter
      index={6}
      eyebrow="CLOSENESS & CHEMISTRY"
      title={`${relationshipLabel}에서 느껴지는 친밀 케미와 거리감`}
      intro="끌림과 편안함은 한 방향으로만 생기지 않습니다. 서로를 묶는 신호와 부담을 주는 신호를 함께 봅니다."
      summary={[content.chemistry.overview, ...content.bondAndFriction.positiveInteractions.slice(0, 1), content.directionalImpact.bToA]}
    >
      <Paragraph>{content.chemistry.overview}</Paragraph>
      <div className="v2-two-column"><div><h3>둘을 붙잡아 주는 신호</h3><BulletList items={content.bondAndFriction.positiveInteractions} /></div><div><h3>거리를 만들 수 있는 신호</h3><BulletList items={content.bondAndFriction.frictionInteractions} /></div></div>
      <h3>{personBName} → {personAName}</h3><Paragraph>{content.directionalImpact.bToA}</Paragraph>
      <h3>친밀해졌을 때의 체감</h3><Paragraph>{content.relationshipFlow.intimacy}</Paragraph>
    </Chapter>

    <Chapter
      index={7}
      eyebrow="RISK MAP"
      title="앞으로 특히 관리해야 할 위험 신호"
      intro="미래 사건을 단정하지 않고, 현재 계산에서 반복될 가능성이 높은 마찰과 관계를 소모시키는 조건을 위험도로 정리합니다."
      summary={[content.strengthsAndRisks.redFlag, content.strengthsAndRisks.warning, content.directionalImpact.burdenSupply]}
    >
      <div className="v2-two-column"><div><h3>반복될 수 있는 마찰</h3><BulletList items={content.strengthsAndRisks.repeatedFrictions} /></div><div><h3>부담이 커지는 방향</h3><Paragraph>{content.directionalImpact.burdenSupply}</Paragraph></div></div>
      <div className="v2-warning"><strong>레드 플래그</strong><p>{content.strengthsAndRisks.redFlag}</p><strong>과장 없이 보면</strong><p>{content.strengthsAndRisks.warning}</p></div>
      <EvidenceBoundary>이 장은 이별·결혼·재회 같은 사건을 예언하는 장이 아닙니다. 두 사람의 현재 궁합 근거에서 반복되기 쉬운 관계 리스크를 행동 단위로 읽습니다.</EvidenceBoundary>
    </Chapter>

    <Chapter
      index={8}
      eyebrow="ACTION PLAN"
      title="지금 바로 써먹는 관계 실행 플랜"
      intro="해석을 읽고 끝내지 않도록, 오늘부터 적용할 행동과 갈등이 생겼을 때의 순서를 한 장에 모았습니다."
      summary={[...content.practicalManual.do.slice(0, 2), ...content.practicalManual.dont.slice(0, 1)]}
    >
      <div className="v2-two-column"><div><h3>이렇게 해보세요</h3><BulletList items={content.practicalManual.do} /></div><div><h3>이건 피하세요</h3><BulletList items={content.practicalManual.dont} /></div></div>
      <h3>갈등이 생겼을 때 순서</h3><div className="v2-protocol">{content.practicalManual.conflictProtocol.map((item, index) => <div key={`${index}-${item}`}><span>{index + 1}</span><p>{item}</p></div>)}</div>
      <h3>함께 하기 좋은 활동</h3><BulletList items={content.practicalManual.recommendedActivities} />
    </Chapter>

    <Chapter
      index={9}
      eyebrow="EVIDENCE & LIMITS"
      title="이 리포트를 어디까지 믿고 보면 좋은가"
      intro="점수와 명리 계산은 서버 엔진이 고정하고, AI는 그 계산 결과를 읽기 쉬운 문장으로 풀어씁니다. 저장된 구매 결과를 다시 열 때 계산이나 AI를 다시 실행하지 않습니다."
      summary={[content.directionalImpact.overview, content.strengthsAndRisks.warning, hasUnknownBirthTime ? "출생시간 미상에 따른 불확실성 범위를 함께 반영했습니다." : "두 사람 모두 입력된 출생시간을 계산에 반영했습니다."]}
    >
      <h3>양방향 영향은 따로 계산해 읽습니다</h3><Paragraph>{content.directionalImpact.overview}</Paragraph>
      <h3>확정적으로 말하지 않는 영역</h3><Paragraph>{content.strengthsAndRisks.warning}</Paragraph>
      <EvidenceBoundary>{hasUnknownBirthTime
        ? "한 명 이상 출생시간이 입력되지 않아 가능한 시주 시나리오를 함께 비교한 결과입니다. 화면 상단의 점수 범위를 함께 보세요."
        : "두 사람 모두 입력된 출생시간을 반영했습니다. 그래도 궁합은 관계를 결정하는 판정문이 아니라, 반복 패턴과 대응 방식을 이해하기 위한 참고 자료입니다."}</EvidenceBoundary>
    </Chapter>
  </>;
}
