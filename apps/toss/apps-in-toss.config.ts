import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'woorisajoo',
  brand: { primaryColor: '#245B45' },
  permissions: [],
  navigationBar: { withBackButton: true, withHomeButton: true, withTitle: true, theme: 'light' },
  webView: { bounces: false, pullToRefreshEnabled: false, overScrollMode: 'never' },
  webBundleDir: 'dist',
});
