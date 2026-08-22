import type { EnhancedDetailedReportContent } from "@/lib/narrative/report-deep-content";
import type { PaidReportFacts, PillarFact } from "@/lib/narrative/report-engine-v5";

function pillarLabel(pillar: PillarFact) {
  return pillar.hanja ? `${pillar.korean}(${pillar.hanja})` : pillar.korean;
}

function stripLegacyInternalLanguage(text: string) {
  return text
    .replace(/서버\s*(?:계산상|가\s*제공한|에서\s*제공한)\s*/g, "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

export function sanitizeStoredReportTextForPerson(text: string, dayPillar: PillarFact) {
  const label = pillarLabel(dayPillar);
  const labelSentence = `일주는 ${label}입니다`;

  return stripLegacyInternalLanguage(
    text
      .replace(
        /일주\s*(?:는|가)\s*(?:서버\s*계산상\s*)?일주\s*미확인(?:입니다|으로\s*표시됩니다|\s*상태입니다)?/g,
        labelSentence,
      )
      .replace(
        /(?:서버\s*계산상\s*)?일주\s*미확인(?:입니다|으로\s*표시됩니다|\s*상태입니다)?/g,
        labelSentence,
      ),
  );
}

function mapStrings(value: unknown, transform: (text: string) => string): unknown {
  if (typeof value === "string") return transform(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, transform));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, mapStrings(child, transform)]),
    );
  }
  return value;
}

export function normalizeStoredPaidReportForDisplay(
  content: EnhancedDetailedReportContent,
  facts: PaidReportFacts,
): EnhancedDetailedReportContent {
  const globallyClean = mapStrings(content, stripLegacyInternalLanguage) as EnhancedDetailedReportContent;
  return {
    ...globallyClean,
    personA: mapStrings(
      content.personA,
      (text) => sanitizeStoredReportTextForPerson(text, facts.A.pillars.day),
    ) as EnhancedDetailedReportContent["personA"],
    personB: mapStrings(
      content.personB,
      (text) => sanitizeStoredReportTextForPerson(text, facts.B.pillars.day),
    ) as EnhancedDetailedReportContent["personB"],
  };
}
