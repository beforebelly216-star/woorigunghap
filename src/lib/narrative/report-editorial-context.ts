import type { OneToOneReportInput } from "@/lib/report-input";

export type ReportEditorialContext = {
  relationshipDurationMonths: number | null;
  userQuestion: string | null;
  userQuestionPolicy: "untrusted-reference-text";
};

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?<!\d)(?:\+?82[- .]?)?0?1[016789][- .]?\d{3,4}[- .]?\d{4}(?!\d)/g;
const DATE_PATTERN = /(?<!\d)(?:19|20)\d{2}(?:[-./년 ]\s*\d{1,2}(?:[-./월 ]\s*\d{1,2}일?)?|\d{4})(?!\d)/g;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceDisplayName(text: string, displayName: string, replacement: string) {
  const name = displayName.trim();
  if (!name || name.length < 2) return text;
  return text.replace(new RegExp(escapeRegExp(name), "gi"), replacement);
}

export function sanitizeUserQuestionForNarrative(
  raw: string | null | undefined,
  input: Pick<OneToOneReportInput, "personA" | "personB">,
) {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  let sanitized = trimmed.slice(0, 200);
  sanitized = replaceDisplayName(sanitized, input.personA.displayName, "{{SELF}}");
  sanitized = replaceDisplayName(sanitized, input.personB.displayName, "{{PARTNER}}");
  sanitized = sanitized
    .replace(EMAIL_PATTERN, "[이메일 제거]")
    .replace(PHONE_PATTERN, "[전화번호 제거]")
    .replace(DATE_PATTERN, "[날짜 제거]")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || null;
}

export function buildReportEditorialContext(input: OneToOneReportInput): ReportEditorialContext {
  return {
    relationshipDurationMonths: input.relationshipType === "crush"
      ? null
      : input.relationshipDurationMonths ?? null,
    userQuestion: sanitizeUserQuestionForNarrative(input.mostCurious, input),
    userQuestionPolicy: "untrusted-reference-text",
  };
}
