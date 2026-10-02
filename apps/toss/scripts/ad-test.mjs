import assert from 'node:assert/strict';
import { createAdClient } from '../src/ad-client.js';

let loads = 0; let shows = 0; let loadArgs; let showArgs; let clock = 1000; let cleanups = 0;
const load = Object.assign(args => { loads++; loadArgs = args; return () => cleanups++; }, { isSupported: () => true });
const show = Object.assign(args => { shows++; showArgs = args; return () => cleanups++; }, { isSupported: () => true });
const ids = { banner: 'banner', rewarded: 'rewarded', interstitial: 'interstitial' };
const ad = createAdClient({ load, show, ids, now: () => clock });
assert.equal((await ad.run('rewarded')).status, 'unavailable');
assert.equal((await ad.run('interstitial', { userInitiated: true, placement: 'input' })).status, 'limited');
assert.equal(loads, 0);
const reward = ad.run('rewarded', { userInitiated: true });
assert.equal(shows, 0);
assert.equal((await ad.run('rewarded', { userInitiated: true })).status, 'unavailable');
loadArgs.onEvent({ type: 'loaded' }); loadArgs.onEvent({ type: 'loaded' });
assert.equal(shows, 1);
showArgs.onEvent({ type: 'dismissed' });
assert.deepEqual(await reward, { status: 'dismissed', earned: false });
const earned = ad.run('rewarded', { userInitiated: true }); loadArgs.onEvent({ type: 'loaded' });
showArgs.onEvent({ type: 'userEarnedReward' }); showArgs.onEvent({ type: 'dismissed' });
assert.equal((await earned).earned, true);
const options = { userInitiated: true, placement: 'after-result' };
for (let i = 0; i < 2; i++) {
  clock += 120001;
  const next = ad.run('interstitial', options); loadArgs.onEvent({ type: 'loaded' });
  showArgs.onEvent({ type: 'show' }); showArgs.onEvent({ type: 'dismissed' });
  assert.equal((await next).status, 'dismissed');
  if (i === 0) assert.equal((await ad.run('interstitial', options)).status, 'limited');
}
clock += 120001; assert.equal((await ad.run('interstitial', options)).status, 'limited');
const cancelled = ad.run('rewarded', { userInitiated: true }); ad.dispose();
assert.equal((await cancelled).earned, false); assert.ok(cleanups >= 8);
const timed = createAdClient({ load, show, ids, timeoutMs: 5 });
assert.equal((await timed.run('rewarded', { userInitiated: true })).status, 'timeout');
let initialized = 0; let attached = 0; let callbacks; let hidden;
const initialize = Object.assign(({ callbacks }) => { initialized++; callbacks.onInitialized(); }, { isSupported: () => true });
const attachBanner = Object.assign((id, target, opts) => { attached++; callbacks = opts.callbacks; return { destroy() {} }; }, { isSupported: () => true });
const banners = createAdClient({ bannerSdk: { initialize, attachBanner }, ids });
await banners.attachBanner({ isConnected: true }, value => { hidden = !value; });
callbacks.onNoFill(); assert.equal(hidden, true);
await banners.attachBanner({ isConnected: true }, () => {});
assert.equal(initialized, 1); assert.equal(attached, 2);
// A single banner component per route is enforced by placement, not by refreshing SDK slots.
callbacks.onNoFill();
await banners.attachBanner({ isConnected: true }, value => { hidden = !value; }); callbacks.onAdFailedToRender();
assert.equal(hidden, true);
assert.equal(await banners.attachBanner({ isConnected: false }, () => {}), null);
console.log('Ad lifecycle, reward cancellation, concurrency, frequency and no-fill: PASS');
