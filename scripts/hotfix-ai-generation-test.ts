import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requestStructuredSegment } from "../src/lib/narrative/report-engine-v6-request";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: { summary: { type: "string" } },
  required: ["summary"],
} as const;

function valid(value: unknown): value is { summary: string } {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof (value as { summary?: unknown }).summary === "string";
}

function anthropicResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "request-id": `req_test_${status}`,
    },
  });
}

const originalFetch = globalThis.fetch;

async function main() {
try {
  const truncationBodies: Array<Record<string, unknown>> = [];
  let truncationCall = 0;
  globalThis.fetch = async (_input, init) => {
    truncationBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    truncationCall += 1;
    if (truncationCall === 1) {
      return anthropicResponse({
        content: [{ type: "text", text: '{"summary":"잘린 응답' }],
        stop_reason: "max_tokens",
        usage: { input_tokens: 100, output_tokens: 1_200 },
      });
    }
    return anthropicResponse({
      content: [{ type: "text", text: '{"summary":"완성된 짧은 리포트"}' }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 320 },
    });
  };

  const recovered = await requestStructuredSegment({
    apiKey: "test-key",
    model: "claude-sonnet-5",
    schema,
    system: "test",
    user: "test",
    maxTokens: 1_200,
    retryMaxTokens: 1_600,
    timeoutMs: 60_000,
    preferStructured: true,
    validate: valid,
    qualityIssues: () => [],
    label: "TEST",
  });

  assert.equal(recovered.attempts, 2, "a truncated structured output must get one bounded retry");
  assert.deepEqual(
    truncationBodies.map((body) => body.max_tokens),
    [1_200, 1_600],
    "only truncation may use the explicit retry token ceiling",
  );
  assert.ok(truncationBodies.every((body) => body.output_config), "supported models must use structured outputs on every retry");
  assert.ok(
    truncationBodies.every((body) => (body.thinking as { type?: string } | undefined)?.type === "disabled"),
    "Sonnet 5 narrative calls must disable adaptive thinking so it cannot consume the bounded output budget",
  );

  const fallbackBodies: Array<Record<string, unknown>> = [];
  let fallbackCall = 0;
  globalThis.fetch = async (_input, init) => {
    fallbackBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    fallbackCall += 1;
    if (fallbackCall === 1) {
      return anthropicResponse({ error: { type: "invalid_request_error", message: "unsupported output_config" } }, 400);
    }
    return anthropicResponse({
      content: [{ type: "text", text: '{"summary":"호환 JSON 응답"}' }],
      stop_reason: "end_turn",
      usage: { input_tokens: 90, output_tokens: 120 },
    });
  };

  const fallback = await requestStructuredSegment({
    apiKey: "test-key",
    model: "claude-sonnet-5",
    schema,
    system: "test",
    user: "test",
    maxTokens: 1_200,
    retryMaxTokens: 1_600,
    timeoutMs: 60_000,
    preferStructured: true,
    validate: valid,
    qualityIssues: () => [],
    label: "TEST",
  });

  assert.equal(fallback.attempts, 1, "structured-output capability fallback must stay inside the same attempt");
  assert.ok(fallbackBodies[0].output_config, "the first request must prefer schema-constrained JSON");
  assert.equal(fallbackBodies[1].output_config, undefined, "a 400 capability rejection may fall back to plain JSON once");
  assert.equal(fallbackBodies[1].max_tokens, 1_200, "capability fallback must not inflate the output budget");
} finally {
  globalThis.fetch = originalFetch;
}

const requestSource = readFileSync("src/lib/narrative/report-engine-v6-request.ts", "utf8");
const engineSource = readFileSync("src/lib/narrative/report-engine-v7.ts", "utf8");
const reportModelSource = readFileSync("src/lib/narrative/report-engine.ts", "utf8");
const oneToManySource = readFileSync("src/lib/narrative/one-to-many-report-engine.ts", "utf8");
const envExample = readFileSync(".env.example", "utf8");

assert.doesNotMatch(requestSource, /Math\.max\(args\.maxTokens,\s*(?:5_000|9_000|8_000)\)/, "hidden legacy token inflation must stay removed");
assert.match(engineSource, /2,500~4,000자/, "the paid 1:1 prompt must state the concise whole-report target");
assert.match(engineSource, /maxTokens: 1_800/);
assert.match(engineSource, /maxTokens: 2_600/);
assert.match(engineSource, /maxTokens: 3_000/);
assert.match(engineSource, /preferStructured: true/g);
assert.match(reportModelSource, /DEFAULT_REPORT_MODEL = "claude-sonnet-5"/);
assert.match(reportModelSource, /model === "claude-haiku-4-5-20251001"/);
assert.match(requestSource, /thinking: \{ type: "disabled" \}/);
assert.match(oneToManySource, /preferStructured: true/);
assert.match(envExample, /ANTHROPIC_NARRATIVE_MODEL=claude-sonnet-5/);

console.log("Sonnet 5 concise structured-generation resilience contract: PASS");
}

void main();
