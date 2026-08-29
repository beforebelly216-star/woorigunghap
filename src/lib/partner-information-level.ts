import type { PersonBirthInput } from "@/lib/report-input";

const UNKNOWN_BIRTH_TIME_NOTICE = "출생시간이 입력되지 않아 시주는 제외하고 년·월·일 기준으로 해석합니다.";

export function birthTimeNoticeFromPerson(
  person: Pick<PersonBirthInput, "birthTimeKnown">,
) {
  return person.birthTimeKnown ? null : UNKNOWN_BIRTH_TIME_NOTICE;
}

export function birthTimeNoticeFromFacts(
  facts: { birthTimeKnown: boolean },
) {
  return facts.birthTimeKnown ? null : UNKNOWN_BIRTH_TIME_NOTICE;
}
