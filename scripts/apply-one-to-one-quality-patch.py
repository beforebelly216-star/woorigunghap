from pathlib import Path
import json

request_path = Path("src/lib/narrative/report-engine-v6-request.ts")
request_text = request_path.read_text()
old_gate = '''function hasElementPsychologyOverreach(text: string) {
  const element = "(?:목|화|토|금|수|나무|불|흙|금속|물|오행)";
  const psychology = "(?:공감(?:\\s*능력)?|감정(?:\\s*표현)?|불안(?:감)?|애착|사랑|마음|표현\\s*능력|상처|성욕|의지력?|심리|욕구)";
  return new RegExp(`${element}.{0,100}${psychology}|${psychology}.{0,100}${element}`, "s").test(text);
}
'''
new_gate = '''function hasElementPsychologyOverreach(text: string) {
  const element = "(?:목|화|토|금|수|나무|불|흙|금속|물|오행)";
  const psychology = "(?:공감(?:\\s*능력)?|감정(?:\\s*표현)?|불안(?:감)?|애착|사랑|마음|표현\\s*능력|상처|성욕|의지력?|심리|욕구)";
  const imbalance = "(?:약(?:해|해서|하니|한)|부족(?:해|해서|하니|한)|적(?:어|어서|으니|은)|강(?:해|해서|하니|한)|많(?:아|아서|으니|은)|과다(?:해|해서|한)|우세(?:해|해서|한))";
  const causal = "(?:때문(?:에|이다)?|그래서|따라서|결과(?:로)?|원인(?:이|으로)?|이므로|라서|해서|하여)";
  const safeNegation = /(?:뜻|의미)하지\\s*않|(?:뜻|의미)하는\\s*것은\\s*아니|단정할\\s*수\\s*없|연결하지\\s*않|판단하지\\s*않|1:1로\\s*대응하지\\s*않/;
  const directAttribution = new RegExp(`${element}(?:이|가|은|는)?[^.\\n!?]{0,45}${imbalance}[^.\\n!?]{0,55}${psychology}|${psychology}[^.\\n!?]{0,55}${element}(?:이|가|은|는)?[^.\\n!?]{0,45}${imbalance}`);
  const explicitCausality = new RegExp(`${element}[^.\\n!?]{0,65}${causal}[^.\\n!?]{0,65}${psychology}|${psychology}[^.\\n!?]{0,65}${causal}[^.\\n!?]{0,65}${element}`);
  return text
    .split(/[.\\n!?]+/)
    .some((sentence) => {
      const clause = sentence.trim();
      if (!clause || safeNegation.test(clause)) return false;
      return directAttribution.test(clause) || explicitCausality.test(clause);
    });
}
'''
if old_gate not in request_text:
    raise SystemExit("quality gate target not found")
request_text = request_text.replace(old_gate, new_gate)
old_retry = "계산 근거와 관찰 가능한 행동만 사용하고, 숨은 마음·미래 연도·내부 지표·과도한 이름 반복·단정 표현·오행과 심리 능력의 1:1 대응·서버 근거 없는 횟수나 시간 처방을 제거하세요. 관계 기간은 맥락일 뿐 궁합의 증거로 해석하지 마세요."
new_retry = "계산 근거와 관찰 가능한 행동만 사용하고, 숨은 마음·미래 연도·내부 지표·과도한 이름 반복·단정 표현·오행과 심리 능력의 1:1 대응·서버 근거 없는 횟수나 시간 처방을 제거하세요. 특히 오행 강약을 설명하는 문장에서는 공감·감정·마음·애착·욕구·상처 같은 심리 어휘를 함께 쓰지 말고 구조적 균형과 보완 가능성만 설명하세요. 관계 기간은 맥락일 뿐 궁합의 증거로 해석하지 마세요."
if old_retry not in request_text:
    raise SystemExit("retry instruction target not found")
request_path.write_text(request_text.replace(old_retry, new_retry))

engine_path = Path("src/lib/narrative/report-engine-v7.ts")
engine_text = engine_path.read_text()
anchor = '  "\'목이 약해서 공감이 부족하다\', \'화가 적어서 감정을 못 표현한다\', \'수가 강해서 상처를 오래 품는다\'처럼 오행을 심리 능력의 원인으로 쓰는 문장은 금지합니다.",\n'
addition = anchor + '  "elementAnalysis에서는 공감·감정·마음·애착·욕구·상처 같은 심리 어휘 자체를 사용하지 말고, 오행의 상대적 균형·과잉·보완 가능성만 설명하세요. 심리·관계 행동은 다른 서버 evidence가 있을 때 별도 문장으로 분리하세요.",\n'
if anchor not in engine_text:
    raise SystemExit("base rule target not found")
engine_path.write_text(engine_text.replace(anchor, addition, 1))

test_path = Path("scripts/one-to-one-quality-gate-test.ts")
test_path.write_text('''import assert from "node:assert/strict";\nimport { collectPaidNarrativeQualityIssues } from "../src/lib/narrative/report-engine-v6-request";\n\nfunction issues(text: string) {\n  return collectPaidNarrativeQualityIssues({ sample: text }, "TEST");\n}\n\nconst unsafe = [\n  "목이 약해서 공감 능력이 부족합니다.",\n  "화가 적어서 감정을 잘 표현하지 못합니다.",\n  "수가 강해서 상처를 오래 품는 편입니다.",\n  "공감 능력이 부족한 것은 목이 약하기 때문입니다.",\n];\nfor (const sample of unsafe) {\n  assert.ok(issues(sample).includes("ELEMENT_PSYCHOLOGY_OVERREACH"), `must reject: ${sample}`);\n}\n\nconst safe = [\n  "오행은 심리 기능과 1:1로 대응하지 않습니다.",\n  "목이 약하다는 구조 신호가 있지만 공감 능력 부족을 뜻하지 않습니다.",\n  "오행의 상대적 균형은 관계에서 보완 지점을 살피는 참고 신호입니다. 감정 상태는 별도로 확인해야 합니다.",\n  "화가 상대적으로 적습니다. 이 사실만으로 감정 표현 능력을 판단하지 않습니다.",\n];\nfor (const sample of safe) {\n  assert.ok(!issues(sample).includes("ELEMENT_PSYCHOLOGY_OVERREACH"), `must allow: ${sample}`);\n}\n\nconsole.log("one-to-one quality gate regression: PASS");\n''')

package_path = Path("package.json")
package_data = json.loads(package_path.read_text())
package_data.setdefault("scripts", {})["test:one-to-one:quality-gate"] = "tsx scripts/one-to-one-quality-gate-test.ts"
package_path.write_text(json.dumps(package_data, ensure_ascii=False, indent=2) + "\n")

workflow_path = Path(".github/workflows/manse-validation.yml")
workflow_text = workflow_path.read_text()
needle = "          npm run test:one-to-one:three-year-timing\n"
if needle not in workflow_text:
    raise SystemExit("validation workflow target not found")
workflow_path.write_text(workflow_text.replace(needle, needle + "          npm run test:one-to-one:quality-gate\n", 1))
