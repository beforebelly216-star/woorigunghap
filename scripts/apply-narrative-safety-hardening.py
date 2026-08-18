from pathlib import Path
import json

request_path = Path("src/lib/narrative/report-engine-v6-request.ts")
text = request_path.read_text()

old_duration = '''  const hasDurationContext = /"relationshipDurationMonths":\\d+/.test(userPrompt);
  if (
    hasDurationContext
    && /\\d+개월[\\s\\S]{0,120}(?:유지된 것은|유지해 온 것은|유지한 것 자체|증명합니다|조화가[^.\\n]{0,50}뜻)/.test(joined)
  ) {
    issues.push("DURATION_CAUSAL_OVERREACH");
  }
'''
new_duration = '''  const hasDurationContext = /"relationshipDurationMonths":\\d+/.test(userPrompt);
  if (
    hasDurationContext
    && /\\d+개월(?:간)?[\\s\\S]{0,150}(?:유지된 것은|유지해 온 것은|유지한 것 자체|지탱해 온 것은|증명합니다|뜻이기도|뜻입니다|보여줍니다|알고 있다는|조화가[^.\\n]{0,50}뜻)/.test(joined)
  ) {
    issues.push("DURATION_CAUSAL_OVERREACH");
  }

  if (label === "INTRO" && isPlainObject(value)) {
    const psychologyTerms = /(공감|감정|마음|애착|욕구|상처|불안|성욕|심리|의지력|표현 능력|유연함|적응 속도|신중함|배려심|진짜 생각|진정성)/;
    const hiddenStateTerms = /(무의식|내면|마음속|갈망|사랑받을 자격|심리 상태|진짜 생각|마음의 준비|의지가 (?:강|약)|욕구가 (?:강|약))/;
    for (const key of ["personA", "personB"] as const) {
      const person = value[key];
      if (!isPlainObject(person)) continue;
      const elementAnalysis = typeof person.elementAnalysis === "string" ? person.elementAnalysis : "";
      const overallProfile = typeof person.overallProfile === "string" ? person.overallProfile : "";
      const relationshipNeeds = typeof person.relationshipNeeds === "string" ? person.relationshipNeeds : "";
      const personLists = [person.strengths, person.cautions]
        .filter(Array.isArray)
        .flat()
        .filter((item): item is string => typeof item === "string")
        .join("\\n");
      if (psychologyTerms.test(elementAnalysis)) issues.push("ELEMENT_PSYCHOLOGY_OVERREACH");
      if (hiddenStateTerms.test(`${overallProfile}\\n${relationshipNeeds}\\n${personLists}`)) issues.push("MIND_READING_CERTAINTY");
    }
  }
'''
if old_duration not in text:
    raise SystemExit("duration block target not found")
text = text.replace(old_duration, new_duration, 1)

old_safety = '''  const segmentSafetyRule = args.label === "INTRO"
    ? [
        "[INTRO 필수 안전 규칙]",
        "personA.elementAnalysis와 personB.elementAnalysis에서는 오행의 상대적 강약·균형·보완 가능성만 설명하세요. 공감, 감정, 마음, 애착, 욕구, 상처, 불안, 성욕, 심리, 의지력 같은 심리 어휘를 사용하지 마세요.",
        "personA.overallProfile, personB.overallProfile, relationshipNeeds에서는 무의식, 내면, 마음속, 갈망, 사랑받을 자격, 심리 상태처럼 확인할 수 없는 내부 상태를 서술하지 마세요.",
        "확실히, 반드시, 무조건, 자동으로, 확률이 높다, 증명한다 같은 단정 표현을 사용하지 마세요.",
        "관찰 가능한 행동 가능성은 '그럴 수 있다', '확인해 볼 수 있다', '이런 장면에서 차이가 보일 수 있다'처럼 가설로 쓰고 확인 방법을 함께 제시하세요.",
      ].join("\\n")
    : "";
'''
new_safety = '''  const segmentSafetyRule = args.label === "INTRO"
    ? [
        "[INTRO 필수 안전 규칙]",
        "personA.elementAnalysis와 personB.elementAnalysis에서는 오행의 상대적 강약·균형·보완 가능성만 설명하세요. 공감, 감정, 마음, 애착, 욕구, 상처, 불안, 성욕, 심리, 의지력, 유연함, 적응 속도, 표현 능력 같은 사람의 능력·심리 어휘를 사용하지 마세요.",
        "personA.overallProfile, personB.overallProfile, relationshipNeeds, strengths, cautions에서는 무의식, 내면, 마음속, 갈망, 사랑받을 자격, 심리 상태, 진짜 생각, 마음의 준비처럼 확인할 수 없는 내부 상태를 서술하지 마세요.",
        "관계 기간은 현재 맥락일 뿐 사주 근거가 아닙니다. '26개월 유지했으니 이미 서로를 안다/조화가 증명됐다'처럼 기간에서 관계 품질을 추론하지 마세요.",
        "확실히, 반드시, 무조건, 자동으로, 확률이 높다, 증명한다 같은 단정 표현을 사용하지 마세요.",
        "관찰 가능한 행동 가능성은 '그럴 수 있다', '확인해 볼 수 있다', '이런 장면에서 차이가 보일 수 있다'처럼 가설로 쓰고 확인 방법을 함께 제시하세요.",
      ].join("\\n")
    : args.label === "DYNAMICS"
      ? [
          "[DYNAMICS 필수 안전 규칙]",
          "chemistry.elements에서는 오행의 상대적 균형과 두 사람 사이의 구조적 보완만 설명하세요. 공감, 감정, 마음, 애착, 욕구, 상처, 불안, 성욕, 심리, 의지력, 표현 능력 같은 심리·능력 어휘를 오행 강약과 연결하지 마세요.",
          "partnerDeepDive와 directionalImpact는 독심술이 아닙니다. 무의식, 내면, 마음속, 갈망, 진짜 속마음, 사랑받을 욕구, 존재감을 느낀다 같은 확인 불가능한 내부 상태를 쓰지 마세요. 관찰 가능한 반응 가능성과 확인 방법만 쓰세요.",
          "역할 공급도, 배우자 역할 점수, 유용신 적합도, 범위값, aRoleSupply, bRoleSupply, weightedPoints, maxPoints 같은 내부 지표명은 절대 출력하지 마세요. 서버 숫자는 쉬운 관계 언어로만 번역하세요.",
          "하루 N회, N시간 뒤, 주 N회, N일마다 같은 횟수·시간 처방은 만들지 마세요. 합의한 빈도, 감정이 가라앉은 뒤, 다음 대화 때처럼 행동 기준으로 쓰세요.",
          "확실히, 반드시, 무조건, 자동으로, 확률이 높다, 증명한다 같은 단정 표현을 사용하지 마세요.",
        ].join("\\n")
      : "";
'''
if old_safety not in text:
    raise SystemExit("segment safety target not found")
text = text.replace(old_safety, new_safety, 1)
request_path.write_text(text)

test_path = Path("scripts/one-to-one-quality-gate-test.ts")
test = test_path.read_text()
append = '''

const introArtifactLike = {
  overview: {
    headline: "샘플",
    detailedSummary: "26개월간 관계를 지탱해 온 것은 두 사람이 이미 기본적인 호응 패턴을 몸으로 알고 있다는 뜻이기도 합니다.",
  },
  personA: {
    overallProfile: "상대방에게 자신의 생각을 명확히 알리고 싶은 욕구가 강합니다.",
    elementAnalysis: "금의 강함은 명확한 의사 표현으로 드러나고, 물의 약함은 표면적 반응에 머물기 쉽다는 의미로 읽힙니다.",
    relationshipNeeds: "상대가 아직 마음의 준비가 안 된 상태를 살펴보세요.",
    strengths: ["관계를 지키려는 의지가 강합니다."],
    cautions: ["나무 기운의 부족함이 유연함을 줄일 수 있습니다."],
  },
  personB: {
    overallProfile: "자신의 진짜 생각을 드러내기까지 시간이 걸립니다.",
    elementAnalysis: "불의 약함은 감정을 즉각적으로 표현하는 에너지가 제한적일 수 있다는 의미입니다.",
    relationshipNeeds: "감정을 언어로 표현하는 연습이 필요합니다.",
    strengths: ["상대의 진정성을 감지하는 능력이 뛰어납니다."],
    cautions: ["마음에 쌓아 두지 마세요."],
  },
};
const introArtifactIssues = collectPaidNarrativeQualityIssues(
  introArtifactLike,
  "INTRO",
  '{"relationshipType":"lover","relationshipDurationMonths":26}',
);
assert.ok(introArtifactIssues.includes("ELEMENT_PSYCHOLOGY_OVERREACH"));
assert.ok(introArtifactIssues.includes("MIND_READING_CERTAINTY"));
assert.ok(introArtifactIssues.includes("DURATION_CAUSAL_OVERREACH"));
'''
if "const introArtifactLike" not in test:
    test += append
    test_path.write_text(test)

package_path = Path("package.json")
package_data = json.loads(package_path.read_text())
package_data["scripts"]["test:one-to-one:quality-gate"] = "tsx scripts/one-to-one-quality-gate-test.ts"
package_path.write_text(json.dumps(package_data, ensure_ascii=False, indent=2) + "\n")

workflow_path = Path(".github/workflows/manse-validation.yml")
workflow = workflow_path.read_text()
needle = "          npm run test:one-to-one:three-year-timing\n"
if "npm run test:one-to-one:quality-gate" not in workflow:
    if needle not in workflow:
        raise SystemExit("core workflow target not found")
    workflow = workflow.replace(needle, needle + "          npm run test:one-to-one:quality-gate\n", 1)
    workflow_path.write_text(workflow)
