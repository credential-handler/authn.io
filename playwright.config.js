/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {defineConfig, devices} from '@playwright/test';

const BASE_URL = 'https://authn.localhost:33443';

export default defineConfig({
  testDir: './test/e2e',
  // the dialog suite is layout-only and deterministic; fail fast in CI
  forbidOnly: !!process.env.CI,
  retries: 0,
  // `list` streams per-test results; `totalsReporter` appends an explicit
  // "N/M passed" line at the end so the total test count is visible without
  // scrolling up and adding the outcome counts by hand
  reporter: [['list'], ['./test/e2e/totalsReporter.js']],
  use: {
    baseURL: BASE_URL,
    // the dev server uses a self-signed localhost certificate
    ignoreHTTPSErrors: true,
    screenshot: 'off',
    trace: 'on-first-retry'
  },
  // the wallet chooser popups are 500px wide; emulate that as the default
  // viewport so layout matches the real popup
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome'], viewport: {width: 500, height: 640}}
    },
    {
      name: 'webkit',
      use: {...devices['Desktop Safari'], viewport: {width: 500, height: 640}}
    },
    {
      name: 'firefox',
      use: {...devices['Desktop Firefox'], viewport: {width: 500, height: 640}}
    },
    // phone-sized projects: on a phone the popup is clamped to the screen
    // width (narrower than the 500px desktop popup) and crosses the
    // dialog's 430px "small screen" CSS breakpoint, so these exercise
    // layout branches the desktop projects do not. Device descriptors also
    // set a touch-capable, mobile-UA context.
    {
      name: 'iphone',
      use: {...devices['iPhone 15']}
    },
    {
      name: 'android-pixel',
      use: {...devices['Pixel 7']}
    }
  ],
  // start the authn.io dev server automatically; reuse one already running
  webServer: {
    command: 'node authn.localhost.js',
    url: `${BASE_URL}/test/wallet-chooser?hints=1`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 120 * 1000
  }
});
