import React, { useEffect, useRef, useState } from 'react';
import { TossAds, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import { createAdClient } from './ad-client';
import { resolveAdGroups } from './ad-config';

// No production IDs in dev; console testing must use official test IDs only.
const enabled = import.meta.env.VITE_ADS_ENABLED === 'true';
const testing = import.meta.env.DEV || import.meta.env.VITE_ADS_TEST_MODE !== 'false';
export const ads = createAdClient({ bannerSdk: TossAds, load: loadFullScreenAd, show: showFullScreenAd,
  ids: resolveAdGroups({ enabled, testing,
    live: { banner: import.meta.env.VITE_TOSS_BANNER_AD_GROUP_ID, rewarded: import.meta.env.VITE_TOSS_REWARDED_AD_GROUP_ID, interstitial: import.meta.env.VITE_TOSS_INTERSTITIAL_AD_GROUP_ID },
    test: { rewarded: import.meta.env.VITE_TOSS_TEST_REWARDED_AD_GROUP_ID, interstitial: import.meta.env.VITE_TOSS_TEST_INTERSTITIAL_AD_GROUP_ID },
  }),
});

export function BannerAd() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => ads.hasId('banner'));
  useEffect(() => {
    let mounted = true; let attached;
    ads.attachBanner(ref.current, value => { if (mounted) setVisible(value); }).then(result => {
      if (mounted) { attached = result; if (!result) setVisible(false); }
      else result?.destroy();
    });
    return () => { mounted = false; attached?.destroy(); };
  }, []);
  // Keep SDK target empty and measurable until render. No fake creative or blank ad card.
  return <aside className={`ad-slot${visible ? ' ad-slot-visible' : ''}`} aria-label="광고" aria-hidden={!visible}>
    <div ref={ref} />
  </aside>;
}
