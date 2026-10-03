import { calculateOneToOneCompatibility } from "@/lib/compatibility/engine";
import { getCompatibilityGrade } from "@/lib/compatibility/score-scale";
import { RELATIONSHIP_NETWORK_DIMENSION_LABELS } from "@/lib/relationship-network-contract";
import { parseOneToOneReportInput, validateOneToOneReportInput, RELATIONSHIP_LABELS } from "@/lib/report-input";

export class TossBasicInputError extends Error {
  constructor(public readonly fieldErrors: Record<string,string>) { super("invalid_basic_input"); }
}

// Pure calculation; no payment, AI, account storage or network access.
export function calculateTossBasicResult(value: unknown) {
  const input = parseOneToOneReportInput(value);
  if (!input) throw new TossBasicInputError({input:"입력 형식을 확인해 주세요."});
  const validation = validateOneToOneReportInput(input,{requireCoworkerHierarchy:true});
  if (!validation.valid) throw new TossBasicInputError(validation.errors);
  const snapshot = calculateOneToOneCompatibility(input);
  const labels = RELATIONSHIP_NETWORK_DIMENSION_LABELS;
  const dimensions = Object.entries(snapshot.dimensions).filter(([,data])=>data.maxPoints>0)
    .map(([id,data])=>({id,label:labels[id as keyof typeof labels],score:data.normalizedScore}));
  return {
    schemaVersion:"toss-basic-v1" as const,
    engineVersion:snapshot.engineVersion, scoringVersion:snapshot.scoringVersion,
    relationshipType:input.relationshipType,relationshipLabel:RELATIONSHIP_LABELS[input.relationshipType],
    names:[input.personA.displayName.trim(),input.personB.displayName.trim()],
    score:snapshot.score,grade:getCompatibilityGrade(snapshot.score),
    scoreRange:{min:snapshot.uncertaintyRange.min,max:snapshot.uncertaintyRange.max},
    timeUnknown:!input.personA.birthTimeKnown || !input.personB.birthTimeKnown,
    dimensions,
    strengths:snapshot.strengths.filter(id=>snapshot.dimensions[id].maxPoints>0).map(id=>({id,label:labels[id]})),
    adjustments:snapshot.adjustmentPoints.filter(id=>snapshot.dimensions[id].maxPoints>0).map(id=>({id,label:labels[id]})),
  };
}

export const TOSS_BASIC_SAMPLE_INPUT = {
  relationshipType:"friend",
  personA:{displayName:"하늘",gender:"male",calendarType:"solar",birthDate:"1990-05-15",birthTimeKnown:true,birthTime:"14:30",isLeapMonth:false},
  personB:{displayName:"바다",gender:"female",calendarType:"solar",birthDate:"1992-10-24",birthTimeKnown:true,birthTime:"05:30",isLeapMonth:false},
};
