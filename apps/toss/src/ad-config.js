// Public console ad group identifiers. These are not authentication credentials.
export const productionAdGroups = Object.freeze({
  banner: 'ait.v2.live.732b6817f34e4c8f',
  fullscreenPrimary: 'ait.v2.live.6389f70518ed4f97',
  fullscreenSecondary: 'ait.v2.live.2ba69cd75b514ab9',
  // Both fullscreen groups are interstitials, confirmed by the user.
  // The secondary group is reserved; it is not an automatic retry or a reward placement.
  rewarded: '',
  interstitial: 'ait.v2.live.6389f70518ed4f97',
});

export function resolveAdGroups({ enabled = false, testing = true, live = {}, test = {} } = {}) {
  if (!enabled) return {};
  if (testing) {
    const testId = value => value && !value.startsWith('ait.v2.live.') ? value : '';
    return { banner: 'ait-ad-test-banner-id', rewarded: testId(test.rewarded), interstitial: testId(test.interstitial) };
  }
  return {
    banner: live.banner || productionAdGroups.banner,
    rewarded: live.rewarded || productionAdGroups.rewarded,
    interstitial: live.interstitial || productionAdGroups.interstitial,
  };
}
