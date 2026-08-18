import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runbook = readFileSync("docs/day24-beta-freeze-runbook.md", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const workflow = readFileSync(".github/workflows/manse-validation.yml", "utf8");
const requestEngine = readFileSync("src/lib/narrative/report-engine-v6-request.ts", "utf8");

// Day 24 is a release gate, not another feature day.
assert.match(runbook, /새 기능을 추가하는 날이 아니라/);
assert.match(runbook, /1:1 운영 E2E/);
assert.match(runbook, /1:N 운영 E2E/);
assert.match(runbook, /360px \/ 390px \/ 430px/);
assert.match(runbook, /카카오 완료 알림/);
assert.match(runbook, /회원탈퇴/);
assert.match(runbook, /버전 태그를 생성하지 않는다/);
assert.match(runbook, /v0\.1\.0-beta\.1/);
assert.match(runbook, /5,000~8,000자/);
assert.match(runbook, /문장 취향성 QA는 출시 blocker로 사용하지 않는다/);

// Public-launch configuration must remain explicit and server secrets must not be public-prefixed.
assert.match(envExample, /NEXT_PUBLIC_OPERATOR_NAME=/);
assert.match(envExample, /NEXT_PUBLIC_OPERATOR_EMAIL=/);
assert.match(envExample, /NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER=/);
assert.match(envExample, /NEXT_PUBLIC_ECOMMERCE_REGISTRATION_NUMBER=/);
assert.match(envExample, /KAKAO_ADMIN_KEY=/);
assert.match(envExample, /KAKAO_TOKEN_ENCRYPTION_KEY=/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_KAKAO_ADMIN_KEY/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_KAKAO_TOKEN_ENCRYPTION_KEY/);

// Progress-first QA must keep editorial findings as warnings and retain real blockers.
assert.match(requestEngine, /Progress-first policy/);
assert.match(requestEngine, /DEVELOPER_LABEL_A_B_EXPOSED/);
assert.match(requestEngine, /INTERNAL_METRIC_EXPOSED/);
assert.match(requestEngine, /RELATIONSHIP_ROMANCE_LEAK/);
assert.match(requestEngine, /quality-warning/);
assert.match(requestEngine, /critical\.length === 0/);
assert.doesNotMatch(requestEngine, /QUALITY_RETRY/);

// The release-gate contract itself must be runnable locally and in CI.
assert.match(packageJson, /test:day24:beta-freeze/);
assert.match(workflow, /test:day24:beta-freeze/);

console.log("Day 24 beta freeze + progress-first release contract checks: PASS");
