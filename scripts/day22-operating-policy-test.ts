import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const policy = readFileSync("src/lib/operating-policy.ts", "utf8");
const payment = readFileSync("src/components/payment-button.tsx", "utf8");
const oneToOne = readFileSync("src/app/one-to-one/checkout/page.tsx", "utf8");
const oneToMany = readFileSync("src/app/one-to-many/checkout/page.tsx", "utf8");
const deleteRoute = readFileSync("src/app/api/account/delete/route.ts", "utf8");
const accountStore = readFileSync("src/lib/account-report-store.ts", "utf8");
const privacy = readFileSync("src/app/privacy/page.tsx", "utf8");
const terms = readFileSync("src/app/terms/page.tsx", "utf8");

assert.match(policy, /operating-policy-v1/);
assert.match(policy, /5년/);
assert.match(policy, /3년/);
assert.match(payment, /agreementAccepted/);
assert.match(oneToOne, /PurchasePolicyConsent/);
assert.match(oneToMany, /redirect\("\/one-to-many"\)/);
assert.match(deleteRoute, /isSameOriginPost/);
assert.match(deleteRoute, /confirmation !== "탈퇴"/);
assert.match(accountStore, /legal-retention-v1/);
assert.match(accountStore, /report_json = NULL/);
assert.match(accountStore, /access_token_hash = NULL/);
assert.match(privacy, /이름·별칭, 원본 생년월일, 원본 출생시간은 AI 서술 생성 요청에 전달하지 않습니다/);
assert.doesNotMatch(privacy, /완료 알림|SOLAPI|휴대전화 번호/);
assert.match(privacy, /“OOO님”처럼 표시/);
assert.match(privacy, /Anthropic API/);
assert.match(privacy, /30일 이내 삭제/);
assert.match(privacy, /국외 이전 고지 항목을 다시 확인/);
assert.match(privacy, /무료 인연 네트워크/);
assert.match(privacy, /생년정보는 서버에서 암호화/);
assert.match(privacy, /30일이 지나면 즉시 조회를 차단/);
assert.match(privacy, /암호화된 공개 링크 정보/);
assert.match(privacy, /방장 관리 권한 원문은 저장하지 않습니다/);
assert.match(terms, /자신이 만든 무료 인연 네트워크/);

console.log("Day 22 operating policy + AI privacy transfer contract checks: PASS");
