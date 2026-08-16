import assert from "node:assert/strict";
import { matchesJsonSchema } from "../src/lib/narrative/report-engine-v6-request";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    relationshipFlow: {
      type: "object",
      additionalProperties: false,
      properties: {
        overview: { type: "string" },
        conflictScenarios: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              situation: { type: "string" },
              likelyPattern: { type: "string" },
              response: { type: "string" },
            },
            required: ["situation", "likelyPattern", "response"],
          },
        },
      },
      required: ["overview", "conflictScenarios"],
    },
    practicalManual: {
      type: "object",
      additionalProperties: false,
      properties: {
        do: { type: "array", items: { type: "string" } },
        dont: { type: "array", items: { type: "string" } },
      },
      required: ["do", "dont"],
    },
  },
  required: ["relationshipFlow", "practicalManual"],
};

const valid = {
  relationshipFlow: {
    overview: "관계 흐름 설명",
    conflictScenarios: [
      { situation: "약속 변경", likelyPattern: "서로 다른 반응", response: "기준을 먼저 합의" },
    ],
  },
  practicalManual: {
    do: ["기대를 말로 확인하기"],
    dont: ["점수만으로 단정하기"],
  },
};

assert.equal(matchesJsonSchema(valid, schema), true, "정상 중첩 JSON은 통과해야 합니다.");
assert.equal(matchesJsonSchema({ ...valid, extra: "unexpected" }, schema), false, "허용되지 않은 최상위 키는 거부해야 합니다.");
assert.equal(matchesJsonSchema({
  ...valid,
  relationshipFlow: { ...valid.relationshipFlow, conflictScenarios: ["잘못된 문자열"] },
}, schema), false, "객체 배열 자리에 문자열이 오면 거부해야 합니다.");
assert.equal(matchesJsonSchema({
  ...valid,
  relationshipFlow: {
    ...valid.relationshipFlow,
    conflictScenarios: [{ situation: "상황", likelyPattern: "패턴" }],
  },
}, schema), false, "필수 중첩 키가 빠지면 거부해야 합니다.");
assert.equal(matchesJsonSchema({
  ...valid,
  practicalManual: { do: ["정상"], dont: [123] },
}, schema), false, "문자열 배열에 숫자가 들어가면 거부해야 합니다.");

console.log("Day 9 recursive Claude JSON schema guard: PASS");
