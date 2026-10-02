// Session-local product limits, not a claim that Toss guarantees review approval.
export function createAdClient({ bannerSdk, load, show, ids = {}, now = Date.now, timeoutMs = 15000 }) {
  let initialization;
  let active = false;
  let disposed = false;
  let cancelActive;
  const shown = [];
  const supported = fn => { try { return fn?.isSupported?.() === true; } catch { return false; } };
  const configuredId = kind => ids[kind] || '';
  function initialize() {
    if (!initialization) initialization = new Promise(resolve => {
      if (!supported(bannerSdk?.initialize)) return resolve(false);
      const timer = setTimeout(() => resolve(false), timeoutMs);
      const finish = value => { clearTimeout(timer); resolve(value); };
      try { bannerSdk.initialize({ callbacks: { onInitialized: () => finish(true), onInitializationFailed: () => finish(false) } }); }
      catch { finish(false); }
    });
    return initialization;
  }
  return {
    hasId: kind => Boolean(configuredId(kind)),
    async attachBanner(target, onVisible) {
      if (disposed || !configuredId('banner') || !supported(bannerSdk?.attachBanner) || !await initialize()) return null;
      if (disposed || !target?.isConnected) return null;
      try {
        onVisible(true);
        return bannerSdk.attachBanner(configuredId('banner'), target, { theme: 'light', tone: 'blackAndWhite', variant: 'expanded',
          callbacks: { onAdRendered: () => onVisible(true), onNoFill: () => onVisible(false), onAdFailedToRender: () => onVisible(false) } });
      } catch { onVisible(false); return null; }
    },
    // Only the result-screen's explicit "new analysis" action may request an interstitial.
    run(kind, { userInitiated = false, placement = '' } = {}) {
      if (disposed || active || !userInitiated || !['rewarded', 'interstitial'].includes(kind)
        || !configuredId(kind) || !supported(load) || !supported(show)) return Promise.resolve({ status: 'unavailable', earned: false });
      const recent = shown.filter(time => now() - time < 30 * 60 * 1000);
      if (kind === 'interstitial' && (placement !== 'after-result' || recent.length >= 2
        || (shown.length && now() - shown.at(-1) < 120000))) return Promise.resolve({ status: 'limited', earned: false });
      active = true;
      return new Promise(resolve => {
        let done = false; let earned = false; let showing = false; let loadCleanup; let showCleanup;
        let timer = setTimeout(() => finish('timeout'), timeoutMs);
        const finish = status => {
          if (done) return;
          done = true; active = false; clearTimeout(timer); loadCleanup?.(); showCleanup?.(); cancelActive = undefined;
          resolve({ status, earned });
        };
        cancelActive = () => finish('cancelled');
        const display = () => {
          if (done || showing) return;
          showing = true;
          // Wait for load readiness, and keep a watchdog for SDK versions missing dismissed.
          clearTimeout(timer); timer = setTimeout(() => finish('timeout'), 120000);
          try {
            showCleanup = show({ options: { adGroupId: configuredId(kind) }, onEvent: event => {
              if (done) return;
              if (event.type === 'userEarnedReward' && kind === 'rewarded') earned = true;
              if (event.type === 'show' && !shown.includes(started)) shown.push(started);
              if (event.type === 'dismissed') finish('dismissed');
              if (event.type === 'failedToShow') finish('failed');
            }, onError: () => finish('failed') });
            if (done) showCleanup?.();
          } catch { finish('failed'); }
        };
        const started = now();
        try {
          loadCleanup = load({ options: { adGroupId: configuredId(kind) }, onEvent: event => {
            if (event.type === 'loaded') display();
          }, onError: () => finish('unavailable') });
          if (done) loadCleanup?.();
        } catch { finish('unavailable'); }
      });
    },
    dispose() { disposed = true; cancelActive?.(); },
  };
}
