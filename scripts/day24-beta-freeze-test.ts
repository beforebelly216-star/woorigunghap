import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runbook = readFileSync("docs/day24-beta-freeze-runbook.md", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const workflow = readFileSync(".github/workflows/manse-validation.yml", "utf8");

// Day 24 is a release gate, not another feature day.
assert.match(runbook, /새 기능을 추가하는 날이 아니라/);
assert.match(runbook, /1:1 운영 E2E/);
assert.match(runbook, /1:N 운영 E2E/);
assert.match(runbook, /360px \/ 390px \/ 430px/);
assert.match(runbook, /카카오 완료 알림/);
assert.match(runbook, /회원탈퇴/);
assert.match(runbook, /버전 태그를 생성하지 않는다/);
assert.match(runbook, /v0\.1\.0-beta\.1/);

// Public-launch configuration must remain explicit and server secrets must not be public-prefixed.
assert.match(envExample, /NEXT_PUBLIC_OPERATOR_NAME=/);
assert.match(envExample, /NEXT_PUBLIC_OPERATOR_EMAIL=/);
assert.match(envExample, /NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER=/);
assert.match(envExample, /NEXT_PUBLIC_ECOMMERCE_REGISTRATION_NUMBER=/);
assert.match(envExample, /KAKAO_ADMIN_KEY=/);
assert.match(envExample, /KAKAO_TOKEN_ENCRYPTION_KEY=/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_KAKAO_ADMIN_KEY/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_KAKAO_TOKEN_ENCRYPTION_KEY/);

// The release-gate contract itself must be runnable locally and in CI.
assert.match(packageJson, /test:day24:beta-freeze/);
assert.match(workflow, /test:day24:beta-freeze/);

console.log("Day 24 beta freeze contract checks: PASS");
