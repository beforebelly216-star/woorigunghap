import type { ThreeYearTimingAssessment, TimingConfidence, TimingPhase } from "@/lib/compatibility/timing-alignment";
import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import { getRelationshipEditorialProfileByLabel } from "@/lib/relationship-editorial";
import { BulletList, Chapter, EvidenceBoundary, Paragraph } from "./report-v2-components";

function itemAt(items: string[], index: number, fallback: string) {
  return items[index] ?? items[0] ?? fallback;
}

const TIMING_PHASE_LABEL: Record<TimingPhase, string> = {
  rising: "상승",
  adjusting: "조율",
  caution: "주의",
};

const TIMING_CONFIDENCE_LABEL: Record<TimingConfidence, string> = {
  high: "높은 신뢰도",
  medium: "범위 해석",
  low: "넓은 범위 해석",
};

export default function ReportChaptersB({
  content,
  personAName,
  personBName,
  relationshipLabel,
  threeYearTiming,
}: {
  content: EnhancedDetailedReportContent;
  personAName: string;
  personBName: string;
  relationshipLabel: string;
  threeYearTiming?: ThreeYearTimingAssessment;
}) {
  const editorial = getRelationshipEditorialProfileByLabel(relationshipLabel);
  const thirtyDayPlan = content.actionPlan30?.weeks.length
    ? content.actionPlan30.weeks.map((item) => ({
      week: `${item.week}주차`,
      goal: item.goal,
      action: item.action,
      check: item.check,
    }))
    : [
      {
        week: "1주차",
        goal: "관계의 기본 리듬 관찰",
        action: itemAt(content.practicalManual.do, 0, content.relationshipFlow.overview),
        check: "상대의 반응과 내 체감이 전보다 편해졌는지 확인하세요.",
      },
      {
        week: "2주차",
        goal: "잘 통하는 방식 한 가지 반복",
        action: itemAt(content.practicalManual.do, 1, content.directionalImpact.beneficialSupply),
        check: "같은 행동을 반복했을 때 관계의 부담이 줄었는지 확인하세요.",
      },
      {
        week: "3주차",
        goal: "마찰이 생길 때 대응 순서 바꾸기",
        action: itemAt(content.practicalManual.conflictProtocol, 0, content.strengthsAndRisks.warning),
        check: "갈등 뒤 회복 시간이 짧아졌는지 확인하세요.",
      },
      {
        week: "4주차",
        goal: "둘에게 맞는 좋은 경험 만들기",
        action: itemAt(content.practicalManual.recommendedActivities, 0, content.chemistry.overview),
        check: "둘 다 억지 없이 편하게 참여했는지 확인하세요.",
      },
    ];

  return <>
    <Chapter
      index={4}
      eyebrow="RELATIONSHIP STRATEGY"
      title={editorial.ui.strategyTitle}
      intro={editorial.ui.strategyIntro}
      summary={[content.relationshipSpecific.overview, content.situationStrategy?.priority ?? content.directionalImpact.asymmetry, ...content.practicalManual.do.slice(0, 1)]}
    >
      <div className="reference-strategy-lead">
        <span>{relationshipLabel} 전용 해석</span>
        <Paragraph>{content.relationshipSpecific.overview}</Paragraph>
      </div>

      {content.situationStrategy ? <>
        <div className="deep-strategy-priority">
          <small>지금 가장 먼저 볼 것</small>
          <strong>{content.situationStrategy.priority}</strong>
        </div>
        <div className="deep-strategy-steps">
          {content.situationStrategy.stepByStep.map((item, index) => <article key={`${index}-${item.step}`}>
            <span>STEP {index + 1}</span>
            <div><h3>{item.step}</h3><p>{item.action}</p><small>확인할 신호 · {item.watchFor}</small></div>
          </article>)}
        </div>
        <div className="deep-strategy-signals">
          <article><small>PROGRESS</small><h3>다음 단계로 가도 되는 신호</h3><BulletList items={content.situationStrategy.progressSignals} /></article>
          <article><small>STOP / SLOW DOWN</small><h3>속도를 줄여야 하는 신호</h3><BulletList items={content.situationStrategy.stopSignals} /></article>
        </div>
      </> : null}

      <h3>관계 유형별 세부 포인트</h3>
      <div className="v2-numbered reference-strategy-points">
        {content.relationshipSpecific.points.map((point, index) => <div key={`${index}-${point.title}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <section><h3>{point.title}</h3><p>{point.detail}</p></section>
        </div>)}
      </div>

      <div className="reference-focus-box">
        <small>관계에서 힘이 오가는 방향</small>
        <strong>{content.directionalImpact.asymmetry}</strong>
        <p>{content.directionalImpact.overview}</p>
      </div>
    </Chapter>

    <Chapter
      index={5}
      eyebrow="RELATIONSHIP FLOW & 3-YEAR TIMING"
      title={editorial.ui.flowTitle}
      intro={threeYearTiming
        ? `${threeYearTiming.baseYear}년부터 3개 연도의 세운과 두 사람의 대운 후보를 함께 계산해 관계 흐름을 봅니다. 출생시간 미상은 단일 날짜를 확정하지 않고 범위로 표시합니다.`
        : "현재 계산으로 확인할 수 있는 관계 역할·주도권·친밀도와 반복 갈등을 중심으로 봅니다. 저장된 구버전 결과에는 3년 타이밍 계산이 없을 수 있습니다."}
      summary={[content.relationshipFlow.roles, content.relationshipFlow.initiative, content.relationshipFlow.intimacy]}
    >
      <Paragraph>{content.relationshipFlow.overview}</Paragraph>
      <div className="reference-flow-grid">
        <article><small>ROLE</small><h3>관계 역할</h3><p>{content.relationshipFlow.roles}</p></article>
        <article><small>INITIATIVE</small><h3>주도권</h3><p>{content.relationshipFlow.initiative}</p></article>
        <article><small>CLOSENESS</small><h3>가까워질수록</h3><p>{content.relationshipFlow.intimacy}</p></article>
      </div>

      {threeYearTiming ? <>
        <div className="reference-timing-summary">
          <small>3-YEAR TIMING SCORE</small>
          <strong>{Math.round(threeYearTiming.normalizedScore)}점</strong>
          <p>
            세 해의 대운·세운 신호 평균입니다. 전체 범위는 {Math.round(threeYearTiming.scoreRange.min)}~{Math.round(threeYearTiming.scoreRange.max)}점 · {TIMING_CONFIDENCE_LABEL[threeYearTiming.confidence]}입니다.
          </p>
        </div>
        <div className="reference-year-timing-grid">
          {threeYearTiming.years.map((year) => <article key={year.year} className={`timing-${year.phase}`}>
            <div className="reference-year-timing-head">
              <span>{year.year}년 · {year.annualPillar}</span>
              <strong>{TIMING_PHASE_LABEL[year.phase]}</strong>
            </div>
            <div className="reference-year-score">
              <b>{Math.round(year.score)}</b><small>점</small>
              {year.scoreRange.min !== year.scoreRange.max
                ? <em>{Math.round(year.scoreRange.min)}~{Math.round(year.scoreRange.max)}</em>
                : null}
            </div>
            <ul>{year.signals.map((signal, index) => <li key={`${year.year}-${index}`}>{signal}</li>)}</ul>
            <p className="reference-year-confidence">{TIMING_CONFIDENCE_LABEL[year.confidence]}</p>
          </article>)}
        </div>
        <EvidenceBoundary>연도별 점수는 대운·세운의 오행 보완 관계와 일지 합·충·해·형 신호를 규칙 기반으로 합산한 참고 지표입니다. ‘상승’은 사건 발생을 약속하는 표현이 아니라 관계에 에너지를 쓰기 상대적으로 수월한 구간을 뜻합니다. 특정 월·날짜 예측은 아직 포함하지 않습니다.</EvidenceBoundary>
      </> : <EvidenceBoundary>이 결과는 3년 타이밍 계산 도입 이전에 저장된 버전일 수 있습니다. 현재 새 계산에서는 대운·세운 근거가 있는 연도 단위 흐름을 추가로 제공합니다.</EvidenceBoundary>}

      <h3>현실에서 반복되기 쉬운 갈등 장면</h3>
      <div className="v2-scenarios">{content.relationshipFlow.conflictScenarios.map((scenario, index) => <article key={`${index}-${scenario.situation}`}>
        <span>SCENARIO {index + 1}</span>
        <h4>{scenario.situation}</h4>
        <p><strong>반복 패턴</strong>{scenario.likelyPattern}</p>
        <p><strong>끊는 방법</strong>{scenario.response}</p>
      </article>)}</div>
    </Chapter>

    <Chapter
      index={6}
      eyebrow="CLOSENESS & CHEMISTRY"
      title={editorial.ui.closenessTitle}
      intro="친밀감은 ‘잘 맞는다/안 맞는다’ 한 줄로 끝나지 않습니다. 가까워지는 속도, 편안함, 부담이 되는 신호를 같이 봅니다."
      summary={[content.chemistry.overview, ...content.bondAndFriction.positiveInteractions.slice(0, 1), content.directionalImpact.bToA]}
    >
      <div className="reference-closeness-lead">
        <small>두 사람의 거리감 리듬</small>
        <Paragraph>{content.chemistry.overview}</Paragraph>
      </div>
      <div className="v2-two-column">
        <div><h3>둘을 붙잡아 주는 신호</h3><BulletList items={content.bondAndFriction.positiveInteractions} /></div>
        <div><h3>거리를 만들 수 있는 신호</h3><BulletList items={content.bondAndFriction.frictionInteractions} /></div>
      </div>
      <div className="reference-focus-box">
        <small>{personBName} → {personAName}</small>
        <strong>{content.directionalImpact.bToA}</strong>
        <p>{content.relationshipFlow.intimacy}</p>
      </div>
    </Chapter>

    <Chapter
      index={7}
      eyebrow="FUTURE CONDITIONS"
      title="이 관계의 미래를 가르는 조건"
      intro="결혼·이별 시점을 예언하는 대신, 이 조합이 장기적으로 좋아지는 조건과 반대로 소모되기 쉬운 조건을 나눠 봅니다."
      summary={[content.strengthsAndRisks.strengths[0], content.strengthsAndRisks.redFlag, content.strengthsAndRisks.warning]}
    >
      <div className="reference-future-split">
        <article className="is-positive">
          <small>KEEP BUILDING</small>
          <h3>이 관계가 더 좋아지는 쪽</h3>
          <BulletList items={content.strengthsAndRisks.strengths} />
          <Paragraph>{content.directionalImpact.beneficialSupply}</Paragraph>
        </article>
        <article className="is-caution">
          <small>WATCH THIS</small>
          <h3>관계를 소모시키기 쉬운 쪽</h3>
          <BulletList items={content.strengthsAndRisks.repeatedFrictions} />
          <Paragraph>{content.directionalImpact.burdenSupply}</Paragraph>
        </article>
      </div>

      <div className="v2-warning">
        <strong>반복되면 점검해야 할 신호</strong><p>{content.strengthsAndRisks.redFlag}</p>
        <strong>과장 없이 해석하면</strong><p>{content.strengthsAndRisks.warning}</p>
      </div>

      <EvidenceBoundary>이 장은 관계 결과를 확정하는 예언이 아닙니다. 실제 대화와 행동에서 어떤 패턴이 반복되는지 확인하는 장기 관계 체크포인트입니다.</EvidenceBoundary>
    </Chapter>

    <Chapter
      index={8}
      eyebrow="30-DAY ACTION PLAN"
      title={editorial.ui.actionTitle}
      intro={content.actionPlan30
        ? "이번 달에 실제로 실행할 수 있도록 새 리포트가 1~4주차 목표·행동·확인 기준을 각각 작성했습니다."
        : "기존 저장 리포트는 실전 조언을 4주 실행 순서로 재배치해 보여드립니다."}
      summary={[...content.practicalManual.do.slice(0, 2), ...content.practicalManual.dont.slice(0, 1)]}
    >
      <div className="reference-30day-grid">
        {thirtyDayPlan.map((item) => <article key={item.week}>
          <span>{item.week}</span>
          <h3>{item.goal}</h3>
          <p>{item.action}</p>
          <small className="deep-week-check">확인 · {item.check}</small>
        </article>)}
      </div>

      <div className="v2-two-column">
        <div><h3>이번 달에 반복하면 좋은 것</h3><BulletList items={content.practicalManual.do} /></div>
        <div><h3>이번 달에 특히 피할 것</h3><BulletList items={content.actionPlan30?.monthlyDont ?? content.practicalManual.dont} /></div>
      </div>

      <h3>갈등이 생겼을 때 순서</h3>
      <div className="v2-protocol">{content.practicalManual.conflictProtocol.map((item, index) => <div key={`${index}-${item}`}><span>{index + 1}</span><p>{item}</p></div>)}</div>
      <h3>{relationshipLabel === "직장동료" ? "함께 일하기 좋은 방식" : "함께 하기 좋은 활동"}</h3>
      <BulletList items={content.practicalManual.recommendedActivities} />
    </Chapter>

    <Chapter
      index={9}
      eyebrow="EVIDENCE & LIMITS"
      title="이 리포트를 어디까지 믿고 보면 좋은가"
      intro="점수와 명리 계산은 서버 엔진이 고정하고, AI는 그 계산 결과를 읽기 쉬운 문장으로만 풀어씁니다."
      summary={[content.directionalImpact.overview, content.strengthsAndRisks.warning, "출생시간 미상인 경우 화면 상단의 불확실성 점수 범위를 함께 확인하세요."]}
    >
      <h3>양방향 영향은 따로 계산해 읽습니다</h3><Paragraph>{content.directionalImpact.overview}</Paragraph>
      <h3>확정적으로 말하지 않는 영역</h3><Paragraph>{content.strengthsAndRisks.warning}</Paragraph>
      <EvidenceBoundary>궁합은 관계를 결정하는 판정문이 아니라 반복 패턴과 대응 방식을 이해하기 위한 참고 자료입니다. 출생시간이 입력되지 않은 사람이 있다면 화면 상단에 표시되는 시주 시나리오와 점수 범위를 함께 보세요.</EvidenceBoundary>
    </Chapter>
  </>;
}
