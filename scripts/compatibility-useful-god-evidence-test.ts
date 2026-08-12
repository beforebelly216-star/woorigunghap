import assert from "node:assert/strict";
import type { PersonBirthInput } from "../src/lib/report-input";
import { calculateManseSnapshot } from "../src/lib/manseryeok/engine";
import { buildUsefulGodPreparationEvidence } from "../src/lib/compatibility/useful-god-evidence";

function person(
  birthDate: string,
  birthTime: string | null,
): PersonBirthInput {
  return {
    displayName: "sample",
    gender: "male",
    calendarType: "solar",
    birthDate,
    birthTimeKnown: birthTime !== null,
    birthTime,
    isLeapMonth: false,
  };
}

const samples = [
  person("1984-06-15", "09:00"),
  person("1988-09-20", "16:00"),
  person("1990-05-15", "14:30"),
  person("1992-10-24", "05:30"),
  person("1995-11-11", "11:11"),
  person("1999-10-20", "10:25"),
  person("2000-06-10", "08:30"),
  person("2010-12-05", "18:00"),
  person("2020-04-20", "13:00"),
  person("2024-02-10", null),
];

const rows = samples.map((input) => {
  const snapshot = calculateManseSnapshot(input);
  const evidence = buildUsefulGodPreparationEvidence(input, snapshot);
  const repeated = buildUsefulGodPreparationEvidence(input, snapshot);

  assert.deepEqual(evidence, repeated, "같은 입력은 동일한 evidence를 반환해야 합니다.");
  assert.equal(evidence.status, "EVIDENCE_ONLY");
  assert.equal(evidence.scoringReady, false);
  assert.equal(evidence.methodDecision.selectedMethod, null);
  assert.deepEqual(evidence.methodDecision.usefulElements, []);
  assert.ok(evidence.methodDecision.pendingApprovals.length >= 6);
  assert.ok(evidence.branchHiddenStems.length >= 3);
  assert.ok(evidence.pillarsUsed.includes("day"));

  if (input.birthTimeKnown) {
    assert.equal(evidence.pillarsUsed.length, 4);
    assert.equal(evidence.monthCommand.status, "STABLE");
    assert.ok(evidence.monthCommand.commanderStem);
    assert.ok((evidence.monthCommand.allocationDay ?? 0) >= 1);
    assert.ok((evidence.monthCommand.allocationDay ?? 31) <= 30);
  } else {
    assert.equal(evidence.pillarsUsed.includes("hour"), false);
    assert.ok(
      evidence.monthCommand.status === "TIME_UNKNOWN_STABLE" ||
        evidence.monthCommand.status === "TIME_UNKNOWN_UNCERTAIN" ||
        evidence.monthCommand.status === "MONTH_PILLAR_UNCERTAIN",
    );
  }

  const visible = evidence.elementOccurrences.visibleStems;
  const hidden = evidence.elementOccurrences.hiddenStems;

  return {
    date: input.birthDate,
    time: input.birthTime ?? "unknown",
    dayMaster: `${evidence.dayMaster.stem}/${evidence.dayMaster.element}`,
    monthBranch: snapshot.pillars.month?.earthlyBranch ?? "?",
    commander: evidence.monthCommand.commanderStem ?? "?",
    commandStatus: evidence.monthCommand.status,
    exactRoots: evidence.rootEvidence.exactRootPositions.join(",") || "-",
    elementRoots: evidence.rootEvidence.elementRootPositions.join(",") || "-",
    visible: `W${visible.wood} F${visible.fire} E${visible.earth} M${visible.metal} A${visible.water}`,
    hidden: `W${hidden.wood} F${hidden.fire} E${hidden.earth} M${hidden.metal} A${hidden.water}`,
  };
});

console.table(rows);
console.log(`Useful-god preparation evidence validation passed: ${rows.length}/${rows.length} samples`);
