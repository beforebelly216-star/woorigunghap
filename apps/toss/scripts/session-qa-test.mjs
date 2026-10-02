import assert from 'node:assert/strict';
import { createSessionClient } from '../src/session-client.js';

let revoked = false;
const authorization = [];
const client = createSessionClient({ apiBase: 'https://api.example.com', login: async () => ({ authorizationCode: 'code', referrer: 'SANDBOX' }),
  fetcher: async (url, options) => {
    authorization.push(options.headers.Authorization);
    if (revoked) return { ok: false, status: 401, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => url.endsWith('/toss')
      ? { authenticated: true, sessionToken: 'c'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString() }
      : { authenticated: true, user: { displayName: '테스트' } } };
  } });
await client.signIn(); revoked = true;
await assert.rejects(client.request('/api/account/reports'), error => error.status === 401 && /만료/.test(error.message));
await assert.rejects(client.request('/api/account/reports'));
assert.equal(authorization.at(-1), undefined, 'a revoked session must not continue sending its token');
let aborts = 0;
const slow = createSessionClient({ apiBase: 'https://api.example.com', login: async () => ({}), requestTimeoutMs: 5,
  fetcher: async (_, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => { aborts++; reject(new DOMException('Aborted', 'AbortError')); });
  }) });
await assert.rejects(slow.request('/api/account/reports'), /연결 시간이 초과/);
await assert.rejects(slow.request('/api/account/reports'), /연결 시간이 초과/);
assert.equal(aborts, 2, 'timed-out requests must abort and remain retryable');
const slowBody = createSessionClient({ apiBase: 'https://api.example.com', login: async () => ({}), requestTimeoutMs: 5,
  fetcher: async (_, options) => ({ ok: true, status: 200, json: () => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }) }) });
await assert.rejects(slowBody.request('/api/account/reports'), /연결 시간이 초과/, 'a stalled response body must also fail visibly');
console.log('Expired-session cleanup and bounded network requests: PASS');
