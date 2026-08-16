import type { OneToManyCandidateId } from "./one-to-many";
import type { OneToManyReportInput } from "@/lib/report-input";

export const ONE_TO_MANY_DEMO_INPUT: OneToManyReportInput = {
  relationshipType: "lover",
  referencePerson: {
    displayName: "나",
    gender: "male",
    calendarType: "solar",
    birthDate: "1990-05-15",
    birthTimeKnown: true,
    birthTime: "14:30",
    isLeapMonth: false,
  },
  candidates: [
    {
      displayName: "민서",
      gender: "female",
      calendarType: "solar",
      birthDate: "1992-10-24",
      birthTimeKnown: true,
      birthTime: "05:30",
      isLeapMonth: false,
    },
    {
      displayName: "도윤",
      gender: "female",
      calendarType: "solar",
      birthDate: "1991-08-11",
      birthTimeKnown: false,
      birthTime: null,
      isLeapMonth: false,
    },
    {
      displayName: "하린",
      gender: "female",
      calendarType: "solar",
      birthDate: "1989-12-03",
      birthTimeKnown: true,
      birthTime: "22:10",
      isLeapMonth: false,
    },
  ],
};

export const ONE_TO_MANY_DEMO_NAMES = Object.fromEntries(
  ONE_TO_MANY_DEMO_INPUT.candidates.map((candidate, index) => [
    `candidate_${index + 1}` as OneToManyCandidateId,
    candidate.displayName,
  ]),
);
