import assert from 'node:assert/strict';
import { createSessionClient } from '../src/session-client.js';
import { createIapClient } from '../src/iap-client.js';

const calls = []; let sdkLogins = 0;
const client = createSessionClient({ apiBase: 'https://api.example.com',
  login: async () => { sdkLogins++; return { authorizationCode: 'one-use-code', referrer: 'SANDBOX' }; },
  fetcher: async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => url.endsWith('/toss')
      ? { authenticated: true, sessionToken: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString() }
      : { authenticated: true, user: { displayName: '우리사주 사용자' } } };
  } });
await Promise.all([client.signIn(), client.signIn()]);
assert.equal(sdkLogins, 1);
assert.equal(calls[0].options.credentials, 'omit');
assert.equal(calls[1].options.headers.Authorization, `Bearer ${'a'.repeat(64)}`);
await client.signOut();
await client.request('/api/auth/session');
assert.equal(calls.at(-1).options.headers.Authorization, undefined);
await assert.rejects(createSessionClient({ apiBase: '', login: async () => { throw Error('must not run'); } }).signIn());
const failedCalls = [];
const failedSession = createSessionClient({ apiBase: 'https://api.example.com', login: async () => ({ authorizationCode: 'code', referrer: 'DEFAULT' }),
  fetcher: async (url, options) => {
    failedCalls.push(options);
    return { ok: true, status: 200, json: async () => url.endsWith('/toss')
      ? { authenticated: true, sessionToken: 'b'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString() }
      : { authenticated: false } };
  } });
await assert.rejects(failedSession.signIn(), /로그인 세션/);
await failedSession.request('/api/auth/session');
assert.equal(failedCalls.at(-1).headers.Authorization, undefined);
const completed = []; let purchaseArgs; let grants = 0; let cleanupCount = 0;
const sdk = { getPendingOrders: async () => ({ orders: [{ orderId: 'paid', sku: 'sku' }, { orderId: 'unpaid', sku: 'sku' }] }),
  completeProductGrant: async args => { completed.push(args.params.orderId); return true; },
  createOneTimePurchaseOrder: args => { purchaseArgs = args; return () => cleanupCount++; } };
const iap = createIapClient({ sdk, grant: async ({ orderId }) => { grants++; return { productGranted: orderId === 'paid' }; } });
await iap.recover(); assert.deepEqual(completed, ['paid']);
await assert.rejects(createIapClient({ sdk: { ...sdk, completeProductGrant: async () => false },
  grant: async () => ({ productGranted: true }) }).recover(), /상품 지급 확인/);
iap.purchase('sku', () => {}, () => {});
assert.throws(() => iap.purchase('sku', () => {}, () => {}));
grants = 0;
assert.deepEqual(await Promise.all([purchaseArgs.options.processProductGrant({ orderId: 'paid' }), purchaseArgs.options.processProductGrant({ orderId: 'paid' })]), [true, true]);
assert.equal(grants, 1);
assert.equal(await purchaseArgs.options.processProductGrant({ orderId: 'unpaid' }), false);
purchaseArgs.onError(new Error('cancelled')); assert.equal(cleanupCount, 1);
console.log('Toss session and IAP client orchestration: PASS');
