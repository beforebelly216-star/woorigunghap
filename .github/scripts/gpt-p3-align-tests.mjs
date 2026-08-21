import { readFileSync, writeFileSync } from "node:fs";

function update(path, pairs) {
  let source = readFileSync(path, "utf8");
  let changed = false;
  for (const [from, to] of pairs) {
    if (source.includes(from)) {
      source = source.replaceAll(from, to);
      changed = true;
    }
  }
  if (changed) writeFileSync(path, source);
}

const keyPairs = [
  ["assert.match(v7Engine, /strongest: value\\.elementBalance\\.strongest/);", "assert.match(v7Engine, /dominantElements: value\\.elementBalance\\.strongest/);"],
  ["assert.match(v7Engine, /weakest: value\\.elementBalance\\.weakest/);", "assert.match(v7Engine, /lighterElements: value\\.elementBalance\\.weakest/);"],
  ["assert.match(engine, /strongest: value\\.elementBalance\\.strongest/);", "assert.match(engine, /dominantElements: value\\.elementBalance\\.strongest/);"],
  ["assert.match(engine, /weakest: value\\.elementBalance\\.weakest/);", "assert.match(engine, /lighterElements: value\\.elementBalance\\.weakest/);"],
  ["assert.match(paidEngine, /strongest: value\\.elementBalance\\.strongest/);", "assert.match(paidEngine, /dominantElements: value\\.elementBalance\\.strongest/);"],
  ["assert.match(paidEngine, /weakest: value\\.elementBalance\\.weakest/);", "assert.match(paidEngine, /lighterElements: value\\.elementBalance\\.weakest/);"],
];

update("scripts/day9-narrative-boundary-test.ts", [
  ...keyPairs,
  ["assert.match(v7Engine, /오행을 심리 능력의 원인으로 쓰는 문장은 금지/);", "assert.match(v7Engine, /오행의 강약·부족·우세를 공감 능력/);"],
  ["assert.match(v7Engine, /정확한 오행 비율·신강 점수·겉오행 개수 일부가 의도적으로 제공되지 않습니다/);", "assert.match(v7Engine, /계산값이 없는 숫자나 비율도 만들지 마세요/);"],
  ["assert.match(v7Engine, /대운·세운·특정 연도·월의 관계 타이밍은 작성하지 마세요/);", "assert.match(v7Engine, /전용 계산 근거가 없는 본문에서 새로 만들지 마세요/);"],
]);

update("scripts/day10-editorial-policy-test.ts", [
  ...keyPairs,
  ["assert.match(engine, /친한 상담가가 핵심을 또렷하게 짚어 주는 어조/);", "assert.match(engine, /핵심 결론을 먼저 말합니다/);"],
  ["assert.match(engine, /계산상 나타나는 경향과 두 사람이 확인할 행동 신호를 구분/);", "assert.match(engine, /계산된 관계 신호가 가리키는 반응 패턴은 결론형으로 분명하게/);"],
  ["assert.match(engine, /상대 분석은 독심술이 아니라/);", "assert.match(engine, /내부 심리 원인을 사실처럼 발명하지 마세요/);"],
  ["assert.match(engine, /서버가 제공하지 않은 심리 원인/);", "assert.match(engine, /내부 심리 원인을 사실처럼 발명하지 마세요/);"],
  ["assert.match(engine, /오행을 심리 능력의 원인으로 쓰는 문장은 금지/);", "assert.match(engine, /오행의 강약·부족·우세를 공감 능력/);"],
  ["assert.match(engine, /정확한 오행 비율·신강 점수·겉오행 개수 일부가 의도적으로 제공되지 않습니다/);", "assert.match(engine, /계산값이 없는 숫자나 비율도 만들지 마세요/);"],
]);

update("scripts/day21-relationship-editorial-test.ts", [
  ...keyPairs,
  ["assert.match(engine, /정확한 오행 비율·신강 점수·겉오행 개수 일부가 의도적으로 제공되지 않습니다/);", "assert.match(engine, /계산값이 없는 숫자나 비율도 만들지 마세요/);"],
  ["assert.match(engine, /오행을 심리 능력의 원인으로 쓰는 문장은 금지/);", "assert.match(engine, /오행의 강약·부족·우세를 공감 능력/);"],
]);

update("scripts/day23-system-qa-test.ts", [
  ...keyPairs,
  ["assert.match(paidEngine, /정확한 오행 비율·신강 점수·겉오행 개수 일부가 의도적으로 제공되지 않습니다/);", "assert.match(paidEngine, /계산값이 없는 숫자나 비율도 만들지 마세요/);"],
  ["assert.match(paidEngine, /오행을 심리 능력의 원인으로 쓰는 문장은 금지/);", "assert.match(paidEngine, /오행의 강약·부족·우세를 공감 능력/);"],
]);

console.log("P3 legacy contracts aligned");
