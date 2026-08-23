import type { PersonBirthInput } from "@/lib/report-input";
import { calculateManseSnapshot } from "@/lib/manseryeok/engine";
import { getDayPillarCharacter } from "@/lib/narrative/day-pillar-characters";
import {
  FREE_SELF_ANALYSIS_VERSION,
  type FreeSelfAnalysisResult,
} from "@/lib/free-self-analysis-contract";

export function buildFreeSelfAnalysis(person: PersonBirthInput): FreeSelfAnalysisResult {
  const snapshot = calculateManseSnapshot(person);
  const dayPillar = snapshot.pillars.day.korean;
  const character = getDayPillarCharacter(dayPillar);

  if (!character) {
    throw new Error("무료 관계 성향을 구성할 일주 캐릭터를 찾지 못했습니다.");
  }

  return {
    version: FREE_SELF_ANALYSIS_VERSION,
    displayName: person.displayName.trim() || "나",
    dayPillar,
    archetypeTitle: character.title.replace(`${character.pillar} · `, ""),
    tagline: character.tagline,
    insights: [
      {
        key: "relationship_strength",
        label: "관계에서 먼저 보이는 강점",
        body: character.strengths[0],
      },
      {
        key: "social_radar",
        label: "사람을 읽는 장면",
        body: character.strengths[1],
      },
      {
        key: "friction_pattern",
        label: "관계가 꼬일 때",
        body: character.watchOut,
      },
      {
        key: "relationship_rhythm",
        label: "잘 맞는 관계 리듬",
        body: character.relationshipCue,
      },
    ],
    accuracyNote: person.birthTimeKnown
      ? null
      : "출생시간을 몰라도 일주 중심 관계 성향은 볼 수 있어요. 실제 궁합에서는 상대 정보 수준에 맞춰 해석 범위를 따로 표시합니다.",
  };
}
