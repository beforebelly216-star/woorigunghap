import assert from 'node:assert/strict';
import { productionAdGroups, resolveAdGroups } from '../src/ad-config.js';

assert.equal(productionAdGroups.banner, 'ait.v2.live.732b6817f34e4c8f');
assert.equal(productionAdGroups.fullscreenPrimary, 'ait.v2.live.6389f70518ed4f97');
assert.equal(productionAdGroups.fullscreenSecondary, 'ait.v2.live.2ba69cd75b514ab9');
assert.deepEqual(resolveAdGroups(), {}, 'IDs alone must not activate unfinished ad flows');
assert.equal(resolveAdGroups({ enabled: true, testing: false }).banner, productionAdGroups.banner);
assert.equal(resolveAdGroups({ enabled: true, testing: false }).interstitial, productionAdGroups.fullscreenPrimary);
assert.equal(resolveAdGroups({ enabled: true, testing: false }).rewarded, '', 'interstitial IDs must not become rewarded IDs');
const test = resolveAdGroups({ enabled: true, live: productionAdGroups, test: { rewarded: productionAdGroups.fullscreenPrimary, interstitial: productionAdGroups.fullscreenSecondary } });
assert.equal(test.banner, 'ait-ad-test-banner-id');
assert.equal(test.rewarded, ''); assert.equal(test.interstitial, '');
assert.equal(resolveAdGroups({ enabled: true, test: { rewarded: 'official-test-group' } }).rewarded, 'official-test-group');
assert.equal(resolveAdGroups({ enabled: true, testing: false, live: { banner: 'custom-live-group' } }).banner, 'custom-live-group');
console.log('Ad ID catalog, default OFF and production/test isolation: PASS');
