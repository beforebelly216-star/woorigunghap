import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runbook = readFileSync("docs/day24-beta-freeze-runbook.md", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const workflow = readFileSync(".github/workflows/manse-validation.yml", "utf8");
const requestEngine = readFileSync("src/lib/narrative/report-engine-v6-request.ts", "utf8");

// Day 24 closes the 24-day MVP plan. Remaining device/operating checks move to post-beta.
assert.match(runbook, /Day 24 상태: \*\*완료\*\*/);
assert.match(runbook, /운영 중 보완 백로그/);
assert.match(runbook, /post-beta 운영 QA/);
assert.match(runbook, /360px \/ 390px \/ 430px/);
assert.match(runbook, /결과 완료 메시지·알림 기능은 제품에서 전면 제거/);
assert.match(runbook, /회원탈퇴/);
assert.match(runbook, /2,500~4,000자/);
assert.match(runbook, /태그 생성 자체는 Day 24 기능 완료의 필수 조건으로 두지 않는다/);
assert.match(runbook, /Hobby build rate limit/);

// Public-launch configuration must remain explicit and server secrets must not be public-prefixed.
assert.match(envExample, /NEXT_PUBLIC_OPERATOR_NAME=/);
assert.match(envExample, /NEXT_PUBLIC_OPERATOR_EMAIL=/);
assert.match(envExample, /NEXT_PUBLIC_BUSINESS_REGISTRATION_NUMBER=/);
assert.match(envExample, /NEXT_PUBLIC_ECOMMERCE_REGISTRATION_NUMBER=/);
assert.match(envExample, /KAKAO_ADMIN_KEY=/);
assert.doesNotMatch(envExample, /KAKAO_TOKEN_ENCRYPTION_KEY|SOLAPI_/);
assert.doesNotMatch(envExample, /NEXT_PUBLIC_KAKAO_ADMIN_KEY/);

// Progress-first QA keeps editorial findings as warnings while retaining real blockers.
assert.match(requestEngine, /Progress-first policy/);
assert.match(requestEngine, /DEVELOPER_LABEL_A_B_EXPOSED/);
assert.match(requestEngine, /INTERNAL_METRIC_EXPOSED/);
assert.match(requestEngine, /RELATIONSHIP_ROMANCE_LEAK/);
assert.match(requestEngine, /quality-warning/);
assert.match(requestEngine, /critical\.length === 0/);
assert.doesNotMatch(requestEngine, /QUALITY_RETRY/);

// The Day 24 completion contract itself must remain runnable locally and in CI.
assert.match(packageJson, /test:day24:beta-freeze/);
assert.match(workflow, /test:day24:beta-freeze/);

console.log("Day 24 completion + progress-first beta contract checks: PASS");
